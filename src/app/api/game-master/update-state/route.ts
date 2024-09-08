// src/app/api/game-master/update-state/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const UpdatedGameState = z.object({
  players: z.array(z.object({
    name: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    inventory: z.array(z.string())
  })),
  discoveredRooms: z.array(z.string()),
  revealedClues: z.array(z.string()),
  gameProgress: z.number(),
  currentTurn: z.string(),
  events: z.array(z.string())
});

export async function POST(request: Request) {
  try {
    const { currentState, playerActions } = await request.json();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Update the game state based on the following:
          Current State: ${JSON.stringify(currentState)}
          Player Actions: ${JSON.stringify(playerActions)}
          Provide an updated game state, including player positions, discovered rooms, revealed clues, game progress, and any new events. Respond in a structured JSON format.` }]
      }],
      generationConfig: {
        temperature: 0.6,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1536,
      },
    });

    const generatedText = await result.response.text();
    const structuredState = JSON.parse(generatedText);
    const updatedGameState = UpdatedGameState.parse(structuredState);

    return NextResponse.json(updatedGameState);
  } catch (error) {
    console.error('Error updating game state:', error);
    return NextResponse.json({ error: 'Failed to update game state' }, { status: 500 });
  }
}
