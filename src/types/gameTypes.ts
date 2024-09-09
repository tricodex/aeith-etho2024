export interface Position {
    x: number;
    y: number;
  }
  
  export interface Room {
    id: string;
    name: string;
    description: string;
    items: Item[];
    connections: string[]; // IDs of connected rooms
    discovered: boolean;    
    clues?: string[];

  }
  
  export interface Item {
    id: string;
    name: string;
    description: string;
    isClue: boolean;
    canPickUp: boolean;
    useAction?: string;
  }
  
  export interface Player {
    id: string;
    name: string;
    role: 'user' | 'ai' | 'murderer' | 'victim';
    position: Position;
    inventory: Item[];
    knownClues: string[]; // IDs of discovered clues
  }
  
  export interface Clue {
    id: string;
    description: string;
    location: string;
    discovered: boolean;
    relatedTo: 'weapon' | 'culprit' | 'motive' | 'alibi';
  }
  
  export interface GameState {
    mansion: {
      layout: string[][];
      rooms: Room[];
    };
    players: Player[];
    currentTurn: string; // Player ID
    gamePhase: 'setup' | 'investigation' | 'middleGame' | 'finalPhase' | 'accusation' | 'conclusion';
    turnCount: number;
    clues: Clue[];
    events: string[];
    murder: {
      victim: string;
      weapon: string;
      location: string;
      culprit: string;
      motive: string;
    };
  }

  export interface ChatEntry {
    role: string;
    content: string;
    agentId?: string;
  }

  export interface Item {
    id: string;
    name: string;
    description: string;
    isClue: boolean;
    canPickUp: boolean;
  }
  
  export type ActionType = 'move' | 'search' | 'accuse' | 'use_item' | 'chat' | 'pickup' | 'drop' | 'examine';
  
  export interface GameAction {
    type: ActionType;
    playerId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: any; // Change this to 'any' to allow different types of details
}