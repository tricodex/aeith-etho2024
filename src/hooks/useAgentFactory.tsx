// src/hooks/useAgentFactory.tsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Auth } from '@/context/Web3AuthContext';
import UnifiedChatAgentABI from './abis/UnifiedChatAgent.json';

interface Agent {
  id: number;
  messages: Message[];
  isFinished: boolean;
}

interface Message {
  role: string;
  content: string;
}

export const useAgentFactory = (contractAddress: string) => {
  const { web3auth, provider } = useWeb3Auth();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (web3auth && provider && contractAddress) {
      const init = async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ethersProvider = new ethers.BrowserProvider(provider as any);
          const signer = await ethersProvider.getSigner();
          const newContract = new ethers.Contract(contractAddress, UnifiedChatAgentABI.abi, signer);
          setContract(newContract);
        } catch (err) {
          console.error("Failed to initialize contract:", err);
          setError("Failed to initialize contract");
        }
      };

      init();
    }
  }, [web3auth, provider, contractAddress]);

  const createAgent = async (initialMessage: string, maxIterations: number): Promise<number> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await contract.startChat(initialMessage, maxIterations);
      const receipt = await tx.wait();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("ChatCreated(address,uint256)")
      );
      
      let agentId: number | undefined;
      if (event) {
        const decodedLog = contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data
        });
        agentId = decodedLog?.args[1].toNumber();
      }

      if (agentId !== undefined) {
        const newAgent: Agent = {
          id: agentId,
          messages: [{ role: 'user', content: initialMessage }],
          isFinished: false,
        };
        setAgents(prevAgents => [...prevAgents, newAgent]);
        return agentId;
      } else {
        throw new Error('Failed to get agent ID from transaction receipt');
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      setError('Failed to create agent');
      throw error;
    }
  };

  const addMessage = async (agentId: number, message: string): Promise<void> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await contract.addMessage(message, agentId);
      await tx.wait();

      setAgents(prevAgents => prevAgents.map(agent =>
        agent.id === agentId
          ? { ...agent, messages: [...agent.messages, { role: 'user', content: message }] }
          : agent
      ));
    } catch (error) {
      console.error("Error adding message:", error);
      setError('Failed to add message');
      throw error;
    }
  };

  const getAgentMessages = async (agentId: number): Promise<Message[]> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const messages = await contract.getMessageHistory(agentId);
      return messages.map((msg: { role: string; content: { contentType: string; value: string }[] }) => ({
        role: msg.role,
        content: msg.content[0].value,
      }));
    } catch (error) {
      console.error("Error getting agent messages:", error);
      setError('Failed to get agent messages');
      throw error;
    }
  };

  const isAgentFinished = async (agentId: number): Promise<boolean> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const isFinished = await contract.isRunFinished(agentId);
      setAgents(prevAgents => prevAgents.map(agent =>
        agent.id === agentId
          ? { ...agent, isFinished }
          : agent
      ));
      return isFinished;
    } catch (error) {
      console.error("Error checking agent status:", error);
      setError('Failed to check agent status');
      throw error;
    }
  };

  return {
    createAgent,
    addMessage,
    getAgentMessages,
    isAgentFinished,
    agents,
    error,
  };
};