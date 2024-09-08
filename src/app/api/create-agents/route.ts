// src/app/api/create-agent/route.ts

import { NextResponse } from 'next/server';
import AgentGrab from '@/utils/AgentGrab';

const agentGrab = new AgentGrab();

export async function POST(request: Request) {
  try {
    const { message, maxIterations } = await request.json();
    const chatId = await agentGrab.createAgent(message, maxIterations);
    return NextResponse.json({ chatId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}