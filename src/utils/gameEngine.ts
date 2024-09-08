/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/gameEngine.ts

import { GameState, GameAction, Position, Player, Room, Clue } from '../types/gameTypes';

// Player characters
const CHARACTERS = ['blue-fish', 'orange-crab', 'green-turtle', 'red-donkey', 'user'];

// Room names
const ROOM_NAMES = [
  'Foyer', 'Living Room', 'Dining Room', 'Kitchen', 'Library',
  'Study', 'Master Bedroom', 'Guest Bedroom', 'Bathroom', 'Attic'
];

export class GameEngine {
  private state: GameState;


  constructor() {
    this.state = {} as GameState;
  }

  public async initializeGame(): Promise<void> {
    try {
      const response = await fetch('/api/game-master/initialize', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to initialize game');
      }
      const initialState = await response.json();
      this.state = this.validateAndFillGameState(initialState, this.createDefaultGameState());
    } catch (error) {
      console.error('Error initializing game:', error);
      this.state = this.createDefaultGameState();
    }
  }
  
  private validateAndFillGameState(state: Partial<GameState>, defaultState: GameState): GameState {
    return {
      mansion: this.validateMansion(state.mansion, defaultState.mansion),
      players: this.validatePlayers(state.players, defaultState.players),
      currentTurn: state.currentTurn || defaultState.currentTurn,
      gamePhase: state.gamePhase || defaultState.gamePhase,
      turnCount: state.turnCount || defaultState.turnCount,
      clues: this.validateClues(state.clues, defaultState.clues),
      events: state.events || defaultState.events,
      murder: this.validateMurder(state.murder, defaultState.murder),
    };
  }

    private validatePlayers(players: Partial<Player>[] | undefined, defaultPlayers: Player[]): Player[] {
        if (!players) return defaultPlayers;
        return players.map((player, index) => ({
            id: player.id || defaultPlayers[index].id,
            name: player.name || defaultPlayers[index].name,
            role: player.role || defaultPlayers[index].role,
            position: player.position || defaultPlayers[index].position,
            inventory: player.inventory || defaultPlayers[index].inventory,
            knownClues: player.knownClues || defaultPlayers[index].knownClues,
        }));
    }

    private validateClues(clues: Partial<Clue>[] | undefined, defaultClues: Clue[]): Clue[] {
        if (!clues) return defaultClues;
        return clues.map((clue, index) => ({
            id: clue.id || defaultClues[index].id,
            description: clue.description || defaultClues[index].description,
            location: clue.location || defaultClues[index].location,
            discovered: clue.discovered || defaultClues[index].discovered,
            relatedTo: clue.relatedTo || defaultClues[index].relatedTo,
        }));
    }

    private validateMurder(murder: Partial<GameState['murder']> | undefined, defaultMurder: GameState['murder']): GameState['murder'] {
        return {
            victim: murder?.victim || defaultMurder.victim,
            weapon: murder?.weapon || defaultMurder.weapon,
            location: murder?.location || defaultMurder.location,
            culprit: murder?.culprit || defaultMurder.culprit,
            motive: murder?.motive || defaultMurder.motive,
        };
    }

  private validateMansion(mansion: Partial<GameState['mansion']> | undefined, defaultMansion: GameState['mansion']): GameState['mansion'] {
    return {
      layout: mansion?.layout || defaultMansion.layout,
      rooms: this.validateRooms(mansion?.rooms, defaultMansion.rooms),
    };
  }
  
  private validateRooms(rooms: Partial<Room>[] | undefined, defaultRooms: Room[]): Room[] {
    if (!rooms) return defaultRooms;
    return rooms.map((room, index) => ({
      id: room.id || defaultRooms[index].id,
      name: room.name || defaultRooms[index].name,
      description: room.description || defaultRooms[index].description,
      items: room.items || defaultRooms[index].items,
      connections: room.connections || defaultRooms[index].connections,
      discovered: room.discovered || defaultRooms[index].discovered,
    }));
  }

