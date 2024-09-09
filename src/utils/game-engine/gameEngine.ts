// src/utils/game-engine/gameEngine.ts

import { GameState, GameAction, Player, ChatEntry, Room, Clue, Item } from '@/types/gameTypes';
import GameAgentsGrab from '../GameAgentsGrab';
import { createDefaultGameState, initializeGame } from './gameInitialization';
import { processAction, processAITurns, provideClue } from './gameActions';
import { addToChatHistory, isGameOver, updateGamePhase, getRoomAtPosition, movePlayer, validateAccusation } from './gameHelpers';
import { messageBus } from '../MessageBus';

export class GameEngine {
  private state: GameState;
  private gameAgentsGrab: GameAgentsGrab;
  private chatHistory: ChatEntry[];

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
    try {
      const updatedState = await processAction(this.state, action, this.gameAgentsGrab, this.addToChatHistory.bind(this));
      this.state = updatedState;
      messageBus.updateGameState(this.state);
  
      if (this.state.currentTurn !== 'user') {
        await this.processAITurns();
      }
  
      return this.state;
    } catch (error) {
      console.error('Error processing action:', error);
      this.addToChatHistory('game_master', `Error: ${(error as Error).message}`);
      return this.state;
    }
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
    if (message.role === 'user') {
      const action = this.parseUserMessage(message.content);
      await this.processAction(action);
    } else if (message.role === 'game_master') {
      this.handleGameMasterMessage(message);
    }
  }

  private parseUserMessage(content: string): GameAction {
    const [actionType, ...details] = content.split(' ');
    switch (actionType.toLowerCase()) {
      case 'move':
        return { type: 'move', playerId: 'user', details: { direction: details[0] } };
      case 'search':
        return { type: 'search', playerId: 'user', details: {} };
      case 'examine':
        return { type: 'examine', playerId: 'user', details: { targetId: details.join(' ') } };
      case 'accuse':
        return { type: 'accuse', playerId: 'user', details: { suspectId: details[0], weaponId: details[1], locationId: details[2] } };
      case 'chat':
        return { type: 'chat', playerId: 'user', details: { message: details.join(' ') } };
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  private handleGameMasterMessage(message: ChatEntry) {
    console.log('Game Master message:', message.content);
  
    const [action, ...params] = message.content.split(' ');
  
    switch (action.toLowerCase()) {
      case 'reveal_clue':
        this.revealClue(params[0]); // Param: clueId
        break;
      case 'trigger_event':
        this.triggerEvent(params.join(' ')); // Param: event description
        break;
      case 'advance_phase':
        this.advanceGamePhase();
        break;
      case 'narrate':
        this.addNarration(params.join(' ')); // Param: narration text
        break;
      case 'respond_to_player':
        this.respondToPlayer(params[0], params.slice(1).join(' ')); // Params: playerId, response
        break;
      default:
        console.warn(`Unknown Game Master action: ${action}`);
    }
  
    // Update game state after processing the message
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
    // Implement event logic here
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

  private async processAITurns() {
    await processAITurns(this.state, this.gameAgentsGrab, this.addToChatHistory.bind(this));
  }

  private introduceCharacters(): void {
    for (const player of this.state.players) {
      this.addToChatHistory('game_master', `Introducing ${player.name}, the ${player.role}.`);
    }
  }

  private startFirstTurn(): void {
    this.state.currentTurn = this.state.players[0].id;
    this.addToChatHistory('game_master', `The game begins. It's ${this.state.players[0].name}'s turn.`);
  }
}

export const gameEngine = new GameEngine();