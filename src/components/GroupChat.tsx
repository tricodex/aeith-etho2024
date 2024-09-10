'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useGroupAgentsGrab } from '@/hooks/useGroupAgentsGrab';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const agents = [
  { id: 'blue-fish', name: 'Blue Fish', avatar: '/svgs/blue-fish.svg' },
  { id: 'orange-crab', name: 'Orange Crab', avatar: '/svgs/orange-crab.svg' },
  { id: 'green-turtle', name: 'Green Turtle', avatar: '/svgs/green-turtle.svg' },
  { id: 'red-donkey', name: 'Red Donkey', avatar: '/svgs/red-donkey.svg' },
];

const GroupChat = () => {
  const { initializeChat, getMessages, addMessage, getAgentResponse, error } = useGroupAgentsGrab();
  const [messages, setMessages] = useState<Array<{ role: string; content: string; agentId?: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      setIsLoading(true);
      try {
        await initializeChat('Welcome to the group chat!');
        for (const agent of agents) {
          const agentMessages = await getMessages(agent.id);
          setMessages(prev => [...prev, ...agentMessages.map(msg => ({ role: msg.role, content: msg.content[0].value, agentId: agent.id }))]);
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, [initializeChat, getMessages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
    setInputMessage('');

    try {
      for (const agent of agents) {
        await addMessage(agent.id, inputMessage);
        const response = await getAgentResponse(agent.id);
        setMessages(prev => [...prev, { role: 'assistant', content: response, agentId: agent.id }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">AI Agents Group Chat</CardTitle>
        <div className="flex space-x-2 mt-2">
          {agents.map((agent) => (
            <Avatar key={agent.id}>
              <AvatarImage src={agent.avatar} alt={agent.name} />
              <AvatarFallback>{agent.name[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4" ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              {msg.role !== 'user' && (
                <Avatar className="mr-2">
                  <AvatarImage src={agents.find(a => a.id === msg.agentId)?.avatar} />
                  <AvatarFallback>{agents.find(a => a.id === msg.agentId)?.name[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <Avatar className="ml-2">
                  <AvatarImage src="/svgs/user.svg" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="flex w-full space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default GroupChat;