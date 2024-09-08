// src/app/api/game-master/generate-event/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const NarrativeEvent = z.object({
  eventType: z.enum(['atmospheric', 'character', 'clue', 'obstacle']),
  description: z.string(),
  affectedPlayers: z.array(z.string()),
  gameStateChanges: z.object({
    newClue: z.string().optional(),
    roomEffect: z.object({ room: z.string(), effect: z.string() }).optional(),
    playerEffect: z.object({ player: z.string(), effect: z.string() }).optional()
  })
});

export async function POST(request: Request) {
  try {
    const { gameState } = await request.json();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Generate a narrative event for the murder mystery game based on the current game state:
          Game State: ${JSON.stringify(gameState)}
          Provide an event that adds excitement, reveals clues, or creates obstacles for the players. Include the event type, description, affected players, and any changes to the game state. Respond in a structured JSON format.` }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      },
    });

    const generatedText = await result.response.text();
    const structuredEvent = JSON.parse(generatedText);
    const narrativeEvent = NarrativeEvent.parse(structuredEvent);

    return NextResponse.json(narrativeEvent);
  } catch (error) {
    console.error('Error generating narrative event:', error);
    return NextResponse.json({ error: 'Failed to generate narrative event' }, { status: 500 });
  }
}
