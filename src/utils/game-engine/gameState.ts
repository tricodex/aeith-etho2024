// src/utils/game-engine/gameState.ts

import { GameState, Player, Room, Clue, Position, Item } from '@/types/gameTypes';

export function validateAndFillGameState(state: Partial<GameState>, defaultState: GameState): GameState {
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

export function updateGameState(state: GameState, result: any): void {
  if (result.stateChanges) {
    const { playerPosition, roomDiscovered, itemFound, clueRevealed } = result.stateChanges;
    
    if (playerPosition) {
      const player = state.players.find(p => p.id === state.currentTurn);
      if (player) player.position = playerPosition;
    }

    if (roomDiscovered) {
      const room = state.mansion.rooms.find(r => r.id === roomDiscovered);
      if (room) room.discovered = true;
    }

    if (itemFound) {
      const room = getRoomAtPosition(state, state.players.find(p => p.id === state.currentTurn)!.position);
      room.items.push(itemFound);
    }

    if (clueRevealed) {
      const clue = state.clues.find(c => c.id === clueRevealed);
      if (clue) clue.discovered = true;
    }
  }

  if (result.narrativeDescription) {
    state.events.push(result.narrativeDescription);
  }

  advanceTurn(state);
}

export function advanceTurn(state: GameState): void {
  const currentPlayerIndex = state.players.findIndex(p => p.id === state.currentTurn);
  const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length;
  state.currentTurn = state.players[nextPlayerIndex].id;
  state.turnCount++;
}

export function getRoomAtPosition(state: GameState, position: Position): Room {
  const roomId = state.mansion.layout[position.y][position.x];
  return state.mansion.rooms.find(r => r.id === roomId) || 
         { id: 'unknown', name: 'Unknown', description: '', items: [], connections: [], discovered: false };
}

export function addClueToGame(state: GameState, clue: any, player: Player): void {
  const newClue: Clue = {
    id: `clue${state.clues.length + 1}`,
    description: clue.description,
    location: getRoomAtPosition(state, player.position).id,
    discovered: true,
    relatedTo: clue.clueType as 'weapon' | 'culprit' | 'motive' | 'alibi'
  };

  state.clues.push(newClue);
  player.knownClues.push(newClue.id);
}

export function generateLocalClue(state: GameState, player: Player): Clue {
  const clueTypes = ['weapon', 'culprit', 'motive', 'alibi'];
  const randomType = clueTypes[Math.floor(Math.random() * clueTypes.length)] as 'weapon' | 'culprit' | 'motive' | 'alibi';
  const newClue: Clue = {
    id: `clue${state.clues.length + 1}`,
    description: `A mysterious ${randomType} clue`,
    location: getRoomAtPosition(state, player.position).id,
    discovered: true,
    relatedTo: randomType
  };

  state.clues.push(newClue);
  player.knownClues.push(newClue.id);
  return newClue;
}