// src/app/api/game-master/routes.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Initialize Google Generative AI instance
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Define the expected structure for the AI simulation response
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

// Define the POST route handler
export async function POST(request: Request) {
  try {
    // Extract the scenario from the request body
    const { scenario } = await request.json();

    // Use the Generative AI model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Generate the content based on the input scenario
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Run an AI simulation for the following scenario: ${scenario}. Include detailed descriptions of the agents, their actions, the outcome, and ethical considerations. Respond in a structured JSON format.` }],
        },
      ],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    });

    // Parse the response from the AI
    const generatedText = await result.response.text();
    const structuredSimulation = JSON.parse(generatedText);

    // Validate the structured response using Zod
    const simulation = AISimulation.parse(structuredSimulation);

    // Return the simulation response as JSON
    return NextResponse.json(simulation);
  } catch (error) {
    console.error('Error in AI simulation:', error);
    return NextResponse.json({ error: 'Failed to run AI simulation' }, { status: 500 });
  }
}