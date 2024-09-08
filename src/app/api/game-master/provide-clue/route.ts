// src/app/api/game-master/provide-clue/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { cleanJson } from '@/utils/cleanJson'; // Import the cleanJson utility

// Initialize the API client with your environment variable for the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Define the expected JSON schema using SchemaType
const clueSchema = {
  type: SchemaType.OBJECT,
  properties: {
    clueType: { type: SchemaType.STRING, enum: ['physical', 'testimony', 'deduction'] },
    description: { type: SchemaType.STRING },
    relevance: { type: SchemaType.STRING },
    difficulty: { type: SchemaType.NUMBER, minimum: 1, maximum: 10 },
    relatedEvidence: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
};

// Default data for fallback
const defaultClue = {
  clueType: 'physical',
  description: 'A vague clue that does not help much.',
  relevance: 'Low relevance to the case.',
  difficulty: 1,
  relatedEvidence: ['No evidence found.'],
};

export async function POST(request: Request) {
  console.group('Clue Provision Process');
  console.time('Clue Provision API Call');

  try {
    const { player, location, gameProgress } = await request.json();
    console.log(`Generating clue for player: ${player} at location: ${location}`);

    // Prompt to provide a clue based on the game progress
    const prompt = `
    Provide a clue for the murder mystery game based on the following:
    Player: ${player}
    Location: ${location}
    Game Progress: ${JSON.stringify(gameProgress)}
    Generate a clue that helps progress the investigation. Include the clue type, description, relevance to the case, difficulty level, and any related evidence. Respond in a structured JSON format.
    `;

    // Make the API call to Gemini 1.5 flash model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",  // Enforce JSON response
        responseSchema: clueSchema,  // Provide the expected schema
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

    // Log the clue information
    console.log('Clue Information:', parsedResponse);

    console.timeEnd('Clue Provision API Call');
    console.groupEnd();
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.error('Error providing clue:', error);

    console.timeEnd('Clue Provision API Call');
    console.groupEnd();

    // Return default data in case of error
    return NextResponse.json(defaultClue, { status: 500 });
  }
}