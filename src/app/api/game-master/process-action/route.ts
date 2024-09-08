// src/app/api/game-master/process-action/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { cleanJson } from '@/utils/cleanJson'; // Import the cleanJson utility

// Initialize the API client with your environment variable for the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Define the expected JSON schema using SchemaType
const actionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    success: { type: SchemaType.BOOLEAN },
    message: { type: SchemaType.STRING },
    stateChanges: {
      type: SchemaType.OBJECT,
      properties: {
        playerPosition: {
          type: SchemaType.OBJECT,
          properties: {
            x: { type: SchemaType.NUMBER },
            y: { type: SchemaType.NUMBER },
          },
        },
        roomDiscovered: { type: SchemaType.STRING },
        itemFound: { type: SchemaType.STRING },
        clueRevealed: { type: SchemaType.STRING },
      },
    },
    narrativeDescription: { type: SchemaType.STRING },
  },
};

// Default data for fallback
const defaultActionResult = {
  success: false,
  message: 'Action failed to process.',
  stateChanges: {},
  narrativeDescription: 'No action could be processed.',
};

export async function POST(request: Request) {
  console.group('Player Action Processing');
  console.time('Action Processing API Call');

  try {
    const { playerName, action, gameState } = await request.json();
    console.log(`Processing action for player: ${playerName}`);

    // Prompt to process the player action
    const prompt = `
    Process the following player action in the murder mystery game:
    Player: ${playerName}
    Action: ${JSON.stringify(action)}
    Current Game State: ${JSON.stringify(gameState)}
    Provide the result of this action, including any state changes and a narrative description. Respond in a structured JSON format.
    `;

    // Make the API call to Gemini 1.5 flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",  // Enforce JSON response
        responseSchema: actionSchema,  // Provide the expected schema
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

    // Log the action result
    console.log('Action Result:', parsedResponse);

    console.timeEnd('Action Processing API Call');
    console.groupEnd();
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error processing player action:', error);

    console.timeEnd('Action Processing API Call');
    console.groupEnd();

    // Return default data in case of error
    return NextResponse.json(defaultActionResult, { status: 500 });
  }
}