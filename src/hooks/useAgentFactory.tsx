// // src/hooks/useAgentFactory.tsx
// // This hook manages the creation and interaction with chat agents in a smart contract.

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3Auth } from '@/context/Web3AuthContext';
import UnifiedChatAgentABI from './abis/UnifiedChatAgent.json';

interface Content {
  contentType: string;
  value: string;
}

interface Message {
  role: string;
  content: Content[];
}

interface Agent {
  id: number;
  messages: Message[];
  isFinished: boolean;
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
          console.log("Initializing contract with address:", contractAddress);
          const ethersProvider = new ethers.BrowserProvider(provider as ethers.Eip1193Provider);
          const signer = await ethersProvider.getSigner();
          console.log("Signer address:", await signer.getAddress());
          const newContract = new ethers.Contract(contractAddress, UnifiedChatAgentABI.abi, signer);
          setContract(newContract);
          console.log("Contract initialized successfully");
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
      console.error("Contract not initialized");
      throw new Error('Contract not initialized');
    }
  
    try {
      console.log("Creating agent with initial message:", initialMessage);
      console.log("Max iterations:", maxIterations);
  
      // Ensure maxIterations is within uint8 range
      const safeMaxIterations = Math.min(Math.max(maxIterations, 0), 255);
  
      // Use the contract's function directly
      const tx = await contract.startChat(initialMessage, safeMaxIterations);
      console.log("Transaction sent:", tx.hash);
  
      const receipt = await tx.wait();
      console.log("Transaction confirmed in block:", receipt.blockNumber);
  
      // Extract the agent ID from the transaction receipt
      const event = receipt.logs.find((log: ethers.Log) =>
        log.topics[0] === ethers.id("ChatCreated(address,uint256)")
      );
  
      let agentId: number | undefined;
      if (event) {
        const decodedLog = contract.interface.parseLog({
          topics: event.topics as string[],
          data: event.data,
        });
        agentId = decodedLog?.args[1].toNumber();
        console.log("Agent created with ID:", agentId);
      }
  
      if (agentId !== undefined) {
        const newAgent: Agent = {
          id: agentId,
          messages: [{ role: 'user', content: [{ contentType: 'text', value: initialMessage }] }],
          isFinished: false,
        };
        setAgents(prevAgents => [...prevAgents, newAgent]);
        return agentId;
      } else {
        console.error("Failed to get agent ID from transaction receipt");
        throw new Error('Failed to get agent ID from transaction receipt');
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      setError('Failed to create agent. Please check the console for more details.');
      throw error;
    }
  };

  const addMessage = async (agentId: number, message: string): Promise<void> => {
    if (!contract) {
      console.error("Contract not initialized");
      throw new Error('Contract not initialized');
    }

    try {
      console.log(`Adding message to agent ${agentId}:`, message);
      const tx = await contract.addMessage(message, agentId);
      console.log("Transaction sent:", tx.hash);

      await tx.wait();
      console.log("Message added successfully");

      setAgents(prevAgents => prevAgents.map(agent =>
        agent.id === agentId
          ? { ...agent, messages: [...agent.messages, { role: 'user', content: [{ contentType: 'text', value: message }] }] }
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
      console.error("Contract not initialized");
      throw new Error('Contract not initialized');
    }

    try {
      console.log(`Fetching messages for agent ${agentId}`);
      const messages = await contract.getMessageHistory(agentId);
      console.log(`Received ${messages.length} messages for agent ${agentId}`);
      return messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      console.error("Error getting agent messages:", error);
      setError('Failed to get agent messages');
      throw error;
    }
  };

  const isAgentFinished = async (agentId: number): Promise<boolean> => {
    if (!contract) {
      console.error("Contract not initialized");
      throw new Error('Contract not initialized');
    }

    try {
      console.log(`Checking if agent ${agentId} is finished`);
      const isFinished = await contract.isRunFinished(agentId);
      console.log(`Agent ${agentId} finished status:`, isFinished);

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

// // src/hooks/useAgentFactory.tsx
// import { useState, useEffect } from 'react';
// import { Contract, ethers } from 'ethers';
// import { useWeb3Auth } from '@/context/Web3AuthContext';
// import ABI from './abis/UnifiedChatAgent.json';

// interface Content {
//   contentType: string;
//   value: string;
// }

// interface Message {
//   role: string;
//   content: Content[];
// }

// export const useAgentFactory = (contractAddress: string) => {
//   const { provider } = useWeb3Auth();
//   const [contract, setContract] = useState<Contract | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (provider && contractAddress) {
//       const init = async () => {
//         try {
//           console.log("Initializing contract with address:", contractAddress);
//           const ethersProvider = new ethers.BrowserProvider(provider as ethers.Eip1193Provider);
//           const signer = await ethersProvider.getSigner();
//           console.log("Signer address:", await signer.getAddress());
//           const newContract = new ethers.Contract(contractAddress, ABI.abi, signer);
//           setContract(newContract);
//           console.log("Contract initialized successfully");
//         } catch (err) {
//           console.error("Failed to initialize contract:", err);
//           setError("Failed to initialize contract");
//         }
//       };

//       init();
//     }
//   }, [provider, contractAddress]);

//   const createAgent = async (initialMessage: string, maxIterations: number): Promise<number> => {
//     if (!contract) {
//       console.error("Contract not initialized");
//       throw new Error('Contract not initialized');
//     }
  
//     try {
//       console.log("Creating agent with initial message:", initialMessage);
//       console.log("Max iterations:", maxIterations);
  
//       // Ensure maxIterations is within uint8 range
//       const safeMaxIterations = Math.min(Math.max(maxIterations, 0), 255);
  
//       // Use the contract's function directly
//       const tx = await contract.startChat(initialMessage, safeMaxIterations);
//       console.log("Transaction sent:", tx.hash);
  
//       const receipt = await tx.wait();
//       console.log("Transaction confirmed in block:", receipt.blockNumber);
  
//       // Extract the agent ID from the transaction receipt
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const event = receipt.logs.find((log: any) =>
//         log.topics[0] === ethers.id("ChatCreated(address,uint256)")
//       );
  
//       let agentId: number | undefined;
//       if (event) {
//         const decodedLog = contract.interface.parseLog({
//           topics: event.topics as string[],
//           data: event.data,
//         });
//         agentId = decodedLog?.args[1].toNumber();
//         console.log("Agent created with ID:", agentId);
//       }
  
//       if (agentId !== undefined) {
//         return agentId;
//       } else {
//         console.error("Failed to get agent ID from transaction receipt");
//         throw new Error('Failed to get agent ID from transaction receipt');
//       }
//     } catch (error) {
//       console.error("Error creating agent:", error);
//       if (error instanceof Error) {
//         console.error("Error message:", error.message);
//         console.error("Error stack:", error.stack);
//       }
//       setError('Failed to create agent. Please check the console for more details.');
//       throw error;
//     }
//   };

//   const addMessage = async (agentId: number, message: string): Promise<void> => {
//     if (!contract) {
//       console.error("Contract not initialized");
//       throw new Error('Contract not initialized');
//     }

//     try {
//       console.log(`Adding message to agent ${agentId}:`, message);
//       const tx = await contract.addMessage(message, agentId);
//       console.log("Transaction sent:", tx.hash);

//       await tx.wait();
//       console.log("Message added successfully");
//     } catch (error) {
//       console.error("Error adding message:", error);
//       setError('Failed to add message');
//       throw error;
//     }
//   };

//   const getAgentMessages = async (agentId: number): Promise<Message[]> => {
//     if (!contract) {
//       console.error("Contract not initialized");
//       throw new Error('Contract not initialized');
//     }

//     try {
//       console.log(`Fetching messages for agent ${agentId}`);
//       const messages = await contract.getMessageHistory(agentId);
//       console.log(`Received ${messages.length} messages for agent ${agentId}`);
//       return messages.map((msg: Message) => ({
//         role: msg.role,
//         content: msg.content,
//       }));
//     } catch (error) {
//       console.error("Error getting agent messages:", error);
//       setError('Failed to get agent messages');
//       throw error;
//     }
//   };

//   const isAgentFinished = async (agentId: number): Promise<boolean> => {
//     if (!contract) {
//       console.error("Contract not initialized");
//       throw new Error('Contract not initialized');
//     }

//     try {
//       console.log(`Checking if agent ${agentId} is finished`);
//       const isFinished = await contract.isRunFinished(agentId);
//       console.log(`Agent ${agentId} finished status:`, isFinished);
//       return isFinished;
//     } catch (error) {
//       console.error("Error checking agent status:", error);
//       setError('Failed to check agent status');
//       throw error;
//     }
//   };

//   return {
//     createAgent,
//     addMessage,
//     getAgentMessages,
//     isAgentFinished,
//     error,
//   };
// };