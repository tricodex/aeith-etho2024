import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MarketAnalysis = z.object({
  overallSentiment: z.enum(["Bullish", "Bearish", "Neutral"]),
  keyFactors: z.array(z.string()),
  potentialRisks: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const { asset } = await request.json();

    const completion = await openai.beta.chat.completions.parse({
              model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a financial analyst. Provide a market analysis for the given asset." },
        { role: "user", content: `Analyze the market for ${asset}. Include overall sentiment, key factors, potential risks, and recommendations.` }
      ],
      response_format: { type: "json_object" },
    });

    const structuredAnalysis = JSON.parse(completion.choices[0].message.content || '{}');
    const analysis = MarketAnalysis.parse(structuredAnalysis);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error in market analysis:', error);
    return NextResponse.json({ error: 'Failed to generate market analysis' }, { status: 500 });
  }
}