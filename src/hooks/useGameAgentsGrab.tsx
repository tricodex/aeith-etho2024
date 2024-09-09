// src/hooks/useGameAgentsGrab.tsx

import { useState, useEffect, useCallback } from 'react';
import GameAgentsGrab from '@/utils/GameAgentsGrab';
import { GameState, GameAction } from '@/types/gameTypes';

interface Message {
  role: string;
  content: { contentType: string; value: string; }[];
}

export const useGameAgentsGrab = () => {
  const [gameAgentsGrab, setGameAgentsGrab] = useState<GameAgentsGrab | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const newGameAgentsGrab = new GameAgentsGrab();
      setGameAgentsGrab(newGameAgentsGrab);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const createAgent = useCallback(async (agentType: string, message: string, maxIterations: number = 5) => {
    if (!gameAgentsGrab) throw new Error("GameAgentsGrab not initialized");
    try {
      const chatId = await gameAgentsGrab.createAgent(agentType, message, maxIterations);
      console.log(`${agentType} agent chat created with ID:`, chatId);
      return chatId;
    } catch (error) {
      console.error(`Error in creating ${agentType} agent:`, error);
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [gameAgentsGrab]);

  const getAgentMessages = useCallback(async (agentType: string, chatId?: number) => {
    if (!gameAgentsGrab) throw new Error("GameAgentsGrab not initialized");
    return await gameAgentsGrab.getAgentMessages(agentType, chatId);
  }, [gameAgentsGrab]);

  const addMessage = useCallback(async (agentType: string, message: string, chatId?: number) => {
    if (!gameAgentsGrab) throw new Error("GameAgentsGrab not initialized");
    await gameAgentsGrab.addMessage(agentType, message, chatId);
  }, [gameAgentsGrab]);

  const generateAgentAction = useCallback(async (agentType: string, gameState: GameState): Promise<GameAction> => {
    if (!gameAgentsGrab) throw new Error("GameAgentsGrab not initialized");
    try {
      return await gameAgentsGrab.generateAgentAction(agentType, gameState);
    } catch (error) {
      console.error(`Error generating action for ${agentType}:`, error);
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [gameAgentsGrab]);

  return { createAgent, getAgentMessages, addMessage, generateAgentAction, error };
};