// src/utils/GameAgentsGrab.ts

import { ethers, Contract, Log } from 'ethers';
import ABI from './abis/UnifiedChatAgent.json';
import { messageBus } from './MessageBus';
import { GameState, ChatEntry, GameAction } from '@/types/gameTypes';
import { retry } from '@lifeomic/attempt';

interface Message {
  role: string;
  content: { contentType: string; value: string }[];
}

class GameAgentsGrab {
  private contracts: Record<string, Contract>;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private chatIds: Record<string, number> = {};
  private initialized: Record<string, boolean> = {};

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      throw new Error("Missing environment variables");
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contracts = {
      'blue-fish': new Contract(process.env.NEXT_PUBLIC_AGENT_BLUE_FISH_CONTRACT_ADDRESS!, ABI.abi, this.wallet),
      'orange-crab': new Contract(process.env.NEXT_PUBLIC_AGENT_ORANGE_CRAB_CONTRACT_ADDRESS!, ABI.abi, this.wallet),
      'green-turtle': new Contract(process.env.NEXT_PUBLIC_AGENT_GREEN_TURTLE_CONTRACT_ADDRESS!, ABI.abi, this.wallet),
      'red-donkey': new Contract(process.env.NEXT_PUBLIC_AGENT_RED_DONKEY_CONTRACT_ADDRESS!, ABI.abi, this.wallet),
    };

    Object.keys(this.contracts).forEach(agentType => {
      this.initialized[agentType] = false;
      messageBus.subscribe(agentType, this.handleAgentMessage.bind(this, agentType));
    });
  }

  private async ensureAgentInitialized(agentType: string): Promise<void> {
    if (!this.initialized[agentType]) {
      await this.createAgent(agentType, 'Initialize agent', 2);
    }
  }

  async createAgent(agentType: string, message: string, maxIterations: number = 5): Promise<number> {
    return retry(async () => {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }

      const tx = await contract.startChat(message, maxIterations);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        (log: Log) => log.topics[0] === ethers.id("ChatCreated(address,uint256)")
      );

      if (event) {
        const decodedLog = contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });

        if (decodedLog && decodedLog.args) {
          const chatId = decodedLog.args[1];
          this.chatIds[agentType] = this.parseChatId(chatId);
          this.initialized[agentType] = true;
          return this.chatIds[agentType];
        }
      }

      throw new Error("ChatCreated event not found in transaction logs");
    }, {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
    });
  }

  async getAgentMessages(agentType: string, chatId?: number): Promise<Message[]> {
    await this.ensureAgentInitialized(agentType);
    return retry(async () => {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }

      const actualChatId = chatId || this.chatIds[agentType];
      const messages = await contract.getMessageHistory(actualChatId);
      return messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));
    }, {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
    });
  }

  async addMessage(agentType: string, message: string, chatId?: number): Promise<void> {
    if (!this.contracts[agentType]) throw new Error(`Invalid agent type: ${agentType}`);
    
    return retry(async () => {
      const actualChatId = chatId || this.chatIds[agentType];
      const tx = await this.contracts[agentType].addMessage(message, actualChatId);
      await tx.wait();

      messageBus.publish({
        role: agentType,
        content: message,
        agentId: agentType,
      });
    }, {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
      handleError: (err) => {
        console.error(`Error adding message to ${agentType} agent:`, err);
        messageBus.publish({
          role: 'system',
          content: `Failed to communicate with ${agentType} agent. The game will continue without this agent's input.`,
          agentId: 'system',
        });
      },
    });
  }

  async generateAgentAction(agentType: string, gameState: GameState): Promise<GameAction> {
    await this.ensureAgentInitialized(agentType);
    try {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }

      const chatId = this.chatIds[agentType];
      if (!chatId) {
        throw new Error(`Chat not initialized for agent type: ${agentType}`);
      }

      await this.addMessage(agentType, JSON.stringify(gameState), chatId);
      const response = await this.waitForAgentResponse(agentType, chatId);
      return this.parseResponseIntoGameAction(agentType, response);
    } catch (err) {
      console.error(`Error generating action for ${agentType}:`, err);
      if (err instanceof Error && err.message.includes('Chat has finished')) {
        // Reinitialize the chat
        await this.createAgent(agentType, 'Reinitialize agent', 2);
        // Retry the action generation
        return this.generateAgentAction(agentType, gameState);
      }
      return { type: 'chat', playerId: agentType, details: { message: "I'm having trouble processing the current situation. Could you please provide more information?" } };
    }
  }

  private async waitForAgentResponse(agentType: string, chatId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const messages = await this.getAgentMessages(agentType, chatId);
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            clearInterval(checkInterval);
            resolve(lastMessage.content[0].value);
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000); // Check every second
    });
  }

  private parseResponseIntoGameAction(agentType: string, response: string): GameAction {
    try {
      const parsedResponse = JSON.parse(response);
      return {
        type: parsedResponse.action.type,
        playerId: agentType,
        details: parsedResponse.action.details
      };
    } catch (error) {
      console.error('Error parsing agent response:', error);
      return { type: 'chat', playerId: agentType, details: { message: response } };
    }
  }

  private parseChatId(chatId: unknown): number {
    if (typeof chatId === 'number') {
      return chatId;
    } else if (typeof chatId === 'bigint') {
      return Number(chatId);
    } else if (typeof chatId === 'string') {
      return parseInt(chatId, 10);
    } else if (chatId && typeof chatId === 'object' && chatId.toString) {
      return parseInt(chatId.toString(), 10);
    }
    throw new Error(`Unexpected chatId type: ${typeof chatId}`);
  }

  private async handleAgentMessage(agentType: string, message: ChatEntry, gameState: GameState) {
    if (message.role !== agentType) {
      const chatId = this.chatIds[agentType];
      if (chatId) {
        await this.addMessage(agentType, JSON.stringify(message), chatId);
      }
    }
  }
}

export default GameAgentsGrab;