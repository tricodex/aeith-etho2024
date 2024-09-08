// src/components/AgentChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAgentGrab } from '@/hooks/useAgentGrab';

interface Message {
  role: "user" | "assistant" | string;
  content: string[];
}

const AgentChat = () => {
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { createAgent, addMessage, monitorChat, error } = useAgentGrab();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (chatId !== null) {
      const setupMonitoring = async () => {
        cleanup = await monitorChat(chatId, (newMessages) => {
          setMessages(newMessages);
        });
      };

      setupMonitoring();
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [chatId, monitorChat]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateAgent = async () => {
    setIsLoading(true);
    try {
      console.log("Attempting to create agent...");
      const newChatId = await createAgent("Hello, AI agent!", 10);
      console.log("Agent created successfully with chatId:", newChatId);
      setChatId(newChatId);
      toast({
        title: "Chat Started",
        description: `New chat created with ID: ${newChatId}`,
      });
    } catch (err) {
      console.error("Failed to create agent:", err);
      toast({
        title: "Error",
        description: `Failed to create a new chat: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (chatId !== null && inputMessage.trim() !== '') {
      setIsLoading(true);
      try {
        await addMessage(inputMessage, chatId);
        setInputMessage('');
      } catch (err) {
        console.error("Failed to send message:", err);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Agent Chat</CardTitle>
      </CardHeader>
      <CardContent>
        {chatId === null ? (
          <Button onClick={handleCreateAgent} disabled={isLoading}>
            {isLoading ? "Creating Chat..." : "Start New Chat"}
          </Button>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4" ref={scrollAreaRef}>
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`flex items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="w-8 h-8 mr-2">
                      <AvatarImage src={msg.role === 'user' ? '/user-avatar.png' : '/ai-avatar.png'} />
                      <AvatarFallback>{msg.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                    </Avatar>
                    <div className={`rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                      {msg.content[0]}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="mt-4 flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading}>
                {isLoading ? "Sending..." : "Send"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentChat;