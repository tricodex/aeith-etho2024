// src/utils/game-engine/gameEngine.ts

import { GameState, GameAction, Player, Clue, ChatEntry, ActionType } from '@/types/gameTypes';
import { GroupAgentsGrab } from '../GroupAgentsGrab';
import { createDefaultGameState, initializeGame } from './gameInitialization';
import { processAction, provideClue } from './gameActions';
import { addToChatHistory, isGameOver, updateGamePhase, getRoomAtPosition } from './gameHelpers';
import { messageBus } from '../MessageBus';

const agents = [
  { id: 'blue-fish', name: 'Blue Fish', avatar: '/svgs/blue-fish.svg' },
  { id: 'orange-crab', name: 'Orange Crab', avatar: '/svgs/orange-crab.svg' },
  { id: 'green-turtle', name: 'Green Turtle', avatar: '/svgs/green-turtle.svg' },
  { id: 'red-donkey', name: 'Red Donkey', avatar: '/svgs/red-donkey.svg' },
];

export class GameEngine {
  private state: GameState;
  private groupAgentsGrab: GroupAgentsGrab;
  private chatHistory: ChatEntry[];
  private currentTurnActions: { chat: boolean; action: boolean } = { chat: false, action: false };
  private processingMessage: boolean = false;

  constructor() {
    this.state = createDefaultGameState();
    this.groupAgentsGrab = new GroupAgentsGrab();
    this.chatHistory = [];
    messageBus.subscribe('game_engine', this.handleMessage.bind(this));
  }

  public async initializeGame(): Promise<void> {
    try {
      this.state = await initializeGame();
      messageBus.updateGameState(this.state);
      this.addToChatHistory('game_master', 'The game has been initialized. Welcome to the Haunted Mansion!');
      await this.groupAgentsGrab.initializeChat('Welcome to the group chat!');
      for (const agent of agents) {
        const agentMessages = await this.groupAgentsGrab.getMessages(agent.id);
        this.chatHistory.push(...agentMessages.map(msg => ({ 
          role: msg.role, 
          content: msg.content[0].value, 
          agentId: agent.id 
        })));
      }
      this.introduceCharacters();
      this.startFirstTurn();
    } catch (error) {
      console.error('Error initializing game:', error);
      this.state = createDefaultGameState();
      this.addToChatHistory('game_master', 'Failed to initialize the game. Starting with default state.');
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
      this.addToChatHistory('game_master', `It's not ${action.playerId}'s turn.`);
      return this.state;
    }

    try {
      if (action.type === 'chat') {
        this.currentTurnActions.chat = true;
        this.addToChatHistory(action.playerId, action.details.message);
        
        if (action.playerId !== 'user') {
          await this.groupAgentsGrab.addMessage(action.playerId, action.details.message);
        }

        // Process AI responses if the user sent a message
        if (action.playerId === 'user') {
          for (const agent of agents) {
            await this.groupAgentsGrab.addMessage(agent.id, action.details.message);
            const response = await this.groupAgentsGrab.getAgentResponse(agent.id);
            this.addToChatHistory(agent.id, response);
          }
        }
      } else {
        this.currentTurnActions.action = true;
        const updatedState = await processAction(this.state, action, this.addToChatHistory.bind(this));
        this.state = updatedState;
      }

      messageBus.updateGameState(this.state);

      if (this.currentTurnActions.chat && this.currentTurnActions.action) {
        await this.endTurn();
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
      const response = await this.groupAgentsGrab.getAgentResponse(playerId);
      const parsedResponse = this.parseAIResponse(response, playerId);
      
      if (parsedResponse.speech) {
        await this.processAction({ type: 'chat', playerId, details: { message: parsedResponse.speech } });
      }

      if (parsedResponse.action) {
        await this.processAction({ ...parsedResponse.action, playerId });
      }
    } catch (error) {
      console.error(`Error processing AI turn for ${playerId}:`, error);
      this.addToChatHistory('game_master', `${playerId} encountered an issue and skipped their turn.`);
    }

    await this.endTurn();
  }

  private parseAIResponse(response: string, playerId: string): { speech?: string; action?: GameAction } {
    try {
      const parsed = JSON.parse(response);
      return {
        speech: parsed.speech,
        action: parsed.action ? {
          type: this.parseActionType(parsed.action.type),
          playerId,
          details: parsed.action.details
        } : undefined
      };
    } catch (error) {
      console.warn(`Failed to parse JSON for ${playerId}, attempting regex extraction:`, error);
      
      const speechMatch = response.match(/"speech"\s*:\s*"([^"]+)"/);
      const actionTypeMatch = response.match(/"type"\s*:\s*"([^"]+)"/);
      const actionDetailsMatch = response.match(/"details"\s*:\s*(\{[^}]+\}|\[[^\]]+\]|"[^"]+")/);

