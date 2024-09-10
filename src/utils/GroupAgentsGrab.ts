// src/utils/GroupAgentsGrab.ts

import { ethers, Contract } from 'ethers';
import ABI from './abis/UnifiedChatAgent.json';
import { retry } from '@lifeomic/attempt';

interface Message {
  role: string;
  content: { contentType: string; value: string }[];
}

export class GroupAgentsGrab {
  private contracts: Record<string, Contract>;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private chatIds: Record<string, number> = {};

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
  }

  async initializeChat(message: string): Promise<void> {
    for (const agentType of Object.keys(this.contracts)) {
      await this.createAgent(agentType, message);
    }
  }

  private async createAgent(agentType: string, message: string): Promise<void> {
    return retry(async () => {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Contract not found for agent type: ${agentType}`);
      }
      const tx = await contract.startChat(message, 5);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id("ChatCreated(address,uint256)")
      );

      if (event) {
        const decodedLog = contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });

        if (decodedLog && decodedLog.args) {
          this.chatIds[agentType] = Number(decodedLog.args[1]);
        }
      }
    }, {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
    });
  }

  async getMessages(agentType: string): Promise<Message[]> {
    return this.getMessageHistory(agentType);
  }

  async getMessageHistory(agentType: string): Promise<Message[]> {
    return retry(async () => {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Contract not found for agent type: ${agentType}`);
      }
      const chatId = this.chatIds[agentType];
      if (chatId === undefined) {
        throw new Error(`Chat not initialized for agent type: ${agentType}`);
      }
      const messages = await contract.getMessageHistory(chatId);
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

  async addMessage(agentType: string, message: string): Promise<void> {
    return retry(async () => {
      const contract = this.contracts[agentType];
      if (!contract) {
        throw new Error(`Contract not found for agent type: ${agentType}`);
      }
      const chatId = this.chatIds[agentType];
      if (chatId === undefined) {
        throw new Error(`Chat not initialized for agent type: ${agentType}`);
      }
      
      // Check if there's a pending response
      const messages = await this.getMessageHistory(agentType);
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        // Wait for the AI to respond before adding a new message
        await this.getAgentResponse(agentType);
      }

      const tx = await contract.addMessage(message, chatId);
      await tx.wait();
    }, {
      maxAttempts: 3,
      delay: 1000,
      factor: 2,
    });
  }

  async getAgentResponse(agentType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const messages = await this.getMessageHistory(agentType);
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            clearInterval(checkInterval);
            resolve(lastMessage.content[0].value);
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000);
    });
  }
}

export default GroupAgentsGrab;