import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const AISimulation = z.object({
  scenario: z.string(),
  agents: z.array(z.object({
    name: z.string(),
    role: z.string(),
    action: z.string(),
  })),
  outcome: z.string(),
  ethicalConsiderations: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const { scenario } = await request.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Run an AI simulation for the following scenario: ${scenario}. Include details about the agents involved, their actions, the outcome, and ethical considerations. Respond in JSON format.` }] }],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });

    const generatedText = result.response.text();
    const structuredSimulation = JSON.parse(generatedText);
    const simulation = AISimulation.parse(structuredSimulation);

    return NextResponse.json(simulation);
  } catch (error) {
    console.error('Error in AI simulation:', error);
    return NextResponse.json({ error: 'Failed to run AI simulation' }, { status: 500 });
  }
}