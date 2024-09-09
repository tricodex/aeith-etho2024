// src/components/MurderMysteryGame.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { gameEngine } from '@/utils/gameEngine';
import { GameState, GameAction } from '@/types/gameTypes';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import styles from '@/styles/MurderMystery.module.css';

const GRID_SIZE = 10;
const CELL_SIZE = 60; // in pixels

const characterSvgs: Record<string, string> = {
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

interface MurderMysteryGameProps {
  onRoomChange: (newRoom: string) => void;
}

const MurderMysteryGame: React.FC<MurderMysteryGameProps> = ({ onRoomChange }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const initGame = useCallback(async () => {
    setIsLoading(true);
    try {
      await gameEngine.initializeGame();
      const initialState = gameEngine.getState();
      if (!initialState || !initialState.mansion || !initialState.mansion.layout) {
        throw new Error('Invalid game state');
      }
      setGameState(initialState);
    } catch (error) {
      console.error('Failed to initialize game:', error);
      toast({
        title: "Error",
        description: "Failed to initialize game. Please refresh the page.",
        variant: "destructive",
      });
      // Fallback to a default state
      setGameState(gameEngine.createDefaultGameState());
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (gameState && gameState.mansion && gameState.mansion.layout) {
      const userPlayer = gameState.players.find(p => p.role === 'user');
      if (userPlayer) {
        const currentRoom = gameState.mansion.rooms.find(r => 
          r.id === gameState.mansion.layout[userPlayer.position.y]?.[userPlayer.position.x]
        );
        if (currentRoom) {
          onRoomChange(currentRoom.name);
        } else {
          console.error('Invalid room position for user');
          onRoomChange('Unknown Room');
        }
      } else {
        console.error('User player not found in game state');
        onRoomChange('Unknown Room');
      }
    }
  }, [gameState, onRoomChange]);

  const handleUserAction = useCallback(async (action: GameAction) => {
    if (!gameState) return;

    try {
      const updatedState = await gameEngine.processAction(action);
      if (!updatedState || !updatedState.mansion || !updatedState.mansion.layout) {
        throw new Error('Invalid game state after action');
      }
      setGameState(updatedState);

      if (gameEngine.isGameOver()) {
        toast({
          title: "Game Over",
          description: "The mystery has been solved!",
        });
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast({
        title: "Error",
        description: "Failed to process action. Please try again.",
        variant: "destructive",
      });
    }
  }, [gameState, toast]);

  const handleInputSubmit = useCallback(() => {
    if (!gameState || !userInput.trim()) return;

    const [action, ...args] = userInput.toLowerCase().split(' ');
    let gameAction: GameAction;

    try {
      switch (action) {
        case 'move':
          const direction = args[0];
          const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
          const dy = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
          gameAction = { type: 'move', playerId: 'user', details: { dx, dy } };
          break;
        case 'search':
          gameAction = { type: 'search', playerId: 'user', details: {} };
          break;
        case 'accuse':
          if (args.length < 3) {
            throw new Error("Accusation requires suspect, weapon, and location.");
          }
          const [suspectId, weaponId, locationId] = args;
          gameAction = { type: 'accuse', playerId: 'user', details: { suspectId, weaponId, locationId } };
          break;
        case 'use':
          if (args.length < 1) {
            throw new Error("Use action requires an item ID.");
          }
          gameAction = { type: 'use_item', playerId: 'user', details: { itemId: args.join(' ') } };
          break;
        case 'pickup':
          if (args.length < 1) {
            throw new Error("Pickup action requires an item ID.");
          }
          gameAction = { type: 'pickup', playerId: 'user', details: { itemId: args.join(' ') } };
          break;
        case 'drop':
          if (args.length < 1) {
            throw new Error("Drop action requires an item ID.");
          }
          gameAction = { type: 'drop', playerId: 'user', details: { itemId: args.join(' ') } };
          break;
        case 'examine':
          if (args.length < 1) {
            throw new Error("Examine action requires a target ID.");
          }
          gameAction = { type: 'examine', playerId: 'user', details: { targetId: args.join(' ') } };
          break;
        default:
          gameAction = { type: 'chat', playerId: 'user', details: { message: userInput } };
      }

      handleUserAction(gameAction);
      setUserInput('');
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Invalid Action",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }, [userInput, gameState, handleUserAction, toast]);

  const renderGameGrid = useCallback(() => {
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
                  width={CELL_SIZE}
                    height={CELL_SIZE}
                  // fill={true} 
                  style={{ objectFit: "cover" }}
                />
              )}
              {player && (
                <div className={styles.playerIcon}>
                  <Image
                    src={characterSvgs[player.id] || '/svgs/default-character.svg'}
                    alt={player.name}
                    width={CELL_SIZE * 0.8}
                    height={CELL_SIZE * 0.8}
                    style={{ objectFit: "cover" }}

                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [gameState]);

  if (isLoading) {
    return <div>Loading game...</div>;
  }

  if (!gameState || !gameState.mansion || !gameState.mansion.layout) {
    return <div>Error: Unable to load game state. Please refresh the page.</div>;
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
        <ScrollArea className={styles.gameLog}>
          {gameState.events.map((event, index) => (
            <div key={index} className={styles.logEntry}>{event}</div>
          ))}
        </ScrollArea>
        <div className={styles.actionInput}>
          <Input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your action..."
            onKeyPress={(e) => e.key === 'Enter' && handleInputSubmit()}
          />
          <Button onClick={handleInputSubmit}>Submit Action</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MurderMysteryGame;