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
  'Nursery': '/rooms/nursery.svg',
  'Grand Ballroom': '/rooms/grand-ballroom.svg',
  'Greenhouse': '/rooms/greenhouse.svg',
  'Music Room': '/rooms/music-room.svg',
};

interface MurderMysteryGameProps {
  onRoomChange: (newRoom: string) => void;
}

const MurderMysteryGame: React.FC<MurderMysteryGameProps> = ({ onRoomChange }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedAction, setSelectedAction] = useState<GameAction['type'] | null>(null);
  const [actionDetails, setActionDetails] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
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
      setGameState(gameEngine.getState());
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    messageBus.subscribe('user', handleGameMessage);
    return () => {
      messageBus.unsubscribe('user', handleGameMessage);
    };
  }, []);

  useEffect(() => {
    if (gameState) {
      messageBus.updateGameState(gameState);
    }
  }, [gameState]);

  const handleGameMessage = useCallback((message: ChatEntry, gameState: GameState) => {
    setGameState(gameState);
    if (message.role === 'game_master') {
      toast({
        title: "Game Master",
        description: message.content,
      });
    }
  }, [toast]);

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
      setGameState(updatedState);

      messageBus.publish({
        role: 'user',
        content: JSON.stringify(action),
        agentId: 'user',
      });

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

  const handleActionSelect = (value: GameAction['type']) => {
    setSelectedAction(value);
    setActionDetails(null);
  };

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
              <SelectValue placeholder="Select item to examine" />
            </SelectTrigger>
            <SelectContent>
              {currentRoom?.items.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'pickup':
        return (
          <Select onValueChange={(value) => setActionDetails({ itemId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select item to pick up" />
            </SelectTrigger>
            <SelectContent>
              {currentRoom?.items.filter(item => item.canPickUp).map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'drop':
        return (
          <Select onValueChange={(value) => setActionDetails({ itemId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select item to drop" />
            </SelectTrigger>
            <SelectContent>
              {userPlayer.inventory.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'use_item':
        return (
          <Select onValueChange={(value) => setActionDetails({ itemId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select item to use" />
            </SelectTrigger>
            <SelectContent>
              {userPlayer.inventory.filter(item => item.useAction).map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'accuse':
        return (
          <>
            <Select onValueChange={(value) => setActionDetails((prev: any) => ({ ...prev, suspectId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select suspect" />
              </SelectTrigger>
              <SelectContent>
                {gameState.players.filter(p => p.role !== 'user').map(player => (
                  <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setActionDetails((prev: any) => ({ ...prev, weaponId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select weapon" />
              </SelectTrigger>
              <SelectContent>
                {/* Populate with available weapons */}
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => setActionDetails((prev: any) => ({ ...prev, locationId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {gameState.mansion.rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        );
      default:
        return null;
    }
  };

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

  const renderGameInstructions = () => (
    <Accordion type="single" collapsible className="mb-4">
      <AccordionItem value="instructions">
        <AccordionTrigger>How to Play</AccordionTrigger>
        <AccordionContent>
          <ol className="list-decimal pl-5">
            <li>Use the chat to communicate with other characters and gather information.</li>
            <li>Select specific actions from the "Actions" tab to interact with the environment.</li>
            <li>Move around the mansion, search for clues, and examine objects.</li>
            <li>Use the items you find and keep track of the information you gather.</li>
            <li>Make an accusation when you think you've solved the mystery.</li>
          </ol>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

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
        {renderGameInstructions()}
        {renderGameGrid()}
        <div className={styles.gameInfo}>
          <p>Current Turn: {gameState.currentTurn}</p>
          <p>Game Phase: {gameState.gamePhase}</p>
          <p>Turn Count: {gameState.turnCount}</p>
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
              />
              <Button onClick={handleChatSubmit}>Send</Button>
            </div>
          </TabsContent>
          <TabsContent value="actions">
            <div className={styles.actionInput}>
              <Select onValueChange={handleActionSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move">Move</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="examine">Examine</SelectItem>
                  <SelectItem value="pickup">Pick Up</SelectItem>
                  <SelectItem value="drop">Drop</SelectItem>
                  <SelectItem value="use_item">Use Item</SelectItem>
                  <SelectItem value="accuse">Accuse</SelectItem>
                </SelectContent>
              </Select>
              {selectedAction && renderActionDetails()}
              <Button onClick={handleActionSubmit} disabled={!selectedAction || !actionDetails}>
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