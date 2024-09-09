// src/utils/game-engine/gameInitialization.ts

import { GameState, Room, Player, Clue, Item, Position } from '@/types/gameTypes';

// Player characters
const CHARACTERS = ['blue-fish', 'orange-crab', 'green-turtle', 'red-donkey', 'user'];

// Room names
const ROOM_NAMES = [
  'Foyer', 'Living Room', 'Dining Room', 'Kitchen', 'Library',
  'Study', 'Master Bedroom', 'Guest Bedroom', 'Bathroom', 'Attic'
];

export async function initializeGame(): Promise<GameState> {
  try {
    const response = await fetch('/api/game-master/initialize', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to initialize game');
    const initialState = await response.json();
    return validateAndFillGameState(initialState, createDefaultGameState());
  } catch (error) {
    console.error('Error initializing game:', error);
    return createDefaultGameState();
  }
}

export function createDefaultGameState(): GameState {
  const layout = generateMansionLayout();
  const rooms = generateRooms(layout);
  const players = initializePlayers();
  const clues = generateClues(rooms);

  return {
    mansion: { layout, rooms },
    players,
    currentTurn: 'user',
    gamePhase: 'investigation',
    turnCount: 0,
    clues,
    events: ['The game has started.'],
    murder: generateDefaultMurderScenario(rooms),
  };
}

function generateMansionLayout(): string[][] {
  const layout: string[][] = [];
  for (let i = 0; i < 10; i++) {
    layout.push(Array(10).fill('').map((_, j) => `room${i * 10 + j}`));
  }
  return layout;
}

function generateRooms(layout: string[][]): Room[] {
  return layout.flat().map((id, index) => ({
    id,
    name: ROOM_NAMES[index % ROOM_NAMES.length],
    description: `A ${ROOM_NAMES[index % ROOM_NAMES.length].toLowerCase()} in the mansion.`,
    items: generateRoomItems(),
    connections: getAdjacentRooms(layout, Math.floor(index / 10), index % 10),
    discovered: false,
  }));
}

function generateRoomItems(): Item[] {
    const itemCount = Math.floor(Math.random() * 4);
    return Array(itemCount).fill(null).map((_, index) => ({
      id: `item${index}`,
      name: `Item ${index + 1}`,
      description: `A mysterious item found in the room.`,
      isClue: Math.random() > 0.7, // 30% chance of being a clue
      canPickUp: Math.random() > 0.5, // 50% chance the item can be picked up
    }));
  }

function getAdjacentRooms(layout: string[][], row: number, col: number): string[] {
  const adjacent: string[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dy] of directions) {
    const newRow = row + dx;
    const newCol = col + dy;
    if (newRow >= 0 && newRow < layout.length && newCol >= 0 && newCol < layout[0].length) {
      adjacent.push(layout[newRow][newCol]);
    }
  }
  return adjacent;
}

function initializePlayers(): Player[] {
    const userPlayer: Player = {
      id: 'user',
      name: 'User',
      role: 'user',
      position: getRandomPosition(),
      inventory: [],
      knownClues: [],
    };
  
    const aiPlayers = CHARACTERS.filter(char => char !== 'user').map((character, index) => ({
      id: character,
      name: character,
      role: 'ai' as const,
      position: getRandomPosition(),
      inventory: [],
      knownClues: [],
    }));
  
    return [userPlayer, ...aiPlayers];
  }

function getRandomPosition(): Position {
  return {
    x: Math.floor(Math.random() * 10),
    y: Math.floor(Math.random() * 10),
  };
}

function generateClues(rooms: Room[]): Clue[] {
  const clueTypes = ['weapon', 'motive', 'alibi', 'evidence'];
  return rooms.slice(0, 20).map((room, index) => ({
    id: `clue${index}`,
    description: `A clue related to the ${clueTypes[index % clueTypes.length]}`,
    location: room.id,
    discovered: false,
    relatedTo: clueTypes[index % clueTypes.length] as 'weapon' | 'culprit' | 'motive' | 'alibi',
  }));
}