      return {
        speech: speechMatch ? speechMatch[1] : undefined,
        action: actionTypeMatch ? {
          type: this.parseActionType(actionTypeMatch[1]),
          playerId,
          details: actionDetailsMatch ? JSON.parse(actionDetailsMatch[1]) : {}
        } : undefined
      };
    }
  }

  private parseActionType(actionType: string): ActionType {
    const validTypes: ActionType[] = ['move', 'search', 'examine', 'accuse', 'chat'];
    return validTypes.includes(actionType as ActionType) ? actionType as ActionType : 'search';
  }

  public async endTurn() {
    this.currentTurnActions = { chat: false, action: false };
    this.state.currentTurn = this.getNextTurn();
    this.addToChatHistory('game_master', `${this.state.currentTurn}'s turn begins.`);

    if (this.state.currentTurn !== 'user') {
      await this.processAITurn(this.state.currentTurn);
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
    if (this.processingMessage) return;
    this.processingMessage = true;
    try {
      if (message.role === 'user' && this.state.currentTurn === 'user') {
        const action = this.parseUserMessage(message.content);
        await this.processAction(action);
      } else if (message.role === 'game_master') {
        await this.handleGameMasterMessage(message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.addToChatHistory('game_master', 'An unexpected error occurred. Please try your action again.');
    } finally {
      this.processingMessage = false;
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
  
  private async handleGameMasterMessage(message: ChatEntry) {
    console.log('Game Master message:', message.content);
  
    if (!message.content.includes(':')) {
      await this.addNarration(message.content);
      return;
    }

    const [action, ...params] = message.content.split(':');
    const content = params.join(':').trim();
  
    switch (action.trim().toLowerCase()) {
      case 'reveal_clue':
        await this.revealClue(content);
        break;
      case 'trigger_event':
        await this.triggerEvent(content);
        break;
      case 'advance_phase':
        await this.advanceGamePhase();
        break;
      case 'narrate':
        await this.addNarration(content);
        break;
      case 'respond_to_player':
        const [playerId, ...response] = content.split(' ');
        await this.respondToPlayer(playerId, response.join(' '));
        break;
      case 'turn begins':
        await this.startTurn(content);
        break;
      case 'encountered an issue':
        await this.handleAgentIssue(content);
        break;
      default:
        console.warn(`Unknown Game Master action: ${action}`);
        await this.addNarration(message.content);
    }
  
    messageBus.updateGameState(this.state);
  }
  
  private async revealClue(clueId: string) {
    const clue = this.state.clues.find(c => c.id === clueId);
    if (clue) {
      clue.discovered = true;
      this.addToChatHistory('game_master', `A new clue has been revealed: ${clue.description}`);
    }
  }
  
  private async triggerEvent(eventDescription: string) {
    this.state.events.push(eventDescription);
    this.addToChatHistory('game_master', `Event occurred: ${eventDescription}`);
  }
  
  private async advanceGamePhase() {
    updateGamePhase(this.state);
    this.addToChatHistory('game_master', `The game has entered a new phase: ${this.state.gamePhase}`);
  }
  
  private async addNarration(narration: string) {
    this.addToChatHistory('game_master', narration);
  }
  
  private async respondToPlayer(playerId: string, response: string) {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      this.addToChatHistory('game_master', `To ${player.name}: ${response}`);
    }
  }

  private async startTurn(playerName: string) {
    this.state.currentTurn = playerName;
    this.addToChatHistory('game_master', `${playerName}'s turn begins.`);
  }

  private async handleAgentIssue(agentName: string) {
    this.addToChatHistory('game_master', `${agentName} encountered an issue and skipped their turn.`);
    await this.endTurn();
  }

  private introduceCharacters(): void {
    for (const player of this.state.players) {
      this.addToChatHistory('game_master', `Introducing ${player.name}, the ${player.role}.`);
    }
  }

  private async startFirstTurn(): Promise<void> {
    this.state.currentTurn = this.state.players[0].id;
    this.addToChatHistory('game_master', `The game begins. It's ${this.state.players[0].name}'s turn.`);
    if (this.state.currentTurn !== 'user') {
      await this.processAITurn(this.state.currentTurn);
    }
  }
}

export const gameEngine = new GameEngine();