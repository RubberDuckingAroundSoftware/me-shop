import { NextRequest, NextResponse } from 'next/server';
import { createConversation, getProject, listConversations } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId query param is required' },
      { status: 400 }
    );
  }
  return NextResponse.json({
    conversations: listConversations(projectId, user.id),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const projectId = body?.projectId;
  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }
  if (!getProject(projectId, user.id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const conversation = createConversation(projectId, user.id);
  return NextResponse.json({ conversation }, { status: 201 });
}
