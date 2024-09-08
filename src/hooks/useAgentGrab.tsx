// src/hooks/useAgentGrab.ts

import { useState, useEffect, useCallback } from 'react';
import AgentGrab from '../utils/AgentGrab';

interface Message {
  role: string;
  content: string[];
}

export const useAgentGrab = () => {
  const [agentGrab, setAgentGrab] = useState<AgentGrab | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const newAgentGrab = new AgentGrab();
      setAgentGrab(newAgentGrab);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const createAgent = useCallback(async (message: string, maxIterations: number = 5) => {
    if (!agentGrab) throw new Error("AgentGrab not initialized");
    try {
      const chatId = await agentGrab.createAgent(message, maxIterations);
      console.log("Chat created with ID:", chatId);
      return chatId;
    } catch (error) {
      console.error("Error in createAgent:", error);
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [agentGrab]);

  const getAgentMessages = useCallback(async (chatId: number) => {
    if (!agentGrab) throw new Error("AgentGrab not initialized");
    return await agentGrab.getAgentMessages(chatId);
  }, [agentGrab]);

  const addMessage = useCallback(async (message: string, chatId: number) => {
    if (!agentGrab) throw new Error("AgentGrab not initialized");
    await agentGrab.addMessage(message, chatId);
  }, [agentGrab]);

  const monitorChat = useCallback((chatId: number, callback: (messages: Message[]) => void) => {
    if (!agentGrab) throw new Error("AgentGrab not initialized");
    return agentGrab.monitorChat(chatId, callback);
  }, [agentGrab]);

  return { createAgent, getAgentMessages, addMessage, monitorChat, error };
};