// src/utils/game-engine/gameHelpers.ts

import { GameState, Player, GameAction, Position, Room, Item, Clue, ChatEntry } from '@/types/gameTypes';

export function getRoomAtPosition(state: GameState, position: Position): Room {
  const roomId = state.mansion.layout[position.y][position.x];
  return state.mansion.rooms.find(r => r.id === roomId) || 
         { id: 'unknown', name: 'Unknown', description: '', items: [], connections: [], discovered: false };
}

export function addToChatHistory(chatHistory: ChatEntry[], role: string, content: string, agentId?: string): void {
  chatHistory.push({ role, content, agentId });
  // Limit chat history to last 50 entries
  if (chatHistory.length > 50) {
    chatHistory.splice(0, chatHistory.length - 50);
  }
}

export function isValidMove(state: GameState, player: Player, dx: number, dy: number): boolean {
  const newX = player.position.x + dx;
  const newY = player.position.y + dy;
  return newX >= 0 && newX < 10 && newY >= 0 && newY < 10;
}

export function getAdjacentPlayers(state: GameState, player: Player): Player[] {
  return state.players.filter(p => 
    p.id !== player.id && 
    Math.abs(p.position.x - player.position.x) <= 1 && 
    Math.abs(p.position.y - player.position.y) <= 1
  );
}

export function canPlayerAccuse(state: GameState, player: Player): boolean {
  // A player can accuse if they have discovered at least 3 clues
  return player.knownClues.length >= 3;
}

export function generateRandomAction(player: Player): GameAction {
  const actions: GameAction['type'][] = ['move', 'search', 'chat', 'examine'];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];

  switch (randomAction) {
    case 'move':
      return { 
        type: 'move', 
        playerId: player.id, 
        details: { dx: Math.random() < 0.5 ? -1 : 1, dy: Math.random() < 0.5 ? -1 : 1 } 
      };
    case 'search':
      return { type: 'search', playerId: player.id, details: {} };
    case 'chat':
      return { 
        type: 'chat', 
        playerId: player.id, 
        details: { message: 'I am looking for clues.' } 
      };
    case 'examine':
      return { 
        type: 'examine', 
        playerId: player.id, 
        details: { targetId: 'randomTarget' } 
      };
    default:
      return { 
        type: 'chat', 
        playerId: player.id, 
        details: { message: 'I am looking around.' } 
      };
  }
}

export function getRandomItem(items: Item[]): Item | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

export function removeItemFromInventory(player: Player, itemId: string): Item | undefined {
  const index = player.inventory.findIndex(item => item.id === itemId);
  if (index !== -1) {
    return player.inventory.splice(index, 1)[0];
  }
  return undefined;
}

export function addItemToInventory(player: Player, item: Item): void {
  player.inventory.push(item);
}

export function discoverRoom(state: GameState, roomId: string): void {
  const room = state.mansion.rooms.find(r => r.id === roomId);
  if (room) {
    room.discovered = true;
  }
}

export function revealClue(state: GameState, clueId: string, playerId: string): void {
  const clue = state.clues.find(c => c.id === clueId);
  const player = state.players.find(p => p.id === playerId);
  if (clue && player) {
    clue.discovered = true;
    if (!player.knownClues.includes(clueId)) {
      player.knownClues.push(clueId);
    }
  }
}

export function isGameOver(state: GameState): boolean {
  return state.gamePhase === 'conclusion';
}

export function calculateScore(player: Player, state: GameState): number {
  let score = 0;
  score += player.knownClues.length * 10; // 10 points per discovered clue
  score += state.mansion.rooms.filter(r => r.discovered).length * 5; // 5 points per discovered room
  if (state.gamePhase === 'conclusion' && state.murder.culprit === player.id) {
    score += 100; // Bonus points for winning the game
  }
  return score;
}

export function parseAIResponse(response: string, playerId: string): GameAction {
  try {
    const parsed = JSON.parse(response);
    return {
      type: parsed.actionType,
      playerId,
      details: parsed.actionDetails
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return generateRandomAction({ id: playerId } as Player);
  }
}

export function getFullGameContext(state: GameState, chatHistory: ChatEntry[]): string {
  return JSON.stringify({
    gameState: state,
    chatHistory: chatHistory.slice(-10) // Only include the last 10 chat entries for context
  });
}

export function validateAccusation(state: GameState, accusation: { suspectId: string, weaponId: string, locationId: string }): boolean {
  return (
    accusation.suspectId === state.murder.culprit &&
    accusation.weaponId === state.murder.weapon &&
    accusation.locationId === state.murder.location
  );
}

export function getCluesInRoom(state: GameState, roomId: string): Clue[] {
  return state.clues.filter(clue => clue.location === roomId && !clue.discovered);
}

export function movePlayer(player: Player, dx: number, dy: number): void {
  player.position.x = Math.max(0, Math.min(9, player.position.x + dx));
  player.position.y = Math.max(0, Math.min(9, player.position.y + dy));
}

export function formatEventMessage(event: string): string {
  return `[${new Date().toLocaleTimeString()}] ${event}`;
}

export function getPlayerById(state: GameState, playerId: string): Player | undefined {
  return state.players.find(p => p.id === playerId);
}

export function getClueById(state: GameState, clueId: string): Clue | undefined {
  return state.clues.find(c => c.id === clueId);
}

export function updateGamePhase(state: GameState): void {
    const totalClues = state.clues.length;
    const discoveredClues = state.clues.filter(c => c.discovered).length;
    const progress = discoveredClues / totalClues;
  
    if (progress < 0.3) {
      state.gamePhase = 'investigation';
    } else if (progress < 0.7) {
      state.gamePhase = 'middleGame';
    } else if (progress < 1) {
      state.gamePhase = 'finalPhase';
    } else {
      state.gamePhase = 'conclusion';
    }
  }