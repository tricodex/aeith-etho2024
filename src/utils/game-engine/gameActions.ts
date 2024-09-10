// src/utils/game-engine/gameActions.ts

import { GameState, GameAction, Player, Position, Item, Clue } from '@/types/gameTypes';
import { getRoomAtPosition, advanceTurn, addClueToGame, generateLocalClue, updateGameState } from './gameState';
import GameAgentsGrab from '../GameAgentsGrab';

export async function processAction(state: GameState, action: GameAction, addToChatHistory: Function): Promise<GameState> {
    try {
      // Process action through the game master API
      const response = await fetch('/api/game-master/process-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: action.playerId, action, gameState: state }),
      });
      if (!response.ok) throw new Error('Failed to process action');
      const result = await response.json();
  
      // Update game state and chat history
      updateGameState(state, result);
      addToChatHistory('user', `${action.playerId} performed action: ${action.type}`);
      addToChatHistory('game_master', result.narrativeDescription || 'The action was processed.');
  
      // Advance turn only after processing the action
      advanceTurn(state);
  
      return state;
    } catch (error) {
      console.error('Error processing action:', error);
      return state;
    }
  }

// export async function processAITurns(state: GameState, gameAgentsGrab: GameAgentsGrab, addToChatHistory: Function): Promise<void> {
//   for (const player of state.players) {
//     if (player.role === 'ai' && player.id === state.currentTurn) {
//       const aiAction = await gameAgentsGrab.generateAgentAction(player.id, state);
//       await processAction(state, aiAction, gameAgentsGrab, addToChatHistory);
//     }
//   }
// }

// function handleActionLocally(state: GameState, action: GameAction, addToChatHistory: Function): GameState {
//   const player = state.players.find(p => p.id === action.playerId);
//   if (!player) return state;

//   switch (action.type) {
//     case 'move':
//       return handleMove(state, player, action.details as { direction: string }, addToChatHistory);
//     case 'search':
//       return handleSearch(state, player, addToChatHistory);
//     case 'accuse':
//       return handleAccusation(state, player, action.details as { suspectId: string, weaponId: string, locationId: string }, addToChatHistory);
//     case 'use_item':
//       return handleUseItem(state, player, action.details as { itemId: string }, addToChatHistory);
//     case 'chat':
//       return handleChat(state, player, action.details as { message: string }, addToChatHistory);
//     case 'pickup':
//       return handlePickup(state, player, action.details as { itemId: string }, addToChatHistory);
//     case 'drop':
//       return handleDrop(state, player, action.details as { itemId: string }, addToChatHistory);
//     case 'examine':
//       return handleExamine(state, player, action.details as { targetId: string }, addToChatHistory);
//     default:
//       console.error('Invalid action type:', action.type);
//       return state;
//   }
// }

function handleMove(state: GameState, player: Player, details: { direction: string }, addToChatHistory: Function): GameState {
  const { dx, dy } = getDirectionOffset(details.direction);
  const newPosition: Position = {
    x: Math.max(0, Math.min(9, player.position.x + dx)),
    y: Math.max(0, Math.min(9, player.position.y + dy)),
  };

  player.position = newPosition;
  const newRoom = getRoomAtPosition(state, newPosition);
  state.events.push(`${player.name} moved to ${newRoom.name}`);
  addToChatHistory('game_master', `${player.name} moved to ${newRoom.name}`);

  advanceTurn(state);
  return state;
}

function handleSearch(state: GameState, player: Player, addToChatHistory: Function): GameState {
  const room = getRoomAtPosition(state, player.position);
  const cluesInRoom = state.clues.filter(c => c.location === room.id && !c.discovered);

  if (cluesInRoom.length > 0) {
    const discoveredClue = cluesInRoom[Math.floor(Math.random() * cluesInRoom.length)];
    discoveredClue.discovered = true;
    player.knownClues.push(discoveredClue.id);
    state.events.push(`${player.name} discovered a clue: ${discoveredClue.description}`);
    addToChatHistory('game_master', `${player.name} discovered a clue: ${discoveredClue.description}`);
  } else {
    state.events.push(`${player.name} searched ${room.name} but found nothing of interest`);
    addToChatHistory('game_master', `${player.name} searched ${room.name} but found nothing of interest`);
  }

  advanceTurn(state);
  return state;
}

function handleAccusation(state: GameState, player: Player, details: { suspectId: string, weaponId: string, locationId: string }, addToChatHistory: Function): GameState {
  const { suspectId, weaponId, locationId } = details;
  const correct = 
    suspectId === state.murder.culprit &&
    weaponId === state.murder.weapon &&
    locationId === state.murder.location;

  if (correct) {
    state.gamePhase = 'conclusion';
    state.events.push(`${player.name} correctly solved the murder! Game Over!`);
    addToChatHistory('game_master', `${player.name} correctly solved the murder! Game Over!`);
  } else {
    state.events.push(`${player.name} made an incorrect accusation`);
    addToChatHistory('game_master', `${player.name} made an incorrect accusation`);
  }

  advanceTurn(state);
  return state;
}

