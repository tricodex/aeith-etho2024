// src/utils/game-engine/gameEngine.ts

import { GameState, GameAction, Player, Clue, ChatEntry } from '@/types/gameTypes';
import GameAgentsGrab from '../GameAgentsGrab';
import { createDefaultGameState, initializeGame } from './gameInitialization';
import { processAction, provideClue } from './gameActions';
import { addToChatHistory, isGameOver, updateGamePhase, getRoomAtPosition } from './gameHelpers';
import { messageBus } from '../MessageBus';

export class GameEngine {
  private state: GameState;
  private gameAgentsGrab: GameAgentsGrab;
  private chatHistory: ChatEntry[];
  private currentTurnActions: { chat: boolean; action: boolean } = { chat: false, action: false };

  constructor() {
    this.state = createDefaultGameState();
    this.gameAgentsGrab = new GameAgentsGrab();
    this.chatHistory = [];
    messageBus.subscribe('game_engine', this.handleMessage.bind(this));
  }

  public async initializeGame(): Promise<void> {
    try {
      this.state = await initializeGame();
      messageBus.updateGameState(this.state);
      this.addToChatHistory('game_master', 'The game has been initialized. Welcome to the Haunted Mansion!');
      this.introduceCharacters();
      this.startFirstTurn();
    } catch (error) {
      console.error('Error initializing game:', error);
      this.state = createDefaultGameState();
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getChatHistory(): ChatEntry[] {
    return this.chatHistory;
  }

  public async processAction(action: GameAction): Promise<GameState> {
    if (this.state.currentTurn !== action.playerId) {
      throw new Error("It's not your turn!");
    }

    try {
      if (action.type === 'chat') {
        this.currentTurnActions.chat = true;
        this.addToChatHistory(action.playerId, action.details.message);
      } else {
        this.currentTurnActions.action = true;
        const updatedState = await processAction(this.state, action, this.gameAgentsGrab, this.addToChatHistory.bind(this));
        this.state = updatedState;
      }

      messageBus.updateGameState(this.state);

      if (this.currentTurnActions.chat && this.currentTurnActions.action) {
        this.endTurn();
      }

      return this.state;
    } catch (error) {
      console.error('Error processing action:', error);
      this.addToChatHistory('game_master', `Error: ${(error as Error).message}`);
      return this.state;
    }
  }

  private async processAITurn(playerId: string) {
    this.addToChatHistory('game_master', `It's ${playerId}'s turn.`);
    
    try {
      const chatAction = await this.gameAgentsGrab.generateAgentAction(playerId, this.state);
      if (chatAction.type === 'chat') {
        await this.processAction(chatAction);
      }

      const gameAction = await this.gameAgentsGrab.generateAgentAction(playerId, this.state);
      if (gameAction.type !== 'chat') {
        await this.processAction(gameAction);
      }
    } catch (error) {
      console.error(`Error processing AI turn for ${playerId}:`, error);
      this.addToChatHistory('game_master', `${playerId} encountered an issue and skipped their turn.`);
    }

    this.endTurn();
  }

  public endTurn() {
    this.currentTurnActions = { chat: false, action: false };
    this.state.currentTurn = this.getNextTurn();
    this.addToChatHistory('game_master', `${this.state.currentTurn}'s turn begins.`);

    if (this.state.currentTurn !== 'user') {
      this.processAITurn(this.state.currentTurn);
    }
  }

  private getNextTurn(): string {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.currentTurn);
    const nextIndex = (currentIndex + 1) % this.state.players.length;
    return this.state.players[nextIndex].id;
  }

  public async provideClue(player: Player): Promise<Clue | null> {
    return await provideClue(this.state, player, this.addToChatHistory.bind(this));
  }

  public isGameOver(): boolean {
    return isGameOver(this.state);
  }

  private addToChatHistory(role: string, content: string, agentId?: string): void {
    addToChatHistory(this.chatHistory, role, content, agentId);
    messageBus.publish({ role, content, agentId });
  }

  private async handleMessage(message: ChatEntry, gameState: GameState) {
    try {
      if (message.role === 'user' && this.state.currentTurn === 'user') {
        const action = this.parseUserMessage(message.content);
        await this.processAction(action);
      } else if (message.role === 'game_master') {
        this.handleGameMasterMessage(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.addToChatHistory('game_master', 'An unexpected error occurred. Please try your action again.');
    }
  }

  private parseUserMessage(content: string): GameAction {
    const lowerContent = content.toLowerCase().trim();
    const words = lowerContent.split(' ');
  
    if (words[0] === 'move') {
      const directions = ['north', 'south', 'east', 'west'];
      const direction = words[1];
      if (directions.includes(direction)) {
        return { type: 'move', playerId: 'user', details: { direction } };
      }
    } else if (words[0] === 'search') {
      return { type: 'search', playerId: 'user', details: {} };
    } else if (words[0] === 'examine' && words.length > 1) {
      const target = words.slice(1).join(' ');
      return { type: 'examine', playerId: 'user', details: { targetId: target } };
    }
  
    return { type: 'chat', playerId: 'user', details: { message: content } };
  }
  
  private handleGameMasterMessage(message: ChatEntry) {
    console.log('Game Master message:', message.content);
  
    const [action, ...params] = message.content.split(' ');
  
    switch (action.toLowerCase()) {
      case 'reveal_clue':
        this.revealClue(params[0]);
        break;
      case 'trigger_event':
        this.triggerEvent(params.join(' '));
        break;
      case 'advance_phase':
        this.advanceGamePhase();
        break;
      case 'narrate':
        this.addNarration(params.join(' '));
        break;
      case 'respond_to_player':
        this.respondToPlayer(params[0], params.slice(1).join(' '));
        break;
      default:
        console.warn(`Unknown Game Master action: ${action}`);
    }
  
    messageBus.updateGameState(this.state);
  }
  
  private revealClue(clueId: string) {
    const clue = this.state.clues.find(c => c.id === clueId);
    if (clue) {
      clue.discovered = true;
      this.addToChatHistory('game_master', `A new clue has been revealed: ${clue.description}`);
    }
  }
  
  private triggerEvent(eventDescription: string) {
    this.state.events.push(eventDescription);
    this.addToChatHistory('game_master', `Event occurred: ${eventDescription}`);
  }
  
  private advanceGamePhase() {
    updateGamePhase(this.state);
    this.addToChatHistory('game_master', `The game has entered a new phase: ${this.state.gamePhase}`);
  }
  
  private addNarration(narration: string) {
    this.addToChatHistory('game_master', narration);
  }
  
  private respondToPlayer(playerId: string, response: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      this.addToChatHistory('game_master', `To ${player.name}: ${response}`);
    }
  }

  private introduceCharacters(): void {
    for (const player of this.state.players) {
      this.addToChatHistory('game_master', `Introducing ${player.name}, the ${player.role}.`);
    }
  }

  private startFirstTurn(): void {
    this.state.currentTurn = this.state.players[0].id;
    this.addToChatHistory('game_master', `The game begins. It's ${this.state.players[0].name}'s turn.`);
    if (this.state.currentTurn !== 'user') {
      this.processAITurn(this.state.currentTurn);
    }
  }
}

export const gameEngine = new GameEngine();