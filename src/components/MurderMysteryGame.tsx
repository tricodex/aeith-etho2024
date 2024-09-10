// src/components/MurderMysteryGame.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { gameEngine } from '@/utils/game-engine/gameEngine';
import { GameState, GameAction, Player, ChatEntry } from '@/types/gameTypes';
import { messageBus } from '@/utils/MessageBus';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from '@/styles/MurderMystery.module.css';

const GRID_SIZE = 10;
const CELL_SIZE = 60; // in pixels

// Character SVGs for displaying different player icons
const characterSvgs: Record<string, string> = {
  'blue-fish': '/svgs/blue-fish.svg',
  'orange-crab': '/svgs/orange-crab.svg',
  'green-turtle': '/svgs/green-turtle.svg',
  'red-donkey': '/svgs/red-donkey.svg',
  'user': '/svgs/user.svg',
};

// Room SVGs for different rooms in the mansion
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
  'Nursery': '/rooms/nursery.svg',
  'Grand Ballroom': '/rooms/grand-ballroom.svg',
  'Greenhouse': '/rooms/greenhouse.svg',
  'Music Room': '/rooms/music-room.svg',
};

interface MurderMysteryGameProps {
  onRoomChange: (newRoom: string) => void;
}

const MurderMysteryGame: React.FC<MurderMysteryGameProps> = ({ onRoomChange }) => {
  // Define state variables for the component
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedAction, setSelectedAction] = useState<GameAction['type'] | null>(null);
  const [actionDetails, setActionDetails] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [hasChatted, setHasChatted] = useState(false);
  const [hasActed, setHasActed] = useState(false);

  // Initialize the game when the component is mounted
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
      setGameState(gameEngine.getState());
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // useEffect to initialize the game when the component first renders
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Subscribe to game updates using the message bus
  useEffect(() => {
    if (gameState) {
      messageBus.updateGameState(gameState);
    }
  }, [gameState]);

  // Listen for updates from the message bus and update the game state
  useEffect(() => {
    const handleGameMessage = (message: ChatEntry, updatedGameState: GameState) => {
      setGameState(updatedGameState);
      if (message.role === 'game_master') {
        toast({
          title: "Game Master",
          description: message.content,
        });
      }
      if (updatedGameState.currentTurn === 'user') {
        setHasChatted(false);
        setHasActed(false);
      }
    };

    messageBus.subscribe('game_engine', handleGameMessage);
    return () => {
      messageBus.unsubscribe('game_engine', handleGameMessage);
    };
  }, [toast]);

  // Update room info based on user's position in the game state
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

  // Handle user actions during the game (move, search, examine, etc.)
  const handleUserAction = useCallback(async (action: GameAction) => {
    if (!gameState) return;

    try {
      if (gameState.currentTurn === 'user') {
        const updatedState = await gameEngine.processAction(action);
        setGameState(updatedState);

        if (action.type === 'chat') {
          setHasChatted(true);
        } else {
          setHasActed(true);
        }

        // End the user's turn after both chat and action are completed
        if (hasChatted && hasActed) {
          await gameEngine.endTurn();
          setHasChatted(false);
          setHasActed(false);
        }

        // Check if the game is over
        if (gameEngine.isGameOver()) {
          toast({
            title: "Game Over",
            description: "The mystery has been solved!",
          });
        }
      } else {
        toast({
          title: "Not Your Turn",
          description: "Please wait for your turn to take an action.",
          variant: "destructive",
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
  }, [gameState, hasChatted, hasActed, toast]);

  // Action selection handler
  const handleActionSelect = (value: GameAction['type']) => {
    setSelectedAction(value);
    setActionDetails(null);
  };

  // Chat submission handler
  const handleChatSubmit = () => {
    if (chatInput.trim()) {
      const chatAction: GameAction = {
        type: 'chat',
        playerId: 'user',
        details: { message: chatInput.trim() }
      };
      handleUserAction(chatAction);
      setChatInput('');
    }
  };

  // Action submission handler
  const handleActionSubmit = () => {
    if (selectedAction && actionDetails) {
      const action: GameAction = {
        type: selectedAction,
        playerId: 'user',
        details: actionDetails
      };
      handleUserAction(action);
      setSelectedAction(null);
      setActionDetails(null);
    }
  };

  // Render details for the selected action
  const renderActionDetails = () => {
    if (!gameState) return null;

    const userPlayer = gameState.players.find(p => p.role === 'user') as Player;
    const currentRoom = gameState.mansion.rooms.find(r => r.id === gameState.mansion.layout[userPlayer.position.y][userPlayer.position.x]);

    switch (selectedAction) {
      case 'move':
        return (
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
        );
      case 'search':
        return <Button onClick={() => setActionDetails({ roomId: currentRoom?.id })}>Search Room</Button>;
      case 'examine':
        return (
          <Select onValueChange={(value) => setActionDetails({ targetId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select target to examine" />
            </SelectTrigger>
            <SelectContent>
              {currentRoom?.items.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
              {gameState.players.filter(p => p.position.x === userPlayer.position.x && p.position.y === userPlayer.position.y && p.id !== userPlayer.id).map(player => (
                <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  // Render the game grid showing rooms and players
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
                </div>)}
            </div>
          );
        })}
      </div>
    );
  }, [gameState]);

  // Render game instructions for the user
  const renderGameInstructions = () => (
    <Accordion type="single" collapsible className="mb-4">
      <AccordionItem value="instructions">
        <AccordionTrigger>How to Play</AccordionTrigger>
        <AccordionContent>
          <ol className="list-decimal pl-5">
            <li>Use the chat to communicate with other characters and gather information.</li>
            <li>Select specific actions from the "Actions" tab to interact with the environment.</li>
            <li>Move around the mansion, search for clues, and examine objects or characters.</li>
            <li>Keep track of the information you gather to solve the mystery.</li>
            <li>Your turn consists of one chat action and one game action.</li>
          </ol>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // Render the chat log showing conversation history
  const renderChatLog = () => (
    <ScrollArea className={`${styles.gameLog} h-[300px]`}>
      {gameState?.events.map((event, index) => (
        <div key={index} className={`${styles.logEntry} flex items-start mb-2`}>
          <Avatar className="w-8 h-8 mr-2">
            <AvatarImage src={event.startsWith('Game Master:') ? '/svgs/game-master.svg' : '/svgs/user.svg'} />
            <AvatarFallback>{event.startsWith('Game Master:') ? 'GM' : 'U'}</AvatarFallback>
          </Avatar>
          <div className={`${styles.logMessage} flex-1`}>{event}</div>
        </div>
      ))}
    </ScrollArea>
  );

  // Render loading state
  if (isLoading) {
    return <div>Loading game...</div>;
  }

  // Render error state if game fails to load
  if (!gameState || !gameState.mansion || !gameState.mansion.layout) {
    return <div>Error: Unable to load game state. Please refresh the page.</div>;
  }

  // Render the main game UI
  return (
    <Card className={styles.gameContainer}>
      <CardHeader>
        <CardTitle className={styles.gameTitle}>Murder Mystery in the Haunted Mansion</CardTitle>
      </CardHeader>
      <CardContent>
        {renderGameInstructions()}
        {renderGameGrid()}
        <div className={styles.gameInfo}>
          <p>Current Turn: {gameState.currentTurn}</p>
          <p>Game Phase: {gameState.gamePhase}</p>
          <p>Turn Count: {gameState.turnCount}</p>
          {gameState.currentTurn === 'user' && (
            <>
              <p>Chat Action: {hasChatted ? 'Completed' : 'Pending'}</p>
              <p>Game Action: {hasActed ? 'Completed' : 'Pending'}</p>
            </>
          )}
        </div>
        {renderChatLog()}
        <Tabs defaultValue="chat" className="w-full">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <div className={styles.chatInput}>
              <Input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                disabled={gameState.currentTurn !== 'user' || hasChatted}
              />
              <Button onClick={handleChatSubmit} disabled={gameState.currentTurn !== 'user' || hasChatted}>
                Send
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="actions">
            <div className={styles.actionInput}>
              <Select onValueChange={handleActionSelect} disabled={gameState.currentTurn !== 'user' || hasActed}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move">Move</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="examine">Examine</SelectItem>
                </SelectContent>
              </Select>
              {selectedAction && renderActionDetails()}
              <Button 
                onClick={handleActionSubmit} 
                disabled={gameState.currentTurn !== 'user' || hasActed || !selectedAction || !actionDetails}
              >
                Submit Action
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MurderMysteryGame;