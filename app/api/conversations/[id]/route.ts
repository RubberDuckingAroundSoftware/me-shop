import { NextRequest, NextResponse } from 'next/server';
import { appendMessage, getConversation } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import type { ChatMessage } from '@/lib/types';
import { nowIso } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const conversation = getConversation(params.id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ conversation });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const message = body?.message as ChatMessage | undefined;
  if (!message || !message.role || typeof message.content !== 'string') {
    return NextResponse.json(
      { error: 'message with role and content is required' },
      { status: 400 }
    );
  }
  const conversation = appendMessage(params.id, user.id, {
    role: message.role,
    content: message.content,
    timestamp: message.timestamp || nowIso(),
  });
  if (!conversation) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({ conversation });
}
