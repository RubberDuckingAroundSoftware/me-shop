import { nanoid } from 'nanoid';
import type {
  Conversation,
  ChatMessage,
  LLMConfig,
  Product,
  ProductSource,
  ProductStatus,
  Project,
  Recipe,
  ScenarioId,
  User,
} from '@/lib/types';
import { nowIso } from '@/lib/utils';
import {
  getDb,
  rowToConversation,
  rowToLlmConfig,
  rowToProduct,
  rowToProject,
  rowToRecipe,
  rowToUser,
} from './index';

// ----- Users -----

/** Full user row including the password hash (never send this to clients). */
interface UserWithHash extends User {
  password: string;
}

export function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): User {
  const now = nowIso();
  const user: User = {
    id: `usr_${nanoid(12)}`,
    email: input.email.toLowerCase(),
    name: input.name,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO users (id, email, name, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, user.email, user.name, input.passwordHash, now, now);
  return user;
}

export function getUserByEmail(email: string): UserWithHash | null {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase());
  if (!row) return null;
  return { ...rowToUser(row), password: (row as { password: string }).password };
}

export function getUserById(id: string): UserWithHash | null {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!row) return null;
  return { ...rowToUser(row), password: (row as { password: string }).password };
}

export function emailExists(email: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM users WHERE email = ?')
    .get(email.toLowerCase());
  return !!row;
}

export function updateUserPassword(id: string, passwordHash: string): boolean {
  const info = getDb()
    .prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
    .run(passwordHash, nowIso(), id);
  return info.changes > 0;
}

// ----- Projects -----

export function listProjects(userId: string): Project[] {
  return getDb()
    .prepare(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order ASC, created_at DESC'
    )
    .all(userId)
    .map(rowToProject);
}

export function getProject(id: string, userId: string): Project | null {
  const row = getDb()
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return row ? rowToProject(row) : null;
}

export function createProject(input: {
  userId: string;
  name: string;
  scenarioId: ScenarioId;
}): Project {
  const now = nowIso();
  const project: Project = {
    id: `proj_${nanoid(10)}`,
    userId: input.userId,
    name: input.name,
    scenarioId: input.scenarioId,
    createdAt: now,
    updatedAt: now,
    metadata: {},
  };
  getDb()
    .prepare(
      `INSERT INTO projects (id, user_id, name, scenario_id, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, '{}', ?, ?)`
    )
    .run(project.id, project.userId, project.name, project.scenarioId, now, now);
  return project;
}

export function updateProject(
  id: string,
  userId: string,
  patch: { name?: string }
): Project | null {
  const existing = getProject(id, userId);
  if (!existing) return null;
  const name = patch.name?.trim();
  if (!name) return existing; // ignore empty renames
  const now = nowIso();
  getDb()
    .prepare(
      'UPDATE projects SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    )
    .run(name, now, id, userId);
  return { ...existing, name, updatedAt: now };
}

export function deleteProject(id: string, userId: string): boolean {
  const info = getDb()
    .prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return info.changes > 0;
}

/** Persist a manual ordering: sort_order = index, scoped to the user. */
export function reorderProjects(userId: string, projectIds: string[]): void {
  const db = getDb();
  const update = db.prepare(
    'UPDATE projects SET sort_order = ? WHERE id = ? AND user_id = ?'
  );
  const tx = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => update.run(index, id, userId));
  });
  tx(projectIds);
}

function touchProject(id: string): void {
  getDb()
    .prepare('UPDATE projects SET updated_at = ? WHERE id = ?')
    .run(nowIso(), id);
}

// ----- Products -----

export function listProducts(projectId: string, userId: string): Product[] {
  return getDb()
    .prepare(
      'SELECT * FROM products WHERE project_id = ? AND user_id = ? ORDER BY created_at ASC'
    )
    .all(projectId, userId)
    .map(rowToProduct);
}

export function getProduct(id: string, userId: string): Product | null {
  const row = getDb()
    .prepare('SELECT * FROM products WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return row ? rowToProduct(row) : null;
}

export function createProduct(input: {
  userId: string;
  projectId: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  sources?: ProductSource[];
  status?: ProductStatus;
}): Product {
  const now = nowIso();
  const product: Product = {
    id: `prod_${nanoid(10)}`,
    userId: input.userId,
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    metadata: input.metadata ?? {},
    sources: input.sources ?? [],
    status: input.status ?? 'hunting',
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO products (id, user_id, project_id, name, description, metadata, sources, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      product.id,
      product.userId,
      product.projectId,
      product.name,
      product.description ?? null,
      JSON.stringify(product.metadata),
      JSON.stringify(product.sources),
      product.status,
      now,
      now
    );
  touchProject(product.projectId);
  return product;
}

export function updateProduct(
  id: string,
  userId: string,
  patch: Partial<
    Pick<Product, 'name' | 'description' | 'metadata' | 'sources' | 'status'>
  >
): Product | null {
  const existing = getProduct(id, userId);
  if (!existing) return null;

  const updated: Product = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };
  getDb()
    .prepare(
      `UPDATE products
       SET name = ?, description = ?, metadata = ?, sources = ?, status = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(
      updated.name,
      updated.description ?? null,
      JSON.stringify(updated.metadata),
      JSON.stringify(updated.sources),
      updated.status,
      updated.updatedAt,
      id,
      userId
    );
  touchProject(updated.projectId);
  return updated;
}

export function deleteProduct(id: string, userId: string): boolean {
  const existing = getProduct(id, userId);
  if (!existing) return false;
  getDb()
    .prepare('DELETE FROM products WHERE id = ? AND user_id = ?')
    .run(id, userId);
  touchProject(existing.projectId);
  return true;
}

// ----- Conversations -----

export function listConversations(
  projectId: string,
  userId: string
): Conversation[] {
  return getDb()
    .prepare(
      'SELECT * FROM conversations WHERE project_id = ? AND user_id = ? ORDER BY updated_at DESC'
    )
    .all(projectId, userId)
    .map(rowToConversation);
}

export function getConversation(
  id: string,
  userId: string
): Conversation | null {
  const row = getDb()
    .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return row ? rowToConversation(row) : null;
}

export function createConversation(
  projectId: string,
  userId: string
): Conversation {
  const now = nowIso();
  const conversation: Conversation = {
    id: `conv_${nanoid(10)}`,
    userId,
    projectId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO conversations (id, user_id, project_id, messages, summary, created_at, updated_at)
       VALUES (?, ?, ?, '[]', NULL, ?, ?)`
    )
    .run(conversation.id, userId, projectId, now, now);
  return conversation;
}

export function appendMessage(
  id: string,
  userId: string,
  message: ChatMessage
): Conversation | null {
  const existing = getConversation(id, userId);
  if (!existing) return null;

  const messages = [...existing.messages, message];
  const now = nowIso();
  getDb()
    .prepare(
      'UPDATE conversations SET messages = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    )
    .run(JSON.stringify(messages), now, id, userId);
  touchProject(existing.projectId);
  return { ...existing, messages, updatedAt: now };
}

// ----- Recipes -----

export function listRecipes(projectId: string, userId: string): Recipe[] {
  return getDb()
    .prepare(
      'SELECT * FROM recipes WHERE project_id = ? AND user_id = ? ORDER BY created_at ASC'
    )
    .all(projectId, userId)
    .map(rowToRecipe);
}

export function getRecipe(id: string, userId: string): Recipe | null {
  const row = getDb()
    .prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
    .get(id, userId);
  return row ? rowToRecipe(row) : null;
}

export function createRecipe(input: {
  userId: string;
  projectId: string;
  name: string;
  description?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  ingredients?: Recipe['ingredients'];
  instructions?: string[];
  notes?: string;
}): Recipe {
  const now = nowIso();
  const recipe: Recipe = {
    id: `recipe_${nanoid(10)}`,
    userId: input.userId,
    projectId: input.projectId,
    name: input.name,
    description: input.description,
    servings: input.servings,
    prepTime: input.prepTime,
    cookTime: input.cookTime,
    ingredients: input.ingredients ?? [],
    instructions: input.instructions ?? [],
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  getDb()
    .prepare(
      `INSERT INTO recipes (id, user_id, project_id, name, description, servings, prep_time, cook_time, ingredients, instructions, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      recipe.id,
      recipe.userId,
      recipe.projectId,
      recipe.name,
      recipe.description ?? null,
      recipe.servings ?? null,
      recipe.prepTime ?? null,
      recipe.cookTime ?? null,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.instructions),
      recipe.notes ?? null,
      now,
      now
    );
  touchProject(recipe.projectId);
  return recipe;
}

export function updateRecipe(
  id: string,
  userId: string,
  patch: Partial<
    Pick<
      Recipe,
      | 'name'
      | 'description'
      | 'servings'
      | 'prepTime'
      | 'cookTime'
      | 'ingredients'
      | 'instructions'
      | 'notes'
    >
  >
): Recipe | null {
  const existing = getRecipe(id, userId);
  if (!existing) return null;
  const updated: Recipe = { ...existing, ...patch, updatedAt: nowIso() };
  getDb()
    .prepare(
      `UPDATE recipes
       SET name = ?, description = ?, servings = ?, prep_time = ?, cook_time = ?, ingredients = ?, instructions = ?, notes = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(
      updated.name,
      updated.description ?? null,
      updated.servings ?? null,
      updated.prepTime ?? null,
      updated.cookTime ?? null,
      JSON.stringify(updated.ingredients),
      JSON.stringify(updated.instructions),
      updated.notes ?? null,
      updated.updatedAt,
      id,
      userId
    );
  touchProject(updated.projectId);
  return updated;
}

export function deleteRecipe(id: string, userId: string): boolean {
  const existing = getRecipe(id, userId);
  if (!existing) return false;
  getDb()
    .prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?')
    .run(id, userId);
  touchProject(existing.projectId);
  return true;
}

// ----- Counts (for homepage cards) -----

export function productCount(projectId: string, userId: string): number {
  const row = getDb()
    .prepare(
      'SELECT COUNT(*) AS n FROM products WHERE project_id = ? AND user_id = ?'
    )
    .get(projectId, userId) as { n: number };
  return row.n;
}

export function recipeCount(projectId: string, userId: string): number {
  const row = getDb()
    .prepare(
      'SELECT COUNT(*) AS n FROM recipes WHERE project_id = ? AND user_id = ?'
    )
    .get(projectId, userId) as { n: number };
  return row.n;
}

// ----- LLM config (per-user) -----

export function getLlmConfig(userId: string): LLMConfig {
  const row = getDb()
    .prepare('SELECT * FROM llm_config WHERE user_id = ?')
    .get(userId);
  if (row) return rowToLlmConfig(row);
  // Fall back to env defaults if the user has no saved config yet.
  return {
    userId,
    provider: (process.env.LLM_PROVIDER as LLMConfig['provider']) || 'ollama',
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.LLM_API_KEY || 'ollama',
    model: process.env.LLM_MODEL || 'gemma3:4b',
  };
}

export function updateLlmConfig(
  userId: string,
  config: LLMConfig
): LLMConfig {
  getDb()
    .prepare(
      `INSERT INTO llm_config (user_id, provider, base_url, api_key, model)
       VALUES (@userId, @provider, @baseURL, @apiKey, @model)
       ON CONFLICT(user_id) DO UPDATE SET
         provider = @provider, base_url = @baseURL, api_key = @apiKey, model = @model`
    )
    .run({
      userId,
      provider: config.provider,
      baseURL: config.baseURL,
      apiKey: config.apiKey ?? null,
      model: config.model,
    });
  return getLlmConfig(userId);
}