  public createDefaultGameState(): GameState {
    const layout = this.generateMansionLayout();
    const rooms = this.generateRooms(layout);
    const players = this.initializePlayers();
    const clues = this.generateClues(rooms);

    return {
      mansion: { layout, rooms },
      players,
      currentTurn: 'user',
      gamePhase: 'investigation',
      turnCount: 0,
      clues,
      events: ['The game has started.'],
      murder: this.generateDefaultMurderScenario(rooms),
    };
  }

  private generateMansionLayout(): string[][] {
    const layout: string[][] = [];
    for (let i = 0; i < 10; i++) {
      layout.push(Array(10).fill('').map((_, j) => `room${i * 10 + j}`));
    }
    return layout;
  }

  private generateRooms(layout: string[][]): Room[] {
    return layout.flat().map((id, index) => ({
      id,
      name: ROOM_NAMES[index % ROOM_NAMES.length],
      description: `A ${ROOM_NAMES[index % ROOM_NAMES.length].toLowerCase()} in the mansion.`,
      items: [],
      connections: this.getAdjacentRooms(layout, Math.floor(index / 10), index % 10),
      discovered: false,
    }));
  }

  private getAdjacentRooms(layout: string[][], row: number, col: number): string[] {
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

  private initializePlayers(): Player[] {
    return CHARACTERS.map((character, index) => ({
      id: character,
      name: character,
      role: character === 'user' ? 'user' : 'ai',
      position: { x: index * 2, y: 0 },
      inventory: [],
      knownClues: [],
    }));
  }

  private generateClues(rooms: Room[]): Clue[] {
    const clueTypes = ['weapon', 'motive', 'alibi', 'evidence'];
    return rooms.slice(0, 20).map((room, index) => ({
      id: `clue${index}`,
      description: `A clue related to the ${clueTypes[index % clueTypes.length]}`,
      location: room.id,
      discovered: false,
      relatedTo: clueTypes[index % clueTypes.length] as 'weapon' | 'culprit' | 'motive' | 'alibi',
    }));
  }

  private generateDefaultMurderScenario(rooms: Room[]): GameState['murder'] {
    return {
      victim: 'Mr. Boddy',
      weapon: 'Candlestick',
      location: rooms[Math.floor(Math.random() * rooms.length)].id,
      culprit: CHARACTERS[Math.floor(Math.random() * (CHARACTERS.length - 1))],
      motive: 'Revenge',
    };
  }

  public getState(): GameState {
    return this.state;
  }

  public async processAction(action: GameAction): Promise<GameState> {
    try {
      const response = await fetch('/api/game-master/process-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: action.playerId, action, gameState: this.state }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to process action');
      }
  
      const result = await response.json();
      this.updateGameState(result);
  
      if (this.state.players.find(p => p.id === action.playerId)?.role === 'user') {
        await this.processAITurns();
      }
  
      return this.state;
    } catch (error) {
      console.error('Error processing action:', error);
      return this.handleActionLocally(action);
    }
  }
  
  private updateGameState(result: any): void {
    if (result.stateChanges) {
      const { playerPosition, roomDiscovered, itemFound, clueRevealed } = result.stateChanges;
      
      if (playerPosition) {
        const player = this.state.players.find(p => p.id === this.state.currentTurn);
        if (player) {
          player.position = playerPosition;
        }
      }
  
      if (roomDiscovered) {
        const room = this.state.mansion.rooms.find(r => r.id === roomDiscovered);
        if (room) {
          room.discovered = true;
        }
      }
  
      if (itemFound) {
        const room = this.getRoomAtPosition(this.state.players.find(p => p.id === this.state.currentTurn)!.position);
        room.items.push(itemFound);
      }
  
      if (clueRevealed) {
        const clue = this.state.clues.find(c => c.id === clueRevealed);
        if (clue) {
          clue.discovered = true;
        }
      }
    }
  
    if (result.narrativeDescription) {
      this.state.events.push(result.narrativeDescription);
    }
  
    // Ensure turn advancement even if the API doesn't provide it
    this.advanceTurn();
  }