function generateDefaultMurderScenario(rooms: Room[]): GameState['murder'] {
  return {
    victim: 'Mr. Boddy',
    weapon: 'Candlestick',
    location: rooms[Math.floor(Math.random() * rooms.length)].id,
    culprit: CHARACTERS[Math.floor(Math.random() * (CHARACTERS.length - 1))],
    motive: 'Revenge',
  };
}

function validateAndFillGameState(state: Partial<GameState>, defaultState: GameState): GameState {
  return {
    mansion: validateMansion(state.mansion, defaultState.mansion),
    players: validatePlayers(state.players, defaultState.players),
    currentTurn: state.currentTurn || defaultState.currentTurn,
    gamePhase: state.gamePhase || defaultState.gamePhase,
    turnCount: state.turnCount || defaultState.turnCount,
    clues: validateClues(state.clues, defaultState.clues),
    events: state.events || defaultState.events,
    murder: validateMurder(state.murder, defaultState.murder),
  };
}

function validateMansion(mansion: Partial<GameState['mansion']> | undefined, defaultMansion: GameState['mansion']): GameState['mansion'] {
  return {
    layout: mansion?.layout || defaultMansion.layout,
    rooms: validateRooms(mansion?.rooms, defaultMansion.rooms),
  };
}

function validateRooms(rooms: Partial<Room>[] | undefined, defaultRooms: Room[]): Room[] {
  if (!rooms) return defaultRooms;
  return rooms.map((room, index) => ({
    id: room.id || defaultRooms[index].id,
    name: room.name || defaultRooms[index].name,
    description: room.description || defaultRooms[index].description,
    items: validateItems(room.items, defaultRooms[index].items),
    connections: room.connections || defaultRooms[index].connections,
    discovered: room.discovered || defaultRooms[index].discovered,
  }));
}

function validateItems(items: Partial<Item>[] | undefined, defaultItems: Item[]): Item[] {
    if (!items) return defaultItems;
    return items.map((item, index) => ({
      id: item.id || defaultItems[index].id,
      name: item.name || defaultItems[index].name,
      description: item.description || defaultItems[index].description,
      isClue: item.isClue ?? defaultItems[index].isClue,
      canPickUp: item.canPickUp ?? defaultItems[index].canPickUp,
    }));
  }

function validatePlayers(players: Partial<Player>[] | undefined, defaultPlayers: Player[]): Player[] {
  if (!players) return defaultPlayers;
  return players.map((player, index) => ({
    id: player.id || defaultPlayers[index].id,
    name: player.name || defaultPlayers[index].name,
    role: player.role || defaultPlayers[index].role,
    position: player.position || defaultPlayers[index].position,
    inventory: validateItems(player.inventory, defaultPlayers[index].inventory),
    knownClues: player.knownClues || defaultPlayers[index].knownClues,
  }));
}

function validateClues(clues: Partial<Clue>[] | undefined, defaultClues: Clue[]): Clue[] {
  if (!clues) return defaultClues;
  return clues.map((clue, index) => ({
    id: clue.id || defaultClues[index].id,
    description: clue.description || defaultClues[index].description,
    location: clue.location || defaultClues[index].location,
    discovered: clue.discovered || defaultClues[index].discovered,
    relatedTo: clue.relatedTo || defaultClues[index].relatedTo,
  }));
}

function validateMurder(murder: Partial<GameState['murder']> | undefined, defaultMurder: GameState['murder']): GameState['murder'] {
  return {
    victim: murder?.victim || defaultMurder.victim,
    weapon: murder?.weapon || defaultMurder.weapon,
    location: murder?.location || defaultMurder.location,
    culprit: murder?.culprit || defaultMurder.culprit,
    motive: murder?.motive || defaultMurder.motive,
  };
}