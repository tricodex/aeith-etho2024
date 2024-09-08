// src/app/api/add-message/route.ts

import { NextResponse } from 'next/server';
import AgentGrab from '@/utils/AgentGrab';

const agentGrab = new AgentGrab();

export async function POST(request: Request) {
  try {
    const { message, chatId } = await request.json();
    await agentGrab.addMessage(message, chatId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}