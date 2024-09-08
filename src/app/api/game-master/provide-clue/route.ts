// src/app/api/game-master/provide-clue/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const ClueInformation = z.object({
  clueType: z.enum(['physical', 'testimony', 'deduction']),
  description: z.string(),
  relevance: z.string(),
  difficulty: z.number().min(1).max(10),
  relatedEvidence: z.array(z.string())
});

export async function POST(request: Request) {
  try {
    const { player, location, gameProgress } = await request.json();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `Provide a clue for the murder mystery game based on the following:
          Player: ${player}
          Location: ${location}
          Game Progress: ${gameProgress}
          Generate a clue that helps progress the investigation. Include the clue type, description, relevance to the case, difficulty level, and any related evidence. Respond in a structured JSON format.` }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      },
    });

    const generatedText = await result.response.text();
    const structuredClue = JSON.parse(generatedText);
    const clueInformation = ClueInformation.parse(structuredClue);

    return NextResponse.json(clueInformation);
  } catch (error) {
    console.error('Error providing clue:', error);
    return NextResponse.json({ error: 'Failed to provide clue' }, { status: 500 });
  }
}