  private handleActionLocally(action: GameAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) return this.state;

    switch (action.type) {
      case 'move':
        return this.handleMove(player, action.details as { dx: number, dy: number });
      case 'search':
        return this.handleSearch(player);
      case 'accuse':
        return this.handleAccusation(player, action.details as { suspectId: string, weaponId: string, locationId: string });
      case 'use_item':
        return this.handleUseItem(player, action.details as { itemId: string });
      case 'chat':
        return this.handleChat(player, action.details as { message: string });
      case 'pickup':
        return this.handlePickup(player, action.details as { itemId: string });
      case 'drop':
        return this.handleDrop(player, action.details as { itemId: string });
      case 'examine':
        return this.handleExamine(player, action.details as { targetId: string });
      default:
        console.error('Invalid action type:', action.type);
        return this.state;
    }
  }

  private handleMove(player: Player, details: { dx: number, dy: number }): GameState {
    const newPosition: Position = {
      x: Math.max(0, Math.min(9, player.position.x + details.dx)),
      y: Math.max(0, Math.min(9, player.position.y + details.dy)),
    };

    player.position = newPosition;
    const newRoom = this.getRoomAtPosition(newPosition);
    this.state.events.push(`${player.name} moved to ${newRoom.name}`);

    return this.advanceTurn();
  }

  private handleSearch(player: Player): GameState {
    const room = this.getRoomAtPosition(player.position);
    const cluesInRoom = this.state.clues.filter(c => c.location === room.id && !c.discovered);

    if (cluesInRoom.length > 0) {
      const discoveredClue = cluesInRoom[Math.floor(Math.random() * cluesInRoom.length)];
      discoveredClue.discovered = true;
      player.knownClues.push(discoveredClue.id);
      this.state.events.push(`${player.name} discovered a clue: ${discoveredClue.description}`);
    } else {
      this.state.events.push(`${player.name} searched ${room.name} but found nothing of interest`);
    }

    return this.advanceTurn();
  }

  private handleAccusation(player: Player, details: { suspectId: string, weaponId: string, locationId: string }): GameState {
    const { suspectId, weaponId, locationId } = details;
    const correct = 
      suspectId === this.state.murder.culprit &&
      weaponId === this.state.murder.weapon &&
      locationId === this.state.murder.location;

    if (correct) {
      this.state.gamePhase = 'conclusion';
      this.state.events.push(`${player.name} correctly solved the murder! Game Over!`);
    } else {
      this.state.events.push(`${player.name} made an incorrect accusation`);
    }

    return this.advanceTurn();
  }

  private handleUseItem(player: Player, details: { itemId: string }): GameState {
    const item = player.inventory.find(i => i.id === details.itemId);
    if (item) {
      this.state.events.push(`${player.name} used ${item.name}`);
      // Implement item usage logic here
    } else {
      this.state.events.push(`${player.name} tried to use an item they don't have`);
    }
    return this.advanceTurn();
  }

  private handleChat(player: Player, details: { message: string }): GameState {
    this.state.events.push(`${player.name}: ${details.message}`);
    return this.state; // Chat doesn't advance the turn
  }

  private handlePickup(player: Player, details: { itemId: string }): GameState {
    const room = this.getRoomAtPosition(player.position);
    const itemIndex = room.items.findIndex(i => i.id === details.itemId);
    if (itemIndex !== -1 && room.items[itemIndex].canPickUp) {
      const [item] = room.items.splice(itemIndex, 1);
      player.inventory.push(item);
      this.state.events.push(`${player.name} picked up ${item.name}`);
    } else {
      this.state.events.push(`${player.name} couldn't pick up the item`);
    }
    return this.advanceTurn();
  }

  private handleDrop(player: Player, details: { itemId: string }): GameState {
    const itemIndex = player.inventory.findIndex(i => i.id === details.itemId);
    if (itemIndex !== -1) {
      const [item] = player.inventory.splice(itemIndex, 1);
      const room = this.getRoomAtPosition(player.position);
      room.items.push(item);
      this.state.events.push(`${player.name} dropped ${item.name}`);
    } else {
      this.state.events.push(`${player.name} tried to drop an item they don't have`);
    }
    return this.advanceTurn();
  }

  private handleExamine(player: Player, details: { targetId: string }): GameState {
    const room = this.getRoomAtPosition(player.position);
    const item = room.items.find(i => i.id === details.targetId);
    const otherPlayer = this.state.players.find(p => p.id === details.targetId && p.position.x === player.position.x && p.position.y === player.position.y);
    
    if (item) {
      this.state.events.push(`${player.name} examined ${item.name}: ${item.description}`);
    } else if (otherPlayer) {
      this.state.events.push(`${player.name} examined ${otherPlayer.name}`);
    } else {
      this.state.events.push(`${player.name} found nothing to examine`);
    }
    
    return this.advanceTurn();
  }

  private getRoomAtPosition(position: Position): Room {
    const roomId = this.state.mansion.layout[position.y][position.x];
    return this.state.mansion.rooms.find(r => r.id === roomId) || 
           { id: 'unknown', name: 'Unknown', description: '', items: [], connections: [], discovered: false };
  }

  private advanceTurn(): GameState {
    const currentPlayerIndex = this.state.players.findIndex(p => p.id === this.state.currentTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.state.players.length;
    this.state.currentTurn = this.state.players[nextPlayerIndex].id;
    this.state.turnCount++;
    return this.state;
  }

  private async processAITurns(): Promise<void> {
    for (const player of this.state.players) {
      if (player.role === 'ai' && player.id === this.state.currentTurn) {
        const aiAction = await this.generateAIAction(player);
        await this.processAction(aiAction);
      }
    }
  }

//   private async generateAIAction(player: Player): Promise<GameAction> {
//     try {
//       const response = await fetch('/api/game-master/generate-event', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ gameState: this.state, player: player.id }),
//       });

//       if (!response.ok) {
//         throw new Error('Failed to generate AI action');
//       }

//       const event = await response.json();
//       // Convert the generated event into a GameAction
//       return this.eventToGameAction(event, player.id);
//     } catch (error) {
//       console.error('Error generating AI action:', error);
//       // Fallback to a simple random action
//       return this.generateRandomAction(player);
//     }
//   }

//   private eventToGameAction(event: any, playerId: string): GameAction {
//     // Convert the event to a GameAction based on the event type
//     switch (event.eventType) {
//       case 'character':
//         return { type: 'move', playerId, details: { dx: Math.random() < 0.5 ? -1 : 1, dy: Math.random() < 0.5 ? -1 : 1 } };
//       case 'clue':
//         return { type: 'search', playerId, details: {} };
//       case 'obstacle':
//         return { type: 'use_item', playerId, details: { itemId: 'randomItem' } };
//       default:
//         return { type: 'chat', playerId, details: { message: event.description } };
//     }
//   }
private async generateAIAction(player: Player): Promise<GameAction> {
    try {
      const response = await fetch('/api/game-master/generate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState: this.state, player: player.id }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to generate AI action');
      }
  
      const event = await response.json();
      return this.eventToGameAction(event, player.id);
    } catch (error) {
      console.error('Error generating AI action:', error);
      return this.generateRandomAction(player);
    }
  }
  
  private eventToGameAction(event: any, playerId: string): GameAction {
    if (!event || typeof event !== 'object') {
      return this.generateRandomAction({ id: playerId } as Player);
    }
  
    switch (event.eventType) {
      case 'character':
        return { type: 'move', playerId, details: { dx: Math.random() < 0.5 ? -1 : 1, dy: Math.random() < 0.5 ? -1 : 1 } };
      case 'clue':
        return { type: 'search', playerId, details: {} };
      case 'obstacle':
        return { type: 'use_item', playerId, details: { itemId: 'randomItem' } };
      default:
        return { type: 'chat', playerId, details: { message: event.description || 'I am looking around.' } };
    }
  }
  private generateRandomAction(player: Player): GameAction {
    const actions: GameAction['type'][] = ['move', 'search', 'chat', 'examine'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    switch (randomAction) {
      case 'move':
        return { type: 'move', playerId: player.id, details: { dx: Math.random() < 0.5 ? -1 : 1, dy: Math.random() < 0.5 ? -1 : 1 } };
      case 'search':
        return { type: 'search', playerId: player.id, details: {} };
      case 'chat':
        return { type: 'chat', playerId: player.id, details: { message: 'I am looking for clues.' } };
      case 'examine':
        return { type: 'examine', playerId: player.id, details: { targetId: 'randomTarget' } };

default:
    return { type: 'chat', playerId: player.id, details: { message: 'I am looking for clues.' } };
}
}

// private async updateGameState(actionResult: any): Promise<void> {
//   try {
//     const response = await fetch('/api/game-master/update-state', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ currentState: this.state, actionResult }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to update game state');
//     }

//     const updatedState = await response.json();
//     this.state = { ...this.state, ...updatedState };
//   } catch (error) {
//     console.error('Error updating game state:', error);
//     // Fallback to local state update
//     this.applyActionResult(actionResult);
//   }
// }

private applyActionResult(actionResult: any): void {
  if (actionResult.stateChanges) {
    const { playerPosition, roomDiscovered, itemFound, clueRevealed } = actionResult.stateChanges;
    
    if (playerPosition) {
      const player = this.state.players.find(p => p.id === this.state.currentTurn);
      if (player) {
        player.position = playerPosition;
      }
    }

    if (roomDiscovered) {
      const room = this.state.mansion.rooms.find(r => r.id === roomDiscovered);
      if (room) {
        room.discovered = true;
      }
    }

    if (itemFound) {
      const room = this.getRoomAtPosition(this.state.players.find(p => p.id === this.state.currentTurn)!.position);
      room.items.push(itemFound);
    }

    if (clueRevealed) {
      const clue = this.state.clues.find(c => c.id === clueRevealed);
      if (clue) {
        clue.discovered = true;
      }
    }
  }

  if (actionResult.narrativeDescription) {
    this.state.events.push(actionResult.narrativeDescription);
  }
}

public async provideClue(player: Player): Promise<void> {
  try {
    const response = await fetch('/api/game-master/provide-clue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: player.id,
        location: this.getRoomAtPosition(player.position).id,
        gameProgress: this.state.turnCount / 10 // Simple progress metric
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to provide clue');
    }

    const clue = await response.json();
    this.addClueToGame(clue, player);
  } catch (error) {
    console.error('Error providing clue:', error);
    // Fallback to local clue generation
    this.generateLocalClue(player);
  }
}

private addClueToGame(clue: any, player: Player): void {
  const newClue: Clue = {
    id: `clue${this.state.clues.length + 1}`,
    description: clue.description,
    location: this.getRoomAtPosition(player.position).id,
    discovered: true,
    relatedTo: clue.clueType as 'weapon' | 'culprit' | 'motive' | 'alibi'
  };

  this.state.clues.push(newClue);
  player.knownClues.push(newClue.id);
  this.state.events.push(`${player.name} found a new clue: ${newClue.description}`);
}

private generateLocalClue(player: Player): void {
  const clueTypes = ['weapon', 'culprit', 'motive', 'alibi'];
  const randomType = clueTypes[Math.floor(Math.random() * clueTypes.length)] as 'weapon' | 'culprit' | 'motive' | 'alibi';
  const newClue: Clue = {
    id: `clue${this.state.clues.length + 1}`,
    description: `A mysterious ${randomType} clue`,
    location: this.getRoomAtPosition(player.position).id,
    discovered: true,
    relatedTo: randomType
  };

  this.state.clues.push(newClue);
  player.knownClues.push(newClue.id);
  this.state.events.push(`${player.name} found a new clue: ${newClue.description}`);
}

public isGameOver(): boolean {
  return this.state.gamePhase === 'conclusion';
}
}

export const gameEngine = new GameEngine();