function handleUseItem(state: GameState, player: Player, details: { itemId: string }, addToChatHistory: Function): GameState {
  const item = player.inventory.find(i => i.id === details.itemId);
  if (item) {
    state.events.push(`${player.name} used ${item.name}`);
    addToChatHistory('game_master', `${player.name} used ${item.name}`);
    // Implement item usage logic here

  } else {
    state.events.push(`${player.name} tried to use an item they don't have`);
    addToChatHistory('game_master', `${player.name} tried to use an item they don't have`);
  }
  advanceTurn(state);
  return state;
}

function handleChat(state: GameState, player: Player, details: { message: string }, addToChatHistory: Function): GameState {
  state.events.push(`${player.name}: ${details.message}`);
  addToChatHistory('player', `${player.name}: ${details.message}`);
  return state; // Chat doesn't advance the turn
}

function handlePickup(state: GameState, player: Player, details: { itemId: string }, addToChatHistory: Function): GameState {
  const room = getRoomAtPosition(state, player.position);
  const itemIndex = room.items.findIndex(i => i.id === details.itemId);
  if (itemIndex !== -1 && room.items[itemIndex].canPickUp) {
    const [item] = room.items.splice(itemIndex, 1);
    player.inventory.push(item);
    state.events.push(`${player.name} picked up ${item.name}`);
    addToChatHistory('game_master', `${player.name} picked up ${item.name}`);
  } else {
    state.events.push(`${player.name} couldn't pick up the item`);
    addToChatHistory('game_master', `${player.name} couldn't pick up the item`);
  }
  advanceTurn(state);
  return state;
}

function handleDrop(state: GameState, player: Player, details: { itemId: string }, addToChatHistory: Function): GameState {
  const itemIndex = player.inventory.findIndex(i => i.id === details.itemId);
  if (itemIndex !== -1) {
    const [item] = player.inventory.splice(itemIndex, 1);
    const room = getRoomAtPosition(state, player.position);
    room.items.push(item);
    state.events.push(`${player.name} dropped ${item.name}`);
    addToChatHistory('game_master', `${player.name} dropped ${item.name}`);
  } else {
    state.events.push(`${player.name} tried to drop an item they don't have`);
    addToChatHistory('game_master', `${player.name} tried to drop an item they don't have`);
  }
  advanceTurn(state);
  return state;
}

function handleExamine(state: GameState, player: Player, details: { targetId: string }, addToChatHistory: Function): GameState {
  const room = getRoomAtPosition(state, player.position);
  const item = room.items.find(i => i.id === details.targetId);
  const otherPlayer = state.players.find(p => p.id === details.targetId && p.position.x === player.position.x && p.position.y === player.position.y);
  
  if (item) {
    state.events.push(`${player.name} examined ${item.name}: ${item.description}`);
    addToChatHistory('game_master', `${player.name} examined ${item.name}: ${item.description}`);
  } else if (otherPlayer) {
    state.events.push(`${player.name} examined ${otherPlayer.name}`);
    addToChatHistory('game_master', `${player.name} examined ${otherPlayer.name}`);
  } else {
    state.events.push(`${player.name} found nothing to examine`);
    addToChatHistory('game_master', `${player.name} found nothing to examine`);
  }
  
  advanceTurn(state);
  return state;
}

export async function provideClue(state: GameState, player: Player, addToChatHistory: Function): Promise<Clue | null> {
  try {
    const response = await fetch('/api/game-master/provide-clue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player: player.id,
        location: getRoomAtPosition(state, player.position).id,
        gameProgress: state.turnCount / 10 // Simple progress metric
      }),
    });

    if (!response.ok) throw new Error('Failed to provide clue');

    const clue: Clue = await response.json();
    addClueToGame(state, clue, player);
    addToChatHistory('game_master', `${player.name} found a new clue: ${clue.description}`);
    return clue;
  } catch (error) {
    console.error('Error providing clue:', error);
    const localClue = generateLocalClue(state, player);
    addToChatHistory('game_master', `${player.name} found a new clue: ${localClue.description}`);
    return localClue;
  }
}

export function isGameOver(state: GameState): boolean {
  return state.gamePhase === 'conclusion';
}

function getDirectionOffset(direction: string): { dx: number, dy: number } {
  switch (direction.toLowerCase()) {
    case 'north': return { dx: 0, dy: -1 };
    case 'south': return { dx: 0, dy: 1 };
    case 'east': return { dx: 1, dy: 0 };
    case 'west': return { dx: -1, dy: 0 };
    default: throw new Error(`Invalid direction: ${direction}`);
  }
}