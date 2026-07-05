import { NextRequest, NextResponse } from 'next/server';
import { getLlmConfig, updateLlmConfig } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import type { LLMConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PROVIDERS: LLMConfig['provider'][] = ['ollama', 'cloud', 'none'];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ config: getLlmConfig(user.id) });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const provider = body?.provider as LLMConfig['provider'];
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: 'provider must be one of: ollama, cloud, none' },
      { status: 400 }
    );
  }

  const current = getLlmConfig(user.id);
  const config = updateLlmConfig(user.id, {
    provider,
    baseURL: typeof body.baseURL === 'string' ? body.baseURL : current.baseURL,
    apiKey: typeof body.apiKey === 'string' ? body.apiKey : current.apiKey,
    model:
      typeof body.model === 'string' && body.model ? body.model : current.model,
  });
  return NextResponse.json({ config });
}
