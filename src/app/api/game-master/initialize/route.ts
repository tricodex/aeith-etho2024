  /* eslint-disable @typescript-eslint/no-explicit-any */
  // src/app/api/game-master/initialize/route.ts
  import { NextResponse } from 'next/server';
  import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
  import { cleanJson } from '@/utils/cleanJson';
  import { retry } from '@lifeomic/attempt';
  import { GameState, Room, Player, Clue } from '@/types/gameTypes';

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

  // Define the expected JSON schema
  const gameSchema = {
    type: SchemaType.OBJECT,
    properties: {
      gameTitle: { type: SchemaType.STRING },
      grid: {
        type: SchemaType.OBJECT,
        properties: {
          rows: { type: SchemaType.NUMBER },
          columns: { type: SchemaType.NUMBER },
        },
      },
      rooms: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            coordinates: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.NUMBER },
            },
            clues: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            secrets: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
        },
      },
      players: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            role: { type: SchemaType.STRING },
            position: {
              type: SchemaType.OBJECT,
              properties: {
                x: { type: SchemaType.NUMBER },
                y: { type: SchemaType.NUMBER },
              },
            },
          },
        },
      },
      murderDetails: {
        type: SchemaType.OBJECT,
        properties: {
          victim: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          murderWeapon: { type: SchemaType.STRING },
          location: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
          },
        },
      },
      hiddenClues: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
    },
  };

  // Default data for fallback
  const defaultData: GameState = {
    mansion: {
      layout: [['room0']],
      rooms: [{
        id: 'room0',
        name: "Default Room",
        description: "A default room with basic furnishings.",
        items: [],
        connections: [],
        discovered: false,
      }],
    },
    players: [
      { id: 'user', name: "User", role: "user", position: { x: 0, y: 0 }, inventory: [], knownClues: [] },
    ],
    currentTurn: 'user',
    gamePhase: 'investigation',
    turnCount: 0,
    clues: [],
    events: ['The game has started.'],
    murder: {
      victim: "Unknown",
      weapon: "Unknown",
      location: 'room0',
      culprit: "Unknown",
      motive: "Unknown",
    },
  };

  export async function POST() {
    console.group('Game Initialization Process');
    console.time('Game Initialization API Call');

    try {
      console.log('Starting game initialization with Google Gemini API...');

      const prompt = `
      Initialize a new murder mystery game in a haunted mansion. Provide a 10x10 grid layout, room descriptions, player positions, murder details, and hidden clues. Respond in a structured JSON format.
      `;

      const result = await retry(
        async () => {
          const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: gameSchema,
              maxOutputTokens: 2048,
            },
          });

          return await model.generateContent(prompt);
        },
        {
          maxAttempts: 3,
          delay: 1000,
          factor: 2,
        }
      );

      const rawResponse = result.response.text();
      console.log('Raw AI response:', rawResponse);

      const cleanedText = cleanJson(rawResponse);
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedText);
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        throw new Error('Invalid AI response format');
      }

      console.log('Parsed AI response:', JSON.stringify(parsedResponse, null, 2));

      // Validate and fill in missing parts with default data
      const validatedResponse = validateAndFillGameState(parsedResponse, defaultData);

      console.log('Validated response:', JSON.stringify(validatedResponse, null, 2));

      console.timeEnd('Game Initialization API Call');
      console.groupEnd();
      return NextResponse.json(validatedResponse);

    } catch (error) {
      console.error('Error during game initialization process:', error);
      console.timeEnd('Game Initialization API Call');
      console.groupEnd();
      return NextResponse.json(defaultData, { status: 500 });
    }
  }

  function validateAndFillGameState(parsedResponse: any, defaultData: GameState): GameState {
    const mansion = {
      layout: generateMansionLayout(parsedResponse.grid?.rows || 10, parsedResponse.grid?.columns || 10),
      rooms: validateRooms(parsedResponse.rooms, defaultData.mansion.rooms),
    };

    const players = validatePlayers(parsedResponse.players, defaultData.players);
    const userPlayer = players.find(p => p.role === 'user');
    if (!userPlayer) {
      players.push({
        id: 'user',
        name: 'User',
        role: 'user',
        position: { x: 0, y: 0 },
        inventory: [],
        knownClues: [],
      });
    }

    return {
      mansion,
      players,
      currentTurn: 'user',
      gamePhase: 'investigation',
      turnCount: 0,
      clues: generateClues(mansion.rooms),
      events: ['The game has started.'],
      murder: validateMurderDetails(parsedResponse.murderDetails, defaultData.murder),
    };
  }

  function generateMansionLayout(rows: number, columns: number): string[][] {
    return Array(rows).fill(null).map((_, i) => 
      Array(columns).fill(null).map((_, j) => `room${i * columns + j}`)
    );
  }

  function validateRooms(value: any[], defaultRooms: Room[]): Room[] {
    if (Array.isArray(value)) {
      return value.map((room: any, index) => ({
        id: `room${index}`,
        name: room.name || `Room ${index}`,
        description: room.description || 'No description available.',
        items: [],
        connections: [],
        discovered: false,
      }));
    }
    return defaultRooms;
  }

  function validatePlayers(value: any[], defaultPlayers: Player[]): Player[] {
    if (Array.isArray(value)) {
      return value.map((player: any, index) => ({
        id: player.name?.toLowerCase().replace(/\s+/g, '-') || `player-${index}`,
        name: player.name || `Player ${index}`,
        role: player.role === 'user' ? 'user' : 'ai',
        position: player.position && typeof player.position.x === 'number' && typeof player.position.y === 'number'
          ? player.position
          : { x: 0, y: 0 },
        inventory: [],
        knownClues: [],
      }));
    }
    return defaultPlayers;
  }

  function validateMurderDetails(value: any, defaultMurder: GameState['murder']): GameState['murder'] {
    if (typeof value === 'object') {
      return {
        victim: value.victim || defaultMurder.victim,
        weapon: value.murderWeapon || defaultMurder.weapon,
        location: value.location?.[0] ? `room${value.location[0]}` : defaultMurder.location,
        culprit: "Unknown", // To be discovered during the game
        motive: value.description || defaultMurder.motive,
      };
    }
    return defaultMurder;
  }

  function generateClues(rooms: Room[]): Clue[] {
    return rooms.flatMap((room, index) => {
      const clueTypes = ['weapon', 'motive', 'alibi', 'evidence'];
      return (room.clues || []).map((clueDescription, clueIndex) => ({
        id: `clue-${index}-${clueIndex}`,
        description: clueDescription,
        location: room.id,
        discovered: false,
        relatedTo: clueTypes[clueIndex % clueTypes.length] as 'weapon' | 'culprit' | 'motive' | 'alibi',
      }));
    });
  }