// src/hooks/useAITools.tsx

import { useState, useEffect } from "react";
import { z } from "zod";
import { useAgentFactory } from "./useAgentFactory";

// Zod schemas for structured outputs
const MarketAnalysis = z.object({
  overallSentiment: z.enum(["Bullish", "Bearish", "Neutral"]),
  keyFactors: z.array(z.string()),
  potentialRisks: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const AISimulation = z.object({
  scenario: z.string(),
  agents: z.array(z.object({
    name: z.string(),
    role: z.string(),
    action: z.string(),
  })),
  outcome: z.string(),
  ethicalConsiderations: z.array(z.string()),
});

export const useAITools = () => {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
  const { 
    createAgent, 
    getAgentMessages, 
    error: factoryError 
  } = useAgentFactory(contractAddress);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (factoryError) {
      setError(factoryError);
    }
  }, [factoryError]);

  const runMarketAnalysis = async (asset: string): Promise<z.infer<typeof MarketAnalysis>> => {
    setLoading(true);
    try {
      const response = await fetch('/api/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ asset }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate market analysis');
      }

      const data = await response.json();
      return MarketAnalysis.parse(data);
    } catch (err) {
      console.error("Error in market analysis:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const runAISimulation = async (scenario: string): Promise<z.infer<typeof AISimulation>> => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        throw new Error('Failed to run AI simulation');
      }

      const data = await response.json();
      return AISimulation.parse(data);
    } catch (err) {
      console.error("Error in AI simulation:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateTradingStrategy = async (asset: string, timeFrame: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Generate a trading strategy for ${asset} on a ${timeFrame} timeframe. Include entry points, exit points, risk management, and potential profit percentage.`,
        5
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to generate trading strategy");
    } catch (err) {
      console.error("Error generating trading strategy:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const auditSmartContract = async (contractCode: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Audit the following smart contract code for vulnerabilities and optimization suggestions:\n\n${contractCode}`,
        7
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to audit smart contract");
    } catch (err) {
      console.error("Error auditing smart contract:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeTokenomics = async (tokenName: string, tokenData: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Analyze the tokenomics for ${tokenName} with the following data:\n\n${tokenData}`,
        6
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to analyze tokenomics");
    } catch (err) {
      console.error("Error in tokenomics analysis:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateDeFiStrategy = async (investmentGoal: string, riskTolerance: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Generate a DeFi strategy for the following investment goal: ${investmentGoal}. Risk tolerance: ${riskTolerance}. Include recommended protocols, estimated yields, and step-by-step instructions.`,
        6
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to generate DeFi strategy");
    } catch (err) {
      console.error("Error generating DeFi strategy:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const predictMarketTrends = async (timeframe: string, assets: string[]): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Predict market trends for the following assets: ${assets.join(", ")} over the next ${timeframe}. Include potential catalysts and risk factors.`,
        5
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to predict market trends");
    } catch (err) {
      console.error("Error predicting market trends:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeOnChainData = async (address: string, chainId: number): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Analyze on-chain data for address ${address} on chain ID ${chainId}. Provide insights on transaction patterns, token holdings, and interaction with DeFi protocols.`,
        5
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to analyze on-chain data");
    } catch (err) {
      console.error("Error analyzing on-chain data:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateNFTIdea = async (theme: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Generate a unique NFT collection idea based on the theme: ${theme}. Include concept, artwork style, potential utility, and target audience.`,
        4
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to generate NFT idea");
    } catch (err) {
      console.error("Error generating NFT idea:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCryptoRegulation = async (country: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await createAgent(
        `Analyze the current cryptocurrency regulations in ${country}. Include key laws, regulatory bodies, and recent developments.`,
        5
      );

      const messages = await getAgentMessages(agentId);
      if (messages && messages.length > 0) {
        return messages[messages.length - 1].content;
      }
      throw new Error("Failed to analyze crypto regulation");
    } catch (err) {
      console.error("Error analyzing crypto regulation:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    runMarketAnalysis,
    runAISimulation,
    generateTradingStrategy,
    auditSmartContract,
    analyzeTokenomics,
    generateDeFiStrategy,
    predictMarketTrends,
    analyzeOnChainData,
    generateNFTIdea,
    analyzeCryptoRegulation,
  };
};

export default useAITools;