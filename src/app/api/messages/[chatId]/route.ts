// src/app/api/messages/[chatId]/route.ts

import { NextResponse } from 'next/server';
import AgentGrab from '@/utils/AgentGrab';

const agentGrab = new AgentGrab();

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const chatId = parseInt(params.chatId);
    const messages = await agentGrab.getAgentMessages(chatId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}