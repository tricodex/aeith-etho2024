import { GameState, GameAction, Player, ChatEntry, Clue, Item, Position, ActionType } from '@/types/gameTypes';
import GameAgentsGrab from '../GameAgentsGrab';
import { createDefaultGameState, initializeGame } from './gameInitialization';
import { processAction, processAITurns, provideClue } from './gameActions';
import { addToChatHistory, isGameOver, updateGamePhase, getRoomAtPosition, movePlayer, validateAccusation } from './gameHelpers';
import { messageBus } from '../MessageBus';

const actionTypeMap: { [key: string]: ActionType } = {
  move: 'move',
  search: 'search',
  examine: 'examine',
  accuse: 'accuse',
  chat: 'chat',
  use: 'use_item',
  pickup: 'pickup',
  drop: 'drop',
};

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function fuzzyMatch(input: string, target: string): boolean {
  const normalizedInput = normalizeText(input);
  const normalizedTarget = normalizeText(target);
  return normalizedInput.includes(normalizedTarget) || normalizedTarget.includes(normalizedInput);
}

function findBestMatchingActionType(input: string): ActionType {
  for (const [key, value] of Object.entries(actionTypeMap)) {
    if (fuzzyMatch(input, key)) {
      return value;
    }
  }
  return 'chat'; // Default to chat if no match is found
}

export class GameEngine {
  private state: GameState;
  private gameAgentsGrab: GameAgentsGrab;
  private chatHistory: ChatEntry[];
  private turnQueue: string[] = [];
  private processingTurn: boolean = false;

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

      this.state.currentTurn = this.getNextTurn();
      this.turnQueue.push(this.state.currentTurn);
      this.processTurnQueue();

      return this.state;
    } catch (error) {
      console.error('Error processing action:', error);
      this.addToChatHistory('game_master', `Error: ${(error as Error).message}`);
      return this.state;
    }
  }

  private async processTurnQueue() {
    if (this.processingTurn || this.turnQueue.length === 0) return;

    this.processingTurn = true;
    const playerId = this.turnQueue.shift();

    if (playerId) {
      if (playerId === 'user') {
        // Wait for user input
        this.processingTurn = false;
      } else {
        await this.processAITurn(playerId);
        this.processingTurn = false;
        setTimeout(() => this.processTurnQueue(), 5000); // 5-second delay between AI turns
      }
    } else {
      this.processingTurn = false;
    }
  }

  private async processAITurn(playerId: string) {
    const aiAction = await this.gameAgentsGrab.generateAgentAction(playerId, this.state);
    await this.processAction(aiAction);
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
      if (message.role === 'user') {
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
    const tokens = content.split(/\s+/);
    const possibleActionType = tokens[0];
    const details = tokens.slice(1).join(' ');

    const actionType = findBestMatchingActionType(possibleActionType);

    switch (actionType) {
      case 'move':
        const directionMatch = details.match(/\b(north|south|east|west)\b/i);
        return { 
          type: 'move', 
          playerId: 'user', 
          details: { direction: directionMatch ? directionMatch[0].toLowerCase() : 'north' } 
        };
      case 'search':
        return { type: 'search', playerId: 'user', details: {} };
      case 'examine':
        return { type: 'examine', playerId: 'user', details: { targetId: details } };
      case 'accuse':
        const [suspectId, weaponId, locationId] = details.split(/\s*,\s*/);
        return { 
          type: 'accuse', 
          playerId: 'user', 
          details: { suspectId, weaponId, locationId } 
        };
      case 'use_item':
        return { type: 'use_item', playerId: 'user', details: { itemId: details } };
      case 'pickup':
        return { type: 'pickup', playerId: 'user', details: { itemId: details } };
      case 'drop':
        return { type: 'drop', playerId: 'user', details: { itemId: details } };
      case 'chat':
      default:
        return { type: 'chat', playerId: 'user', details: { message: content } };
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