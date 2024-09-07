import React from 'react';
import { ethers } from 'ethers';
import UnifiedChatAgentABI from './abis/UnifiedChatAgent.json';

interface AgentFactoryProps {
  contractAddress: string;
  providerUrl: string;
}

interface AgentFactoryState {
  contract: ethers.Contract | null;
  agents: Agent[];
  error: string | null;
}

interface Agent {
  id: number;
  messages: Message[];
  isFinished: boolean;
}

interface Message {
  role: string;
  content: string;
}

export class AgentFactory extends React.Component<AgentFactoryProps, AgentFactoryState> {
  private provider: ethers.JsonRpcProvider;

  constructor(props: AgentFactoryProps) {
    super(props);
    this.state = {
      contract: null,
      agents: [],
      error: null,
    };
    this.provider = new ethers.JsonRpcProvider(props.providerUrl);
  }

  componentDidMount() {
    this.initializeContract();
  }

  private async initializeContract() {
    try {
      const signer = await this.provider.getSigner();
      const contract = new ethers.Contract(
        this.props.contractAddress,
        UnifiedChatAgentABI.abi, // Use only the ABI part of the JSON file
        signer
      );
      this.setState({ contract });
    } catch (error) {
      this.setState({ error: 'Failed to initialize contract' });
    }
  }

  public async createAgent(initialMessage: string, maxIterations: number): Promise<number> {
    const { contract } = this.state;
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await contract.startChat(initialMessage, maxIterations);
      const receipt = await tx.wait();
      const agentId = this.getAgentIdFromReceipt(receipt);

      if (agentId !== undefined) {
        const newAgent: Agent = {
          id: agentId,
          messages: [{ role: 'user', content: initialMessage }],
          isFinished: false,
        };
        this.setState(prevState => ({
          agents: [...prevState.agents, newAgent],
        }));
        return agentId;
      } else {
        throw new Error('Failed to get agent ID from transaction receipt');
      }
    } catch (error) {
      this.setState({ error: 'Failed to create agent' });
      throw error;
    }
  }

  public async addMessage(agentId: number, message: string): Promise<void> {
    const { contract } = this.state;
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await contract.addMessage(message, agentId);
      await tx.wait();

      this.setState(prevState => ({
        agents: prevState.agents.map(agent =>
          agent.id === agentId
            ? { ...agent, messages: [...agent.messages, { role: 'user', content: message }] }
            : agent
        ),
      }));
    } catch (error) {
      this.setState({ error: 'Failed to add message' });
      throw error;
    }
  }

  public async getAgentMessages(agentId: number): Promise<Message[]> {
    const { contract } = this.state;
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const messages = await contract.getMessageHistory(agentId);
      return messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content[0].valueOf,
      }));
    } catch (error) {
      this.setState({ error: 'Failed to get agent messages' });
      throw error;
    }
  }

  public async isAgentFinished(agentId: number): Promise<boolean> {
    const { contract } = this.state;
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const isFinished = await contract.isRunFinished(agentId);

      this.setState(prevState => ({
        agents: prevState.agents.map(agent =>
          agent.id === agentId
            ? { ...agent, isFinished }
            : agent
        ),
      }));

      return isFinished;
    } catch (error) {
      this.setState({ error: 'Failed to check agent status' });
      throw error;
    }
  }

  private getAgentIdFromReceipt(receipt: ethers.TransactionReceipt): number | undefined {
    const { contract } = this.state;
    if (!contract) return undefined;

    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "ChatCreated") {
          return parsedLog.args[1].toNumber();
        }
      } catch (error) {
        console.warn("Could not parse log:", log);
      }
    }
    return undefined;
  }

  render() {
    // This component doesn't render anything itself
    return null;
  }
}