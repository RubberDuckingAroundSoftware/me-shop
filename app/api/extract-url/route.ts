import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { extractProduct } from '@/lib/agent-client';
import { getScenario } from '@/lib/scenarios';

export const dynamic = 'force-dynamic';

/**
 * Proxy a product-page URL to the Python extractor service, adding auth and
 * the project's scenario schema. Returns { product, extraction_method,
 * raw_extracted, source_url }.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  const projectId = body?.projectId;

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const project = getProject(projectId, user.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const scenario = getScenario(project.scenarioId);

  let agentResponse: Response;
  try {
    agentResponse = await extractProduct({
      url,
      scenario_id: project.scenarioId,
      scenario_fields: scenario?.productSchema ?? [],
      user_id: user.id,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The extractor service isn't running. Start it with `cd agents && uvicorn main:app`",
      },
      { status: 503 }
    );
  }

  const data = await agentResponse.json().catch(() => ({}));
  if (!agentResponse.ok) {
    // Surface the Python service's error detail with its status.
    const message =
      (data && (data.detail || data.error)) ||
      `Extraction failed (${agentResponse.status}).`;
    return NextResponse.json({ error: message }, { status: agentResponse.status });
  }

  return NextResponse.json(data);
}
