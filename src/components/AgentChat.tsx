// src/components/AgentChat.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAgentGrab } from '@/hooks/useAgentGrab';
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

// Define the message interface
interface Message {
  role: "user" | "assistant" | string;
  content: string[];
}

const AgentChat = () => {
  const [chatId, setChatId] = useState<number | null>(null); // Stores the chat ID
  const [messages, setMessages] = useState<Message[]>([]); // Holds chat messages
  const [inputMessage, setInputMessage] = useState(''); // Holds the current input message
  const [initialQuery, setInitialQuery] = useState(''); // Initial query for starting the chat
  const [isLoading, setIsLoading] = useState(false); // Loading state for sending messages
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for scrolling the chat area
  const { toast } = useToast(); // Toast for notifications
  const { createAgent, addMessage, monitorChat, error } = useAgentGrab(); // Hooks for handling agent chat interactions

  // Display error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Monitor and update chat messages based on chatId
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (chatId !== null) {
      const setupMonitoring = async () => {
        cleanup = await monitorChat(chatId, (newMessages) => {
          setMessages(newMessages.filter(msg => msg.role !== "system")); // Filters out system messages
        });
      };

      setupMonitoring();
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [chatId, monitorChat]);

  // Scroll to the bottom of the chat area when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Function to create a new chat agent
  const handleCreateAgent = async () => {
    if (!initialQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter an initial query to start the chat.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newChatId = await createAgent(initialQuery, 10); // Create new agent with initial query
      setChatId(newChatId); // Set chatId to new chat
      toast({
        title: "Chat Started",
        description: `New chat created with ID: ${newChatId}`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to create a new chat: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to send a message
  const handleSendMessage = async () => {
    if (chatId !== null && inputMessage.trim() !== '') {
      setIsLoading(true);
      try {
        await addMessage(inputMessage, chatId); // Add the message to the chat
        setInputMessage(''); // Clear input field after sending
      } catch (err) {
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

  // const formatMessage = (message: string) => {
  //   if (typeof message === 'string') {
  //     // const message = message.trim(); // Trim any leading/trailing spaces
  //     if (message.toLowerCase().startsWith('text')) {
  //       return message.slice(4).trim(); // Remove the first 4 characters and trim any spaces
  //     }
  //     return message; // Return the original message if it doesn't start with 'text'
  //   }
  //   return ''; // Return an empty string or handle non-string types as appropriate
  // };

  // Steps to display in the "How the AI Chat Works" section
  const steps = [
    '🚀 Step 1: You initiate the chat by sending a query. The system awaits your input eagerly.',
    '🌐 Step 2: The system sends your query to the backend, where an oracle (GPT-4o) is initiated.',
    '🤖 Step 3: The oracle processes the query and formulates a response, which is sent back to the system.',
    '🔍 Step 4: If more context is needed, the system searches for additional data to enrich the response.',
    '🔒 Step 5: The conversation flows seamlessly, and your chat history is securely stored for future reference.'
  ];

  return (
    <div className="flex justify-center items-start space-x-4 p-4">
      {/* Main Chat Area */}
      <Card className="w-2/3 max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">AI Agent Chat</CardTitle>
        </CardHeader>
        <CardContent>
          {/* If no chatId, display the form to create a new chat */}
          {chatId === null ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Enter your initial query to start the chat..."
                value={initialQuery}
                onChange={(e) => setInitialQuery(e.target.value)}
                className="min-h-[100px]"
              />
              <Button onClick={handleCreateAgent} disabled={isLoading} className="w-full">
                {isLoading ? "Creating Chat..." : "Start New Chat"}
              </Button>
            </div>
          ) : (
            <>
              {/* Scrollable chat messages */}
              <ScrollArea className="h-[500px] pr-4" ref={scrollAreaRef}>
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`flex items-start max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="w-8 h-8 mr-2">
                        <AvatarImage src={msg.role === 'user' ? '/svgs/user.svg' : '/svgs/aeith-logo.svg'} />
                        <AvatarFallback>{msg.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                      </Avatar>
                      <div className={`rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        {/* <ReactMarkdown>{formatMessage(msg.content[0])}</ReactMarkdown> */}
                        <ReactMarkdown>{String(msg.content[0])}</ReactMarkdown>
                        
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>

              <Separator className="my-4" />

              {/* Input field to send a message */}
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                  className="flex-grow"
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="w-1/3 max-w-sm h-[675px] overflow-hidden"> {/* Ensure the card has overflow-hidden */}
        <CardHeader>
          <CardTitle>How the on-chain AI chat works!</CardTitle>
        </CardHeader>
        <CardContent className="relative h-full p-2">
          <div className="relative h-full w-full">
            <Image 
              src="/image_rpb.png" 
              alt="Colorful background" 
              layout="fill" 
              objectFit="cover" 
              className="rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg p-4 overflow-y-auto"> {/* Add overflow-y-auto here */}
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <p key={index} className="text-white p-2 bg-black bg-opacity-30 rounded">
                    {step}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentChat;