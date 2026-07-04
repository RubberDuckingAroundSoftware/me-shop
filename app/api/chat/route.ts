import { NextRequest } from 'next/server';
import { getLlmConfig, getProject, listProducts } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { buildProjectContext, streamChat } from '@/lib/agent-client';

export const dynamic = 'force-dynamic';

/** Emit a single SSE error event as a stream (keeps one code path in the UI). */
function sseError(code: string, message: string): Response {
  const payload = JSON.stringify({ type: 'error', code, content: message });
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return sseError('unauthorized', 'You need to be signed in to chat.');
  }

  const body = await req.json().catch(() => null);
  const messages = body?.messages;
  const projectId = body?.projectId;
  const conversationId = body?.conversationId;

  if (!Array.isArray(messages) || !projectId) {
    return sseError('bad_request', 'messages and projectId are required.');
  }

  // Short-circuit when this user has no provider configured.
  const config = getLlmConfig(user.id);
  if (config.provider === 'none') {
    return sseError(
      'no_provider',
      'Connect an LLM to start chatting. Head to Settings to set up Ollama or a cloud provider.'
    );
  }

  const project = getProject(projectId, user.id);
  if (!project) {
    return sseError('not_found', 'Project not found.');
  }

  const products = listProducts(projectId, user.id);
  const projectContext = buildProjectContext(project, products);

  let agentResponse: Response;
  try {
    agentResponse = await streamChat({
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      project_context: projectContext,
      conversation_id: conversationId,
      thread_id: conversationId ? `thread_${conversationId}` : undefined,
      user_id: user.id,
    });
  } catch {
    return sseError(
      'agent_down',
      "The agent service isn't running. Start it with `cd agents && uvicorn main:app`"
    );
  }

  if (!agentResponse.ok || !agentResponse.body) {
    const text = await agentResponse.text().catch(() => '');
    return sseError(
      'agent_error',
      text || `Agent service returned ${agentResponse.status}.`
    );
  }

  // Forward the SSE stream from the Python service directly to the browser.
  return new Response(agentResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
