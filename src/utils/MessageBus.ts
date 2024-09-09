// src/utils/MessageBus.ts

import { GameState, ChatEntry } from '@/types/gameTypes';
import { createDefaultGameState } from './game-engine/gameInitialization';

type MessageHandler = (message: ChatEntry, gameState: GameState) => void;

class MessageBus {
  private handlers: { [key: string]: Set<MessageHandler> } = {};
  private gameState: GameState;

  constructor(initialGameState: GameState = createDefaultGameState()) {
    this.gameState = initialGameState;
  }

  subscribe(agentId: string, handler: MessageHandler): void {
    if (!this.handlers[agentId]) {
      this.handlers[agentId] = new Set();
    }
    this.handlers[agentId].add(handler);
  }

  unsubscribe(agentId: string, handler: MessageHandler): void {
    if (this.handlers[agentId]) {
      this.handlers[agentId].delete(handler);
      if (this.handlers[agentId].size === 0) {
        delete this.handlers[agentId];
      }
    }
  }

  publish(message: ChatEntry): void {
    Object.values(this.handlers).forEach(handlers => {
      handlers.forEach(handler => {
        try {
          handler(message, this.gameState);
        } catch (error) {
          console.error(`Error in message handler for message:`, message, error);
        }
      });
    });
  }

  notifyStateChange(): void {
    const dummyMessage: ChatEntry = { role: 'system', content: 'Game state updated' };
    this.publish(dummyMessage);
  }
  
  updateGameState(newState: GameState): void {
    this.gameState = newState;
    this.notifyStateChange();
  }

  getGameState(): GameState {
    return this.gameState;
  }
}

export const messageBus = new MessageBus();