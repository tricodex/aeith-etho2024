// src/app/api/game-master/initialize/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const GameInitialization = z.object({
  mansion: z.object({
    layout: z.array(z.array(z.string())),
    rooms: z.array(z.object({
      name: z.string(),
      description: z.string(),
      items: z.array(z.string())
    }))
  }),
  players: z.array(z.object({
    name: z.string(),
    role: z.string(),
    position: z.object({ x: z.number(), y: z.number() })
  })),
  murder: z.object({
    victim: z.string(),
    weapon: z.string(),
    location: z.string(),
    culprit: z.string()
  }),
  clues: z.array(z.object({
    description: z.string(),
    location: z.string()
  }))
});

export async function POST() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: 'Initialize a new murder mystery game in a haunted mansion. Provide a 10x10 grid layout, room descriptions, player positions, murder details, and hidden clues. Respond in a structured JSON format.' }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });

    const generatedText = await result.response.text();
    const structuredInitialization = JSON.parse(generatedText);
    const gameInitialization = GameInitialization.parse(structuredInitialization);

    return NextResponse.json(gameInitialization);
  } catch (error) {
    console.error('Error in game initialization:', error);
    return NextResponse.json({ error: 'Failed to initialize game' }, { status: 500 });
  }
}
