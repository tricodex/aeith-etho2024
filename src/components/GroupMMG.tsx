// src/components/GroupMMG.tsx

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { gameEngine } from '@/utils/game-engine/gameEngine';
import { GameState, GameAction, Player, ChatEntry } from '@/types/gameTypes';
import { messageBus } from '@/utils/MessageBus';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import styles from '@/styles/MurderMystery.module.css';

const GRID_SIZE = 10;

const characterAvatars: Record<string, string> = {
  'blue-fish': '/svgs/blue-fish.svg',
  'orange-crab': '/svgs/orange-crab.svg',
  'green-turtle': '/svgs/green-turtle.svg',
  'red-donkey': '/svgs/red-donkey.svg',
  'user': '/svgs/user.svg',
};

const roomSvgs: Record<string, string> = {
  'Foyer': '/rooms/foyer.svg',
  'Living Room': '/rooms/living-room.svg',
  'Dining Room': '/rooms/dining-room.svg',
  'Kitchen': '/rooms/kitchen.svg',
  'Library': '/rooms/library.svg',
  'Study': '/rooms/study.svg',
  'Master Bedroom': '/rooms/master-bedroom.svg',
  'Guest Bedroom': '/rooms/guest-bedroom.svg',
  'Bathroom': '/rooms/bathroom.svg',
  'Attic': '/rooms/attic.svg',
};

const LoadingDots = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length < 3 ? prev + '.' : '');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span>{dots}</span>;
};

const GroupMMG: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<GameAction['type'] | null>(null);
  const [actionDetails, setActionDetails] = useState<any>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const initGame = useCallback(async () => {
    setIsLoading(true);
    try {
      await gameEngine.initializeGame();
      const initialState = gameEngine.getState();
      setGameState(initialState);
    } catch (error) {
      console.error('Failed to initialize game:', error);
      toast({
        title: "Error",
        description: "Failed to initialize game. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const handleGameMessage = (message: ChatEntry, updatedGameState: GameState) => {
      setGameState(updatedGameState);
      if (message.role === 'game_master') {
        toast({
          title: "Game Master",
          description: message.content,
        });
      }
    };

    messageBus.subscribe('game_engine', handleGameMessage);
    return () => {
      messageBus.unsubscribe('game_engine', handleGameMessage);
    };
  }, [toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [gameState?.events]);

  const handleChatSubmit = async () => {
    if (!gameState || !chatInput.trim()) return;

    const chatAction: GameAction = {
      type: 'chat',
      playerId: 'user',
      details: { message: chatInput.trim() }
    };

    try {
      await gameEngine.processAction(chatAction);
      setChatInput('');
    } catch (error) {
      console.error('Error processing chat action:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleActionSubmit = async () => {
    if (!gameState || !selectedAction || !actionDetails) return;

    const action: GameAction = {
      type: selectedAction,
      playerId: 'user',
      details: actionDetails
    };

    try {
      await gameEngine.processAction(action);
      setSelectedAction(null);
      setActionDetails(null);
    } catch (error) {
      console.error('Error processing action:', error);
      toast({
        title: "Error",
        description: "Failed to perform action. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderChatLog = () => (
    <ScrollArea className={`${styles.gameLog} h-[300px]`} ref={scrollAreaRef}>
      {gameState?.events.map((event, index) => {
        const [speaker, ...messageParts] = event.split(':');
        const message = messageParts.join(':').trim();
        const avatar = characterAvatars[speaker.toLowerCase()] || '/svgs/default-character.svg';

        return (
          <div key={index} className={`${styles.logEntry} flex items-start mb-2`}>
            <Avatar className="w-8 h-8 mr-2">
              <AvatarImage src={avatar} alt={speaker} />
              <AvatarFallback>{speaker[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className={`${styles.logMessage} flex-1`}>
              <span className="font-semibold">{speaker}: </span>
              {message}
            </div>
          </div>
        );
      })}
    </ScrollArea>
  );

  const renderActionSelector = () => (
    <div className={styles.actionInput}>
      <Select onValueChange={(value) => setSelectedAction(value as GameAction['type'])}>
        <SelectTrigger>
          <SelectValue placeholder="Select an action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="move">Move</SelectItem>
          <SelectItem value="search">Search</SelectItem>
          <SelectItem value="examine">Examine</SelectItem>
          <SelectItem value="accuse">Accuse</SelectItem>
        </SelectContent>
      </Select>
      {selectedAction === 'move' && (
        <Select onValueChange={(value) => setActionDetails({ direction: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="north">North</SelectItem>
            <SelectItem value="south">South</SelectItem>
            <SelectItem value="east">East</SelectItem>
            <SelectItem value="west">West</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button onClick={handleActionSubmit} disabled={!selectedAction || !actionDetails}>
        Perform Action
      </Button>
    </div>
  );

  const renderGameGrid = () => {
    if (!gameState || !gameState.mansion || !gameState.mansion.layout) return null;

    return (
      <div className={styles.gameGrid}>
        {gameState.mansion.layout.flat().map((roomId, index) => {
          const room = gameState.mansion.rooms.find(r => r.id === roomId);
          const player = gameState.players.find(p => 
            p.position.x === index % GRID_SIZE && p.position.y === Math.floor(index / GRID_SIZE)
          );

          return (
            <div key={index} className={styles.gridCell}>
              {room && (
                <Image
                  src={roomSvgs[room.name] || '/rooms/default.svg'}
                  alt={room.name}
                  width={60}
                  height={60}
                  style={{ objectFit: "cover" }}
                />
              )}
              {player && (
                <div className={styles.playerIcon}>
                  <Image
                    src={characterAvatars[player.id] || '/svgs/default-character.svg'}
                    alt={player.name}
                    width={48}
                    height={48}
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`${styles.initializationContainer} flex flex-col items-center justify-center`}>
        <p className="text-xl mb-4">Loading game<LoadingDots /></p>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  if (!gameState) {
    return <div className={styles.initializationContainer}>Error: Unable to load game state. Please refresh the page.</div>;
  }

  return (
    <Card className={styles.gameContainer}>
      <CardHeader>
        <CardTitle className={styles.gameTitle}>Murder Mystery in the Haunted Mansion</CardTitle>
      </CardHeader>
      <CardContent>
        {renderGameGrid()}
        <div className={styles.gameInfo}>
          <p>Current Turn: {gameState.currentTurn}</p>
          <p>Game Phase: {gameState.gamePhase}</p>
          <p>Turn Count: {gameState.turnCount}</p>
        </div>
        {renderChatLog()}
        <div className={styles.actionInput}>
          <Input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
          />
          <Button onClick={handleChatSubmit}>Send</Button>
        </div>
        {renderActionSelector()}
      </CardContent>
    </Card>
  );
};

export default GroupMMG;