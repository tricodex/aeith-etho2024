// src/utils/AgentGrab.ts

import { ethers, Contract, Log } from 'ethers';
import ABI from './abis/UnifiedChatAgent.json';
// import dotenv from 'dotenv';
// dotenv.config({ path: '/.env.local' });

interface Message {
  role: string;
  content: string[];
}

class AgentGrab {
  private contract: Contract;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
    const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      throw new Error("Missing environment variables");
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new Contract(contractAddress, ABI.abi, this.wallet);
  }

  async createAgent(message: string, maxIterations: number = 5): Promise<number> {
    try {
      console.log("Starting chat with message:", message, "and maxIterations:", maxIterations);
      const tx = await this.contract.startChat(message, maxIterations);
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      
      const event = receipt.logs.find(
        (log: Log) => log.topics[0] === ethers.id("ChatCreated(address,uint256)")
      );
  
      if (event) {
        console.log("Found ChatCreated event:", event);
        const decodedLog = this.contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });
        console.log("Decoded log:", JSON.stringify(decodedLog, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        ));
        
        if (decodedLog && decodedLog.args) {
          console.log("Decoded log args:", decodedLog.args);
          // Assuming the chatId is the second argument (index 1)
          const chatId = decodedLog.args[1];
          console.log("Raw chatId:", chatId, "Type:", typeof chatId);
          
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
      throw new Error("ChatCreated event not found in transaction logs");
    } catch (err) {
      console.error("Error creating agent:", err);
      throw err;
    }
  }

  async getAgentMessages(chatId: number): Promise<Message[]> {
    try {
      const messages = await this.contract.getMessageHistory(chatId);
      return messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (err) {
      console.error("Error getting agent messages:", err);
      throw err;
    }
  }

  async addMessage(message: string, chatId: number): Promise<void> {
    try {
      const tx = await this.contract.addMessage(message, chatId);
      await tx.wait();
    } catch (err) {
      console.error("Error adding message:", err);
      throw err;
    }
  }

  async monitorChat(chatId: number, callback: (messages: Message[]) => void): Promise<() => void> {
    let messageCount = 0;
    const interval = setInterval(async () => {
      try {
        const messages = await this.getAgentMessages(chatId);
        if (messages.length > messageCount) {
          messageCount = messages.length;
          callback(messages);
        }
        const isFinished = await this.contract.isRunFinished(chatId);
        if (isFinished) {
          clearInterval(interval);
          console.log(`Chat ${chatId} has finished.`);
        }
      } catch (err) {
        console.error("Error monitoring chat:", err);
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval); // Return cleanup function
  }

  async isRunFinished(chatId: number): Promise<boolean> {
    try {
      return await this.contract.isRunFinished(chatId);
    } catch (err) {
      console.error("Error checking if run is finished:", err);
      throw err;
    }
  }
}

export default AgentGrab;