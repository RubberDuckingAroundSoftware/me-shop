import { NextResponse } from 'next/server';
import { agentHealth } from '@/lib/agent-client';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Probe the Python agent service /health endpoint (for the current user's config). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const res = await agentHealth(user.id);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Agent service returned ${res.status}.` },
        { status: 200 }
      );
    }
    const health = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, health });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Can't reach the agent service. Start it with `cd agents && uvicorn main:app --port 8000`",
      },
      { status: 200 }
    );
  }
}
