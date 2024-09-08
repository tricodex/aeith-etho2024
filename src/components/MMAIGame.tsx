// 'use client';

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import Image from 'next/image';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { useToast } from "@/hooks/use-toast";
// import { useAgentGrab } from '@/hooks/useAgentGrab';

// // Game constants
// const characters = ["blue-fish", "orange-crab", "green-turtle", "red-donkey"];
// const initialPositions = {
//   "blue-fish": { x: 0, y: 0 },
//   "orange-crab": { x: 9, y: 0 },
//   "green-turtle": { x: 0, y: 9 },
//   "red-donkey": { x: 9, y: 9 },
// };

// const roomNames = [
//   "Foyer", "Living Room", "Dining Room", "Kitchen", "Library",
//   "Study", "Master Bedroom", "Guest Bedroom", "Bathroom", "Attic"
// ];

// interface Position {
//   x: number;
//   y: number;
// }

// interface GameState {
//   positions: Record<string, Position>;
//   currentTurn: string;
//   gamePhase: 'setup' | 'investigation' | 'accusation' | 'end';
//   cluesFound: string[];
//   murderDetails: {
//     victim: string;
//     weapon: string;
//     location: string;
//   } | null;
// }

// const MMAIGame: React.FC = () => {
//   const [gameState, setGameState] = useState<GameState>({
//     positions: initialPositions,
//     currentTurn: "blue-fish",
//     gamePhase: 'setup',
//     cluesFound: [],
//     murderDetails: null,
//   });
//   const [gameMasterResponse, setGameMasterResponse] = useState("");
//   const [chatInput, setChatInput] = useState("");
//   const [gameLog, setGameLog] = useState<string[]>([]);
//   const scrollAreaRef = useRef<HTMLDivElement>(null);
//   const { addMessage } = useAgentGrab();
//   const { toast } = useToast();

//   const generateRoomName = (x: number, y: number): string => {
//     const index = (y * 3 + Math.floor(x / 3.34)) % roomNames.length;
//     return roomNames[index];
//   };

//   const moveCharacter = (character: string, direction: 'up' | 'down' | 'left' | 'right') => {
//     setGameState((prev) => {
//       const newPos = { ...prev.positions[character] };
//       if (direction === "up") newPos.y = Math.max(0, newPos.y - 1);
//       if (direction === "down") newPos.y = Math.min(9, newPos.y + 1);
//       if (direction === "left") newPos.x = Math.max(0, newPos.x - 1);
//       if (direction === "right") newPos.x = Math.min(9, newPos.x + 1);

//       const newGameState = {
//         ...prev,
//         positions: { ...prev.positions, [character]: newPos },
//         currentTurn: nextTurn(prev.currentTurn),
//       };

//       const roomName = generateRoomName(newPos.x, newPos.y);
//       addToGameLog(`${character} moved to ${roomName} at (${newPos.x}, ${newPos.y})`);

//       return newGameState;
//     });
//   };

//   const nextTurn = (current: string): string => {
//     const idx = characters.indexOf(current);
//     return characters[(idx + 1) % characters.length];
//   };

//   const addToGameLog = (message: string) => {
//     setGameLog((prev) => [...prev, message]);
//   };

//   const generateGameStateDescription = useCallback((): string => {
//     return characters.map((char) => {
//       const pos = gameState.positions[char];
//       const room = generateRoomName(pos.x, pos.y);
//       return `${char} is in the ${room} at (${pos.x}, ${pos.y})`;
//     }).join(". ");
//   }, [gameState.positions]);

//   const fetchGameMasterResponse = useCallback(async () => {
//     try {
//       const response = await fetch('/api/game-master', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           scenario: `Murder mystery in a haunted mansion. Game phase: ${gameState.gamePhase}. ${generateGameStateDescription()}. Clues found: ${gameState.cluesFound.join(", ")}.`
//         }),
//       });
//       const data = await response.json();
//       setGameMasterResponse(data.scenario);
//       addToGameLog("Game Master: " + data.scenario);
//     } catch (error) {
//       console.error('Error communicating with the game master:', error);
//       toast({
//         title: "Error",
//         description: "Failed to communicate with the Game Master.",
//         variant: "destructive",
//       });
//     }
//   }, [gameState, generateGameStateDescription, toast]);

//   useEffect(() => {
//     fetchGameMasterResponse();
//   }, [fetchGameMasterResponse]);

//   const handleChatSubmit = async () => {
//     if (!chatInput.trim()) return;
//     try {
//       addToGameLog(`Player: ${chatInput}`);
//       await addMessage(chatInput, gameState.currentTurn);
//       setChatInput("");
//       fetchGameMasterResponse();
//     } catch (error) {
//       console.error('Error sending message:', error);
//       toast({
//         title: "Error",
//         description: "Failed to send message to the Game Master.",
//         variant: "destructive",
//       });
//     }
//   };

//   useEffect(() => {
//     if (scrollAreaRef.current) {
//       scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
//     }
//   }, [gameLog]);

//   const renderGameGrid = () => {
//     return (
//       <div className="game-grid grid grid-cols-10 gap-1 mb-4">
//         {Array.from({ length: 100 }).map((_, index) => {
//           const x = index % 10;
//           const y = Math.floor(index / 10);
//           const character = Object.entries(gameState.positions).find(
//             ([_, pos]) => pos.x === x && pos.y === y
//           );
//           return (
//             <div
//               key={index}
//               className="w-12 h-12 bg-gray-200 flex items-center justify-center relative"
//             >
//               {character && (
//                 <Image
//                   src={`/svgs/${character[0]}.svg`}
//                   alt={character[0]}
//                   width={40}
//                   height={40}
//                 />
//               )}
//               <span className="absolute bottom-0 right-0 text-xs">
//                 {x},{y}
//               </span>
//             </div>
//           );
//         })}
//       </div>
//     );
//   };

//   return (
//     <Card className="w-full max-w-4xl mx-auto">
//       <CardHeader>
//         <CardTitle>Murder Mystery AI Game</CardTitle>
//       </CardHeader>
//       <CardContent>
//         {renderGameGrid()}

//         <div className="game-info mb-4">
//           <h3 className="text-lg font-semibold">Current Turn: {gameState.currentTurn}</h3>
//           <p>Game Phase: {gameState.gamePhase}</p>
//           <p>Clues Found: {gameState.cluesFound.join(", ") || "None"}</p>
//         </div>

//         <div className="controls flex space-x-2 mb-4">
//           <Button onClick={() => moveCharacter(gameState.currentTurn, "up")}>Move Up</Button>
//           <Button onClick={() => moveCharacter(gameState.currentTurn, "down")}>Move Down</Button>
//           <Button onClick={() => moveCharacter(gameState.currentTurn, "left")}>Move Left</Button>
//           <Button onClick={() => moveCharacter(gameState.currentTurn, "right")}>Move Right</Button>
//         </div>

//         <ScrollArea className="h-[200px] mb-4">
//           <div ref={scrollAreaRef}>
//             {gameLog.map((log, index) => (
//               <p key={index} className="mb-1">{log}</p>
//             ))}
//           </div>
//         </ScrollArea>

//         <div className="chat-input flex space-x-2">
//           <Input
//             value={chatInput}
//             onChange={(e) => setChatInput(e.target.value)}
//             placeholder="Type your message or action..."
//             onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
//           />
//           <Button onClick={handleChatSubmit}>Send</Button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default MMAIGame;