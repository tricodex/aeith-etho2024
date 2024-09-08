// src/app/api/game-master/update-state/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { cleanJson } from '@/utils/cleanJson'; // Import the cleanJson utility

// Initialize the API client with your environment variable for the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Define the expected JSON schema using SchemaType
const gameStateSchema = {
  type: SchemaType.OBJECT,
  properties: {
    players: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          position: {
            type: SchemaType.OBJECT,
            properties: {
              x: { type: SchemaType.NUMBER },
              y: { type: SchemaType.NUMBER },
            },
          },
          inventory: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
      },
    },
    discoveredRooms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    revealedClues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    gameProgress: { type: SchemaType.NUMBER },
    currentTurn: { type: SchemaType.STRING },
    events: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
};

// Default data for fallback
const defaultGameState = {
  players: [],
  discoveredRooms: [],
  revealedClues: [],
  gameProgress: 0,
  currentTurn: "N/A",
  events: ["No significant events."],
};

export async function POST(request: Request) {
  console.group('Game State Update Process');
  console.time('Game State Update API Call');

  try {
    const { currentState, playerActions } = await request.json();
    console.log('Updating game state based on player actions:', playerActions);

    // Prompt to update the game state
    const prompt = `
    Update the game state based on the following:
    Current State: ${JSON.stringify(currentState)}
    Player Actions: ${JSON.stringify(playerActions)}
    Provide an updated game state, including player positions, discovered rooms, revealed clues, game progress, and any new events. Respond in a structured JSON format.
    `;

    // Make the API call to Gemini 1.5 flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",  // Enforce JSON response
        responseSchema: gameStateSchema,  // Provide the expected schema
      },
    });

    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text();
    console.log('Raw AI response:', rawResponse);

    // Clean and parse the JSON response
    const cleanedText = cleanJson(rawResponse);  // Use the cleanJson function to sanitize the response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);  // Parse the response into JSON
    } catch (error) {
      console.error('Failed to parse AI response. Response might not be valid JSON:', error);
      throw new Error('Invalid AI response format');
    }

    console.log('Parsed AI response:', JSON.stringify(parsedResponse, null, 2));

    // Log the updated game state
    console.log('Updated Game State:', parsedResponse);

    console.timeEnd('Game State Update API Call');
    console.groupEnd();
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error updating game state:', error);

    console.timeEnd('Game State Update API Call');
    console.groupEnd();

    // Return default game state in case of error
    return NextResponse.json(defaultGameState, { status: 500 });
  }
}