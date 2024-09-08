// src/app/api/game-master/generate-event/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { cleanJson } from '@/utils/cleanJson'; // Import the cleanJson utility

// Initialize the API client with your environment variable for the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Define the expected JSON schema using SchemaType
const eventSchema = {
  type: SchemaType.OBJECT,
  properties: {
    eventType: { type: SchemaType.STRING, enum: ['atmospheric', 'character', 'clue', 'obstacle'] },
    description: { type: SchemaType.STRING },
    affectedPlayers: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    gameStateChanges: {
      type: SchemaType.OBJECT,
      properties: {
        newClue: { type: SchemaType.STRING },
        roomEffect: {
          type: SchemaType.OBJECT,
          properties: {
            room: { type: SchemaType.STRING },
            effect: { type: SchemaType.STRING },
          },
        },
        playerEffect: {
          type: SchemaType.OBJECT,
          properties: {
            player: { type: SchemaType.STRING },
            effect: { type: SchemaType.STRING },
          },
        },
      },
    },
  },
};

// Default data for fallback
const defaultEvent = {
  eventType: 'atmospheric',
  description: 'A strange gust of wind blows through the mansion, unsettling the players.',
  affectedPlayers: [],
  gameStateChanges: {},
};

export async function POST(request: Request) {
  console.group('Event Generation Process');
  console.time('Event Generation API Call');

  try {
    const { gameState } = await request.json();
    console.log('Generating event based on current game state:', gameState);

    // Prompt to generate a narrative event
    const prompt = `
    Generate a narrative event for the murder mystery game based on the current game state:
    Game State: ${JSON.stringify(gameState)}
    Provide an event that adds excitement, reveals clues, or creates obstacles for the players. Include the event type, description, affected players, and any changes to the game state. Respond in a structured JSON format.
    `;

    // Make the API call to Gemini 1.5 flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",  // Enforce JSON response
        responseSchema: eventSchema,  // Provide the expected schema
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

    // Log the generated event
    console.log('Generated Event:', parsedResponse);

    console.timeEnd('Event Generation API Call');
    console.groupEnd();
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error generating narrative event:', error);

    console.timeEnd('Event Generation API Call');
    console.groupEnd();

    // Return default event in case of error
    return NextResponse.json(defaultEvent, { status: 500 });
  }
}