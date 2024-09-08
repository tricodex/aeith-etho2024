// src/components/MurderMysteryGame.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameAgentsGrab } from '@/hooks/useGameAgentsGrab';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { motion } from 'framer-motion';

interface MurderMysteryGameProps {
  onRoomChange: (newRoom: string) => void;
}

interface Position {
  x: number;
  y: number;
}

interface GameState {
  mansion: {
    layout: string[][];
    rooms: {
      name: string;
      description: string;
      items: string[];
    }[];
  };
  players: {
    name: string;
    role: string;
    position: Position;
    inventory: string[];
  }[];
  murder: {
    victim: string;
    weapon: string;
    location: string;
    culprit: string;
  };
  clues: {
    description: string;
    location: string;
    discovered: boolean;
  }[];
  currentTurn: string;
  gamePhase: 'investigation' | 'accusation' | 'conclusion';
  turnCount: number;
  events: string[];
}

interface AgentAction {
  thoughts: string;
  speech: string;
  action: {
    type: string;
    details: string;
  };
}

const MurderMysteryGame: React.FC<MurderMysteryGameProps> = ({ onRoomChange }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userInput, setUserInput] = useState('');
  const [gameLog, setGameLog] = useState<string[]>([]);
  const { createAgent, addMessage, monitorChat } = useGameAgentsGrab();
  const { toast } = useToast();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const getRoomName = useCallback((position: Position): string => {
    if (!gameState) return '';
    const cell = gameState.mansion.layout[position.y][position.x];
    const room = gameState.mansion.rooms.find(r => r.name === cell);
    return room ? room.name : 'Unknown Room';
  }, [gameState]);

  const handleGameEnd = useCallback((finalState: GameState) => {
    const winner = finalState.players.find(p => p.role === 'detective' || p.role === 'murderer');
    setGameLog(prev => [...prev, `Game Over! ${winner ? `${winner.name} wins!` : 'The game has concluded.'}`]);
  }, []);

  const generateEvent = useCallback(async () => {
    if (!gameState) return;

    try {
      const response = await fetch('/api/game-master/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState }),
      });
      const event = await response.json();
      setGameLog(prev => [...prev, event.description]);
      setGameState(prevState => ({
        ...prevState!,
        ...event.gameStateChanges
      }));
    } catch (err) {
      console.error('Error generating event:', err);
    }
  }, [gameState]);

  const updateGameState = useCallback(async (changes: Partial<GameState>) => {
    if (!gameState) return;

    try {
      const response = await fetch('/api/game-master/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentState: gameState, changes }),
      });
      const updatedState: GameState = await response.json();
      setGameState(updatedState);

      // Update room if user's position changed
      const userPlayer = updatedState.players.find(p => p.role === 'user');
      if (userPlayer) {
        const newRoom = getRoomName(userPlayer.position);
        onRoomChange(newRoom);
      }

      // Check for game end conditions
      if (updatedState.gamePhase === 'conclusion') {
        handleGameEnd(updatedState);
      }

      // Generate random events
      if (Math.random() < 0.2) { // 20% chance of an event occurring
        await generateEvent();
      }
    } catch (err) {
      console.error('Error updating game state:', err);
    }
  }, [gameState, onRoomChange, getRoomName, handleGameEnd, generateEvent]);

  const processAction = useCallback(async (agentName: string, action: { type: string; details: string }, chatId: number) => {
    if (!gameState) return;

    try {
      const response = await fetch('/api/game-master/process-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: agentName, action, gameState }),
      });
      const actionResult = await response.json();

      setGameLog(prev => [...prev, actionResult.narrativeDescription]);
      await updateGameState(actionResult.stateChanges);

      if (gameState.currentTurn === 'user') {
        setGameLog(prev => [...prev, "It's your turn. What would you like to do?"]);
      } else {
        await addMessage(gameState.currentTurn, JSON.stringify(gameState), chatId);
      }
    } catch (err) {
      console.error('Error processing action:', err);
      toast({
        title: "Error",
        description: "Failed to process the action. Please try again.",
        variant: "destructive",
      });
    }
  }, [gameState, updateGameState, addMessage, toast]);

  const handleAgentResponse = useCallback(async (agentName: string, messages: { role: string; content: string[] }[], chatId: number) => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role === 'assistant') {
      try {
        const agentAction: AgentAction = JSON.parse(latestMessage.content[0]);
        setGameLog(prev => [...prev, `${agentName} (thinking): ${agentAction.thoughts}`]);
        setGameLog(prev => [...prev, `${agentName}: ${agentAction.speech}`]);
        await processAction(agentName, agentAction.action, chatId);
      } catch (err) {
        console.error(`Error processing ${agentName}'s action:`, err);
      }
    }
  }, [processAction]);

  const initializeGame = useCallback(async () => {
    try {
      const response = await fetch('/api/game-master/initialize', { method: 'POST' });
      const initialState: GameState = await response.json();
      setGameState(initialState);
      setGameLog(['Game initialized. Welcome to the Haunted Mansion Murder Mystery!']);
      const userPlayer = initialState.players.find(p => p.role === 'user');
      if (userPlayer) {
        onRoomChange(getRoomName(userPlayer.position));
      }
      
      // Initialize AI agents
      for (const player of initialState.players) {
        if (player.role !== 'user') {
          const chatId = await createAgent(player.role, JSON.stringify(initialState));
          monitorChat(player.role, chatId, (messages) => handleAgentResponse(player.name, messages, chatId));
        }
      }
    } catch (err) {
      console.error('Error initializing game:', err);
      toast({
        title: "Error",
        description: "Failed to initialize the game. Please try again.",
        variant: "destructive",
      });
    }
  }, [createAgent, monitorChat, toast, onRoomChange, getRoomName, handleAgentResponse]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleUserInput = useCallback(async () => {
    if (!gameState || gameState.currentTurn !== 'user' || !userInput.trim()) return;

    try {
      const userAction = {
        type: 'user_action',
        details: userInput
      };
      await processAction('user', userAction, 0); // Assuming 0 as a placeholder chatId for user
      setUserInput('');
    } catch (err) {
      console.error('Error processing user input:', err);
      toast({
        title: "Error",
        description: "Failed to process your action. Please try again.",
        variant: "destructive",
      });
    }
  }, [gameState, userInput, processAction, toast]);

  const renderGameGrid = useCallback(() => {
    if (!gameState) return null;

    return (
      <div className="game-grid grid grid-cols-10 gap-1 mb-4">
        {gameState.mansion.layout.map((row, y) =>
          row.map((cell, x) => {
            const player = gameState.players.find(p => p.position.x === x && p.position.y === y);
            return (
              <motion.div
                key={`${x}-${y}`}
                className={`w-12 h-12 flex items-center justify-center relative ${
                  player ? 'bg-blue-200' : 'bg-gray-200'
                } cursor-pointer`}
                whileHover={{ scale: 1.1 }}
                onClick={() => player && setSelectedPlayer(player.name)}
              >
                {player && (
                  <Image
                    src={`/svgs/${player.name}.svg`}
                    alt={player.name}
                    width={40}
                    height={40}
                  />
                )}
                <span className="absolute bottom-0 right-0 text-xs">
                  {getRoomName({ x, y })}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    );
  }, [gameState, getRoomName]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [gameLog]);

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full">
      {renderGameGrid()}

      <div className="game-info mb-4">
        <h3 className="text-lg font-semibold">Current Turn: {gameState.currentTurn}</h3>
        <p>Game Phase: {gameState.gamePhase}</p>
        <p>Turn Count: {gameState.turnCount}</p>
      </div>

      <ScrollArea className="h-[200px] mb-4 border p-2">
        <div ref={scrollAreaRef}>
          {gameLog.map((log, index) => (
            <p key={index} className="mb-1">{log}</p>
          ))}
        </div>
      </ScrollArea>

      <div className="user-input flex space-x-2">
        <Input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your action..."
          disabled={gameState.currentTurn !== 'user'}
          onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
        />
        <Button onClick={handleUserInput} disabled={gameState.currentTurn !== 'user'}>
          Submit Action
        </Button>
      </div>

      {selectedPlayer && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="text-lg font-semibold mb-2">{selectedPlayer}</h4>
          <p>Role: {gameState.players.find(p => p.name === selectedPlayer)?.role}</p>
          <p>Inventory: {gameState.players.find(p => p.name === selectedPlayer)?.inventory.join(', ')}</p>
          <Button onClick={() => setSelectedPlayer(null)} className="mt-2">Close</Button>
        </div>
      )}
    </div>
  );
};

export default MurderMysteryGame;