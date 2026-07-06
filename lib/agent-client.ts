import type { ChatMessage, Product, Project } from './types';
import { getScenario } from './scenarios';

const AGENT_SERVICE_URL =
  process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

export interface ProjectContext {
  project_name: string;
  scenario_id: string;
  scenario_description: string;
  products: {
    id: string;
    name: string;
    status: string;
    metadata: Record<string, unknown>;
  }[];
}

export interface AgentChatRequest {
  messages: { role: string; content: string }[];
  project_context: ProjectContext;
  conversation_id?: string;
  thread_id?: string;
  user_id?: string;
}

/** Build the structured project context the agent graph expects. */
export function buildProjectContext(
  project: Project,
  products: Product[]
): ProjectContext {
  const scenario = getScenario(project.scenarioId);
  return {
    project_name: project.name,
    scenario_id: project.scenarioId,
    scenario_description: scenario?.description ?? '',
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      metadata: p.metadata,
    })),
  };
}

/**
 * Proxy a chat request to the Python agent service.
 * Returns the raw fetch Response so the SSE stream can be forwarded directly.
 */
export async function streamChat(body: AgentChatRequest): Promise<Response> {
  return fetch(`${AGENT_SERVICE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Health check against the agent service (optionally for a specific user's config). */
export async function agentHealth(userId?: string): Promise<Response> {
  const url = new URL(`${AGENT_SERVICE_URL}/health`);
  if (userId) url.searchParams.set('user_id', userId);
  return fetch(url, { method: 'GET' });
}

export interface ExtractRequest {
  url: string;
  scenario_id: string;
  scenario_fields: unknown[];
  user_id?: string;
}

/** Proxy a URL-extraction request to the Python agent service. */
export async function extractProduct(body: ExtractRequest): Promise<Response> {
  return fetch(`${AGENT_SERVICE_URL}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export { AGENT_SERVICE_URL };
export type { ChatMessage };
