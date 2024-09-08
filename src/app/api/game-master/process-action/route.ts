// src/app/api/game-master/process-action/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const ActionResult = z.object({
  success: z.boolean(),
  message: z.string(),
  stateChanges: z.object({
    playerPosition: z.object({ x: z.number(), y: z.number() }).optional(),
    roomDiscovered: z.string().optional(),
    itemFound: z.string().optional(),
    clueRevealed: z.string().optional()
  }),
  narrativeDescription: z.string()
});

export async function POST(request: Request) {
  try {
    const { playerName, action, gameState } = await request.json();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Process the following player action in the murder mystery game:
          Player: ${playerName}
          Action: ${JSON.stringify(action)}
          Current Game State: ${JSON.stringify(gameState)}
          Provide the result of this action, including any state changes and a narrative description. Respond in a structured JSON format.` }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      },
    });

    const generatedText = await result.response.text();
    const structuredResult = JSON.parse(generatedText);
    const actionResult = ActionResult.parse(structuredResult);

    return NextResponse.json(actionResult);
  } catch (error) {
    console.error('Error processing player action:', error);
    return NextResponse.json({ error: 'Failed to process player action' }, { status: 500 });
  }
}