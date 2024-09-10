// src/game/AeithGameEngine.ts

import { GroupAgentsGrab } from '@/utils/GroupAgentsGrab';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  position: [number, number];
  inventory: string[];
}

export interface Room {
  id: string;
  name: string;
  description: string;
  items: string[];
}

export interface GameState {
  players: Player[];
  rooms: Room[][];
  currentTurn: string;
  phase: 'investigation' | 'middleGame' | 'finalPhase' | 'accusation' | 'conclusion';
  cluesFound: string[];
  turnCount: number;
}

export class AeithGameEngine {
  private groupAgentsGrab: GroupAgentsGrab;
  private gameState: GameState;

  constructor() {
    this.groupAgentsGrab = new GroupAgentsGrab();
    this.gameState = this.initializeGameState();
  }

  private initializeGameState(): GameState {
    // Initialize a 10x10 grid of rooms
    const rooms: Room[][] = Array(10).fill(null).map(() => 
      Array(10).fill(null).map(() => ({
        id: `room-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Empty Room',
        description: 'An empty room in the mansion.',
        items: []
      }))
    );

    // Place some items and clues randomly
    this.placeItemsRandomly(rooms);

    return {
      players: [
        { id: 'blue-fish', name: 'Blue Fish', avatar: '/svgs/blue-fish.svg', position: [0, 0], inventory: [] },
        { id: 'orange-crab', name: 'Orange Crab', avatar: '/svgs/orange-crab.svg', position: [9, 9], inventory: [] },
        { id: 'green-turtle', name: 'Green Turtle', avatar: '/svgs/green-turtle.svg', position: [0, 9], inventory: [] },
        { id: 'red-donkey', name: 'Red Donkey', avatar: '/svgs/red-donkey.svg', position: [9, 0], inventory: [] },
        { id: 'user', name: 'User', avatar: '/svgs/user.svg', position: [5, 5], inventory: [] }
      ],
      rooms,
      currentTurn: 'user',
      phase: 'investigation',
      cluesFound: [],
      turnCount: 0
    };
  }

  private placeItemsRandomly(rooms: Room[][]): void {
    const items = [
      'Bloody Knife', 'Broken Glass', 'Mysterious Note', 'Old Photograph',
      'Strange Key', 'Torn Piece of Cloth', 'Empty Poison Bottle', 'Muddy Footprint'
    ];

    items.forEach(item => {
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);
      rooms[y][x].items.push(item);
    });
  }

  async initializeChat(): Promise<void> {
    await this.groupAgentsGrab.initializeChat('Welcome to the Aeith Murder Mystery Game!');
  }

  async performAction(playerId: string, action: 'move' | 'search' | 'examine' | 'accuse', target?: string): Promise<string> {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    let result = '';

    switch (action) {
      case 'move':
        result = this.movePlayer(player, target as 'north' | 'south' | 'east' | 'west');
        break;
      case 'search':
        result = this.searchRoom(player);
        break;
      case 'examine':
        result = this.examineItem(player, target!);
        break;
      case 'accuse':
        result = await this.makeAccusation(player, target!);
        break;
    }

    await this.updateAIAgents(playerId, action, target);
    this.nextTurn();

    return result;
  }

  private movePlayer(player: Player, direction: 'north' | 'south' | 'east' | 'west'): string {
    const [x, y] = player.position;
    let newX = x, newY = y;

    switch (direction) {
      case 'north': newY = Math.max(0, y - 1); break;
      case 'south': newY = Math.min(9, y + 1); break;
      case 'west': newX = Math.max(0, x - 1); break;
      case 'east': newX = Math.min(9, x + 1); break;
    }

    player.position = [newX, newY];
    return `${player.name} moved to position [${newX}, ${newY}]`;
  }

  private searchRoom(player: Player): string {
    const [x, y] = player.position;
    const room = this.gameState.rooms[y][x];
    
    if (room.items.length > 0) {
      const item = room.items.pop()!;
      player.inventory.push(item);
      this.gameState.cluesFound.push(item);
      return `${player.name} found ${item} in the room!`;
    } else {
      return `${player.name} searched the room but found nothing of interest.`;
    }
  }

  private examineItem(player: Player, item: string): string {
    if (player.inventory.includes(item)) {
      // Here you could add more detailed descriptions of items
      return `${player.name} examined ${item} closely. It might be an important clue!`;
    } else {
      return `${player.name} doesn't have ${item} in their inventory.`;
    }
  }

  private async makeAccusation(player: Player, accusation: string): Promise<string> {
    // In a real implementation, you'd check if the accusation is correct
    // For now, we'll just end the game
    this.gameState.phase = 'conclusion';
    return `${player.name} made an accusation: ${accusation}. The game has ended!`;
  }

  private async updateAIAgents(playerId: string, action: string, target?: string): Promise<void> {
    const message = `${playerId} performed action: ${action}${target ? ` on ${target}` : ''}`;
    for (const agent of this.gameState.players.filter(p => p.id !== 'user')) {
      await this.groupAgentsGrab.addMessage(agent.id, message);
      await this.groupAgentsGrab.getAgentResponse(agent.id);
    }
  }

  private nextTurn(): void {
    const playerIds = this.gameState.players.map(p => p.id);
    const currentIndex = playerIds.indexOf(this.gameState.currentTurn);
    this.gameState.currentTurn = playerIds[(currentIndex + 1) % playerIds.length];
    this.gameState.turnCount++;

    // Update game phase based on turn count or clues found
    if (this.gameState.turnCount > 20) {
      this.gameState.phase = 'middleGame';
    } else if (this.gameState.turnCount > 40) {
      this.gameState.phase = 'finalPhase';
    }
  }

  getGameState(): GameState {
    return this.gameState;
  }

  async getChatHistory(agentId: string): Promise<{ role: string; content: string }[]> {
    const messages = await this.groupAgentsGrab.getMessages(agentId);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content[0].value
    }));
  }
}