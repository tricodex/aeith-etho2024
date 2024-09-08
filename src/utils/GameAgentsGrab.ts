// src/utils/GameAgentGrab.ts

import { ethers, Contract, Log } from 'ethers';
import ABI from './abis/UnifiedChatAgent.json';

interface Message {
  role: string;
  content: string[];
}

class GameAgentsGrab {
  private contracts: Record<string, Contract>;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;

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
  }

  async createAgent(agentType: string, message: string, maxIterations: number = 5): Promise<number> {
    try {
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
          return this.parseChatId(chatId);
        }
      }

      throw new Error("ChatCreated event not found in transaction logs");
    } catch (err) {
      console.error(`Error creating ${agentType} agent:`, err);
      throw err;
    }
  }

  async getAgentMessages(agentType: string, chatId: number): Promise<Message[]> {
    try {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }

      const messages = await contract.getMessageHistory(chatId);
      return messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (err) {
      console.error(`Error getting ${agentType} agent messages:`, err);
      throw err;
    }
  }

  async addMessage(agentType: string, message: string, chatId: number): Promise<void> {
    try {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }

      const tx = await contract.addMessage(message, chatId);
      await tx.wait();
    } catch (err) {
      console.error(`Error adding message to ${agentType} agent:`, err);
      throw err;
    }
  }

  async monitorChat(agentType: string, chatId: number, callback: (messages: Message[]) => void): Promise<() => void> {
    let messageCount = 0;
    const interval = setInterval(async () => {
      try {
        const messages = await this.getAgentMessages(agentType, chatId);
        if (messages.length > messageCount) {
          messageCount = messages.length;
          callback(messages);
        }
        const isFinished = await this.isRunFinished(agentType, chatId);
        if (isFinished) {
          clearInterval(interval);
          console.log(`Chat ${chatId} for ${agentType} has finished.`);
        }
      } catch (err) {
        console.error(`Error monitoring ${agentType} chat:`, err);
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval); // Return cleanup function
  }

  async isRunFinished(agentType: string, chatId: number): Promise<boolean> {
    try {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Invalid agent type: ${agentType}`);
      }
      return await contract.isRunFinished(chatId);
    } catch (err) {
      console.error(`Error checking if ${agentType} run is finished:`, err);
      throw err;
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
}

export default GameAgentsGrab;