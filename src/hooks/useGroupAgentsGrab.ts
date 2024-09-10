import { useState, useEffect, useCallback } from 'react';
import GroupAgentsGrab from '@/utils/GroupAgentsGrab';

interface Message {
  role: string;
  content: { contentType: string; value: string }[];
}

export const useGroupAgentsGrab = () => {
  const [groupAgentsGrab, setGroupAgentsGrab] = useState<GroupAgentsGrab | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const newGroupAgentsGrab = new GroupAgentsGrab();
      setGroupAgentsGrab(newGroupAgentsGrab);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const initializeChat = useCallback(async (message: string) => {
    if (!groupAgentsGrab) throw new Error("GroupAgentsGrab not initialized");
    try {
      await groupAgentsGrab.initializeChat(message);
    } catch (error) {
      console.error("Error initializing chat:", error);
      setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, [groupAgentsGrab]);

  const getMessages = useCallback(async (agentType: string): Promise<Message[]> => {
    if (!groupAgentsGrab) throw new Error("GroupAgentsGrab not initialized");
    return await groupAgentsGrab.getMessages(agentType);
  }, [groupAgentsGrab]);

  const addMessage = useCallback(async (agentType: string, message: string) => {
    if (!groupAgentsGrab) throw new Error("GroupAgentsGrab not initialized");
    await groupAgentsGrab.addMessage(agentType, message);
  }, [groupAgentsGrab]);

  const getAgentResponse = useCallback(async (agentType: string): Promise<string> => {
    if (!groupAgentsGrab) throw new Error("GroupAgentsGrab not initialized");
    return await groupAgentsGrab.getAgentResponse(agentType);
  }, [groupAgentsGrab]);

  return { initializeChat, getMessages, addMessage, getAgentResponse, error };
};

export default useGroupAgentsGrab;