import { NextRequest, NextResponse } from 'next/server';
import { reorderProjects } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const projectIds = body?.projectIds;
  if (
    !Array.isArray(projectIds) ||
    !projectIds.every((id) => typeof id === 'string')
  ) {
    return NextResponse.json(
      { error: 'projectIds (string[]) is required' },
      { status: 400 }
    );
  }
  reorderProjects(user.id, projectIds);
  return NextResponse.json({ success: true });
}
