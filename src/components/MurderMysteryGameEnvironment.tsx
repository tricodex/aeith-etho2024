// src/components/MurderMysteryGameEnvironment.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import MurderMysteryGame from './MurderMysteryGame';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { gameEngine } from '@/utils/game-engine/gameEngine';
import { GameState, ChatEntry } from '@/types/gameTypes';
import { messageBus } from '@/utils/MessageBus';
import styles from '@/styles/MurderMystery.module.css';

const MurderMysteryGameEnvironment: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<string>('Entrance Hall');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleRoomChange = useCallback((newRoom: string) => {
    setCurrentRoom(newRoom);
  }, []);

  const initializeGame = useCallback(async () => {
    setIsLoading(true);
    try {
      await gameEngine.initializeGame();
      const initialState = gameEngine.getState();
      setGameState(initialState);
      toast({
        title: "Game Initialized",
        description: "Welcome to the Haunted Mansion! The mystery awaits...",
      });
    } catch (error) {
      console.error('Failed to initialize game:', error);
      toast({
        title: "Error",
        description: "Failed to initialize game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const handleGameUpdate = (message: ChatEntry, updatedState: GameState) => {
      setGameState(updatedState);
    };

    messageBus.subscribe('game_environment', handleGameUpdate);

    return () => {
      messageBus.unsubscribe('game_environment', handleGameUpdate);
    };
  }, []);

  useEffect(() => {
    if (gameState) {
      const userPlayer = gameState.players.find(p => p.role === 'user');
      if (userPlayer) {
        const currentRoom = gameState.mansion.rooms.find(r =>
          r.id === gameState.mansion.layout[userPlayer.position.y]?.[userPlayer.position.x]
        );
        if (currentRoom) {
          setCurrentRoom(currentRoom.name);
        }
      }
    }
  }, [gameState]);

  return (
    <div className={styles.gameEnvironmentContainer}>
      {!gameState ? (
        <Card className={styles.initializationContainer}>
          <CardHeader>
            <CardTitle className={styles.gameTitle}>Murder Mystery in the Haunted Mansion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.gameDescription}>
              Step into the Haunted Mansion and solve the murder mystery. Will you
              uncover the truth, or will the culprit remain hidden?
            </p>
            <Button
              onClick={initializeGame}
              className={styles.startButton}
              disabled={isLoading}
            >
              {isLoading ? 'Initializing...' : 'Start Game'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={styles.gameContainer}>
          <Card className={styles.gameHeader}>
            <CardHeader>
              <CardTitle>Current Room: {currentRoom}</CardTitle>
            </CardHeader>
          </Card>
          <MurderMysteryGame onRoomChange={handleRoomChange} />
        </div>
      )}
    </div>
  );
};

export default MurderMysteryGameEnvironment;