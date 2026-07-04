import { NextRequest, NextResponse } from 'next/server';
import { createProject, listProjects } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { scenarios } from '@/lib/scenarios';
import type { ScenarioId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ projects: listProjects(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const scenarioId = body?.scenarioId as ScenarioId | undefined;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!scenarioId || !scenarios[scenarioId]) {
    return NextResponse.json(
      { error: 'valid scenarioId is required' },
      { status: 400 }
    );
  }

  const project = createProject({ userId: user.id, name, scenarioId });
  return NextResponse.json({ project }, { status: 201 });
}
