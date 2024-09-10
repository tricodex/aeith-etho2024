'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AeithGameEngine, GameState, Player } from '@/game/AeithGameEngine';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Search, Eye, AlertTriangle, Move } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import styles from '@/styles/MurderMystery.module.css';

const playerColors = {
  'blue-fish': 'bg-blue-500 text-white',
  'orange-crab': 'bg-orange-500 text-white',
  'green-turtle': 'bg-green-500 text-white',
  'red-donkey': 'bg-red-500 text-white',
  'user': 'bg-purple-500 text-white',
};

const actionIcons = {
  move: <Move size={24} />,
  search: <Search size={24} />,
  examine: <Eye size={24} />,
  accuse: <AlertTriangle size={24} />,
};

const AeithGame = () => {
  const [gameEngine, setGameEngine] = useState<AeithGameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string; agentId?: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAction, setSelectedAction] = useState<'move' | 'search' | 'examine' | 'accuse'>('move');
  const [actionTarget, setActionTarget] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const initGame = async () => {
    setIsLoading(true);
    const engine = new AeithGameEngine();
    await engine.initializeChat();
    setGameEngine(engine);
    setGameState(engine.getGameState());
    setGameStarted(true);
    setIsLoading(false);
  };

  const updateChatHistory = useCallback(async () => {
    if (gameEngine && gameState) {
      const allHistory = await Promise.all(
        gameState.players.filter(player => player.id !== 'user').map(async (player) => {
          const history = await gameEngine.getChatHistory(player.id);
          return history.map(msg => ({ ...msg, agentId: player.id }));
        })
      );
      setChatHistory(prevHistory => [
        ...prevHistory,
        ...allHistory.flat().sort((a, b) => a.timestamp - b.timestamp)
      ]);
    }
  }, [gameEngine, gameState]);

  useEffect(() => {
    if (gameStarted) {
      updateChatHistory();
    }
  }, [updateChatHistory, gameStarted]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !gameEngine || !gameState) return;
    
    setIsLoading(true);
    try {
      const result = await gameEngine.performAction('user', selectedAction, actionTarget || inputMessage);
      setChatHistory(prev => [...prev, { role: 'user', content: inputMessage, agentId: 'user' }, { role: 'system', content: result }]);
      setGameState(gameEngine.getGameState());
      setInputMessage('');
      setActionTarget('');
      await updateChatHistory();
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderGameGrid = () => {
    if (!gameState) return null;

    return (
      <div className="grid grid-cols-10 gap-1 bg-blue-900 p-2 rounded-lg">
        {gameState.rooms.map((row, y) =>
          row.map((room, x) => (
            <TooltipProvider key={`${x}-${y}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-16 h-16 bg-blue-800 flex items-center justify-center rounded-md relative hover:bg-blue-700 transition-colors">
                    {room.items.length > 0 && (
                      <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-500 rounded-full"></div>
                    )}
                    {gameState.players.filter(p => p.position[0] === x && p.position[1] === y).map(player => (
                      <Avatar key={player.id} className="w-12 h-12 border-2 border-white">
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback>{player.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold">{room.name}</p>
                  <p>{room.items.length > 0 ? `Items: ${room.items.join(', ')}` : 'No items'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))
        )}
      </div>
    );
  };

  const renderPlayerInfo = (player: Player) => (
    <div key={player.id} className={`flex items-center space-x-2 p-3 rounded-md ${playerColors[player.id as keyof typeof playerColors]} shadow-md`}>
      <Avatar className="w-12 h-12 border-2 border-white">
        <AvatarImage src={player.avatar} alt={player.name} />
        <AvatarFallback>{player.name[0]}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-lg">{player.name}</p>
        <p className="text-sm">Items: {player.inventory.join(', ') || 'None'}</p>
      </div>
    </div>
  );

  if (!gameStarted) {
    return (
        <div className={styles.initializationContainer}>
        <h1 className={styles.gameTitle}>Aeith Murder Mystery Game</h1>
        <p className={styles.gameDescription}>Welcome to the Aeith Murder Mystery Game! Investigate the haunted mansion, interact with AI characters, and solve the mystery.</p>
        <Button onClick={initGame} disabled={isLoading} className={styles.startButton}>
          {isLoading ? 'Initializing...' : 'Start Game'}
        </Button>
      </div>
    );
  }

  if (!gameState) {
    return <div className="flex items-center justify-center h-screen bg-blue-900 text-white">Loading game...</div>;
  }

  return (
    <div className="container mx-auto p-4 bg-blue-900 text-white min-h-screen">
      <Card className="w-full mx-auto bg-blue-800 shadow-xl text-white">
        <CardHeader className="bg-gradient-to-r from-blue-900 to-purple-900">
          <CardTitle className="text-3xl font-bold">Aeith Murder Mystery Game</CardTitle>
          <p className="text-xl">Phase: {gameState.phase} | Turn: {gameState.turnCount} | Current Player: {gameState.players.find(p => p.id === gameState.currentTurn)?.name}</p>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-3">
              {renderGameGrid()}
              <div className="mt-4 flex space-x-2">
                <Select onValueChange={(value: any) => setSelectedAction(value)}>
                  <SelectTrigger className="w-[180px] bg-blue-700 text-white">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-blue-700 text-white">
                    {Object.entries(actionIcons).map(([action, icon]) => (
                      <SelectItem key={action} value={action}>
                        <div className="flex items-center">
                          {icon}
                          <span className="ml-2">{action.charAt(0).toUpperCase() + action.slice(1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAction === 'move' && (
                  <Select onValueChange={setActionTarget}>
                    <SelectTrigger className="w-[180px] bg-blue-700 text-white">
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent className="bg-blue-700 text-white">
                      <SelectItem value="north">North</SelectItem>
                      <SelectItem value="south">South</SelectItem>
                      <SelectItem value="east">East</SelectItem>
                      <SelectItem value="west">West</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="text"
                  placeholder={selectedAction === 'examine' ? 'Item to examine' : selectedAction === 'accuse' ? 'Make your accusation' : 'Chat message...'}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-grow bg-blue-700 text-white placeholder-blue-300"
                />
                <Button onClick={handleSendMessage} disabled={isLoading} className="bg-red-500 hover:bg-red-600 text-white px-6">
                  {isLoading ? 'Processing...' : 'Send'}
                </Button>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-blue-700 p-4 rounded-lg shadow">
                <h3 className="text-2xl font-semibold mb-3">Players</h3>
                <div className="space-y-3">
                  {gameState.players.map(renderPlayerInfo)}
                </div>
              </div>
              <div className="bg-blue-700 p-4 rounded-lg shadow">
                <h3 className="text-2xl font-semibold mb-3">Clues Found</h3>
                <ul className="list-disc list-inside space-y-1">
                  {gameState.cluesFound.map((clue, index) => (
                    <li key={index}>{clue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <ScrollArea className="h-[300px] mt-6 pr-4 bg-blue-700 rounded-lg shadow-inner p-4 border border-blue-500">
            {chatHistory.map((msg, index) => {
              const player = gameState.players.find(p => p.id === msg.agentId);
              return (
                <div key={index} className={`mb-3 p-3 rounded-lg ${playerColors[msg.agentId as keyof typeof playerColors] || 'bg-blue-600'} shadow`}>
                  <div className="flex items-center space-x-2 mb-1">
                    {player && (
                      <Avatar className="w-8 h-8 border-2 border-white">
                        <AvatarImage src={player.avatar} alt={player.name} />
                        <AvatarFallback>{player.name[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <strong className="text-lg">{player ? player.name : msg.role}: </strong>
                  </div>
                  <div className="ml-10 text-white">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AeithGame;