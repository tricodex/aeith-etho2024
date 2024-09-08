/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/game-master/initialize/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { cleanJson } from '@/utils/cleanJson';
import { retry } from '@lifeomic/attempt';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Define the expected JSON schema using SchemaType
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
          role: { type: SchemaType.STRING }, // Required role field
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
const defaultData = {
  gameTitle: "Default Mansion Mystery",
  grid: {
    rows: 10,
    columns: 10,
  },
  rooms: [
    {
      name: "Default Room",
      description: "A default room with basic furnishings.",
      coordinates: [0, 0],
      clues: ["A dusty chair", "A forgotten note"],
      secrets: ["A hidden drawer in the cabinet."],
    },
  ],
  players: [
    { name: "Player 1", role: "Default Role", position: { x: 0, y: 0 } },
  ],
  murderDetails: {
    victim: "Unknown",
    description: "Cause of death: poisoning.",
    murderWeapon: "poison",
    location: [0, 0],
  },
  hiddenClues: ["A hidden letter in the drawer."],
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

function validateAndFillGameState(parsedResponse: any, defaultData: any): any {
  const validated: any = { ...defaultData };

  // Validate and fill each main property
  for (const key in gameSchema.properties) {
    if (parsedResponse[key]) {
      validated[key] = validateProperty(key, parsedResponse[key], defaultData[key]);
    }
  }

  return validated;
}

function validateProperty(key: string, value: any, defaultValue: any): any {
  switch (key) {
    case 'gameTitle':
      return typeof value === 'string' ? value : defaultValue;
    case 'grid':
      return validateGrid(value, defaultValue);
    case 'rooms':
      return validateRooms(value, defaultValue);
    case 'players':
      return validatePlayers(value, defaultValue);
    case 'murderDetails':
      return validateMurderDetails(value, defaultValue);
    case 'hiddenClues':
      return Array.isArray(value) ? value : defaultValue;
    default:
      return defaultValue;
  }
}

function validateGrid(value: any, defaultValue: any): any {
  if (typeof value === 'object' && value.rows && value.columns) {
    return {
      rows: typeof value.rows === 'number' ? value.rows : defaultValue.rows,
      columns: typeof value.columns === 'number' ? value.columns : defaultValue.columns,
    };
  }
  return defaultValue;
}

function validateRooms(value: any, defaultValue: any): any {
  if (Array.isArray(value)) {
    return value.map((room: any) => ({
      name: room.name || 'Unknown Room',
      description: room.description || 'No description available.',
      coordinates: Array.isArray(room.coordinates) ? room.coordinates : [0, 0],
      clues: Array.isArray(room.clues) ? room.clues : [],
      secrets: Array.isArray(room.secrets) ? room.secrets : [],
    }));
  }
  return defaultValue;
}

function validatePlayers(value: any, defaultValue: any): any {
  if (Array.isArray(value)) {
    return value.map((player: any) => ({
      name: player.name || 'Unknown Player',
      role: player.role || 'Default Role',
      position: player.position && typeof player.position.x === 'number' && typeof player.position.y === 'number'
        ? player.position
        : { x: 0, y: 0 },
    }));
  }
  return defaultValue;
}

function validateMurderDetails(value: any, defaultValue: any): any {
  if (typeof value === 'object') {
    return {
      victim: value.victim || defaultValue.victim,
      description: value.description || defaultValue.description,
      murderWeapon: value.murderWeapon || defaultValue.murderWeapon,
      location: Array.isArray(value.location) ? value.location : defaultValue.location,
    };
  }
  return defaultValue;
}