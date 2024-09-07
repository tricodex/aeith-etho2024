import { useRef, useState, useEffect } from "react";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { AgentFactory } from "@/components/AI/AgentFactory";
// import dotenv from 'dotenv';

// dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '');

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

const TradingStrategy = z.object({
  asset: z.string(),
  timeFrame: z.string(),
  entryPoints: z.array(z.string()),
  exitPoints: z.array(z.string()),
  riskManagement: z.string(),
  potentialProfitPercentage: z.number(),
});

const SmartContractAudit = z.object({
  contractName: z.string(),
  vulnerabilities: z.array(z.string()),
  optimizationSuggestions: z.array(z.string()),
  overallSecurity: z.enum(["Low", "Medium", "High"]),
});

const TokenomicsAnalysis = z.object({
  tokenName: z.string(),
  distribution: z.record(z.string(), z.number()),
  inflationRate: z.number(),
  utilityAnalysis: z.string(),
  competitiveAdvantage: z.string(),
});

export const useAITools = () => {
  const agentFactoryRef = useRef<AgentFactory | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const providerUrl = process.env.NEXT_PUBLIC_PROVIDER_URL;
    
    if (contractAddress && providerUrl) {
      agentFactoryRef.current = new AgentFactory({
        contractAddress,
        providerUrl,
      });
    } else {
      setError("Missing environment variables for AgentFactory");
    }
  }, []);

  const runMarketAnalysis = async (asset: string): Promise<z.infer<typeof MarketAnalysis>> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Analyze the market for ${asset}. Include overall sentiment, key factors, potential risks, and recommendations.`,
        5
      );
      
      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          const analysisText = messages[messages.length - 1].content;
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4-0125-preview",
            messages: [
              { role: "system", content: "You are a financial analyst. Convert the following market analysis into a structured format." },
              { role: "user", content: analysisText }
            ],
            response_format: { type: "json_object" },
          });

          const structuredAnalysis = JSON.parse(completion.choices[0].message.content || '{}');
          return MarketAnalysis.parse(structuredAnalysis);
        }
      }
      throw new Error("Failed to generate market analysis");
    } catch (err) {
      console.error("Error in market analysis:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const runAISimulation = async (scenario: string): Promise<z.infer<typeof AISimulation>> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Run an AI simulation for the following scenario: ${scenario}. Include details about the agents involved, their actions, the outcome, and ethical considerations.`,
        7
      );
      
      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          const simulationText = messages[messages.length - 1].content;
          
          const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
          const result = await model.generateContent(`Convert the following AI simulation into a structured JSON format: ${simulationText}`);
          const generatedText = result.response.text();
          const structuredSimulation = JSON.parse(generatedText);
          return AISimulation.parse(structuredSimulation);
        }
      }
      throw new Error("Failed to run AI simulation");
    } catch (err) {
      console.error("Error in AI simulation:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateTradingStrategy = async (asset: string, timeFrame: string): Promise<z.infer<typeof TradingStrategy>> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Generate a trading strategy for ${asset} on a ${timeFrame} timeframe. Include entry points, exit points, risk management, and potential profit percentage.`,
        5
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          const strategyText = messages[messages.length - 1].content;
          const strategyJson = JSON.parse(strategyText);
          return TradingStrategy.parse(strategyJson);
        }
      }
      throw new Error("Failed to generate trading strategy");
    } catch (err) {
      console.error("Error generating trading strategy:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const auditSmartContract = async (contractCode: string): Promise<z.infer<typeof SmartContractAudit>> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Audit the following smart contract code for vulnerabilities and optimization suggestions:\n\n${contractCode}`,
        7
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          const auditText = messages[messages.length - 1].content;
          const auditJson = JSON.parse(auditText);
          return SmartContractAudit.parse(auditJson);
        }
      }
      throw new Error("Failed to audit smart contract");
    } catch (err) {
      console.error("Error auditing smart contract:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeTokenomics = async (tokenName: string, tokenData: string): Promise<z.infer<typeof TokenomicsAnalysis>> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Analyze the tokenomics for ${tokenName} with the following data:\n\n${tokenData}`,
        6
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          const analysisText = messages[messages.length - 1].content;
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4-0125-preview",
            messages: [
              { role: "system", content: "You are a tokenomics expert. Convert the following analysis into a structured format." },
              { role: "user", content: analysisText }
            ],
            response_format: { type: "json_object" },
          });

          const structuredAnalysis = JSON.parse(completion.choices[0].message.content || '{}');
          return TokenomicsAnalysis.parse(structuredAnalysis);
        }
      }
      throw new Error("Failed to analyze tokenomics");
    } catch (err) {
      console.error("Error in tokenomics analysis:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateDeFiStrategy = async (investmentGoal: string, riskTolerance: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Generate a DeFi strategy for the following investment goal: ${investmentGoal}. Risk tolerance: ${riskTolerance}. Include recommended protocols, estimated yields, and step-by-step instructions.`,
        6
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          return messages[messages.length - 1].content;
        }
      }
      throw new Error("Failed to generate DeFi strategy");
    } catch (err) {
      console.error("Error generating DeFi strategy:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const predictMarketTrends = async (timeframe: string, assets: string[]): Promise<string> => {
    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const result = await model.generateContent(`Predict market trends for the following assets: ${assets.join(", ")} over the next ${timeframe}. Include potential catalysts and risk factors.`);
      return result.response.text();
    } catch (err) {
      console.error("Error predicting market trends:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeOnChainData = async (address: string, chainId: number): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Analyze on-chain data for address ${address} on chain ID ${chainId}. Provide insights on transaction patterns, token holdings, and interaction with DeFi protocols.`,
        5
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          return messages[messages.length - 1].content;
        }
      }
      throw new Error("Failed to analyze on-chain data");
    } catch (err) {
      console.error("Error analyzing on-chain data:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateNFTIdea = async (theme: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Generate a unique NFT collection idea based on the theme: ${theme}. Include concept, artwork style, potential utility, and target audience.`,
        4
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          return messages[messages.length - 1].content;
        }
      }
      throw new Error("Failed to generate NFT idea");
    } catch (err) {
      console.error("Error generating NFT idea:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeCryptoRegulation = async (country: string): Promise<string> => {
    setLoading(true);
    try {
      const agentId = await agentFactoryRef.current?.createAgent(
        `Analyze the current cryptocurrency regulations in ${country}. Include key laws, regulatory bodies, and recent developments.`,
        5
      );

      if (agentId !== undefined) {
        const messages = await agentFactoryRef.current?.getAgentMessages(agentId);
        if (messages && messages.length > 0) {
          return messages[messages.length - 1].content;
        }
      }
      throw new Error("Failed to analyze crypto regulation");
    } catch (err) {
      console.error("Error analyzing crypto regulation:", err);
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