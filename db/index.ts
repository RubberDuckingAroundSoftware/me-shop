import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Conversation,
  LLMConfig,
  Product,
  Project,
  Recipe,
  User,
} from '@/lib/types';

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), 'db', 'meshop.db');

// Singleton connection — reused across hot reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __meshopDb: Database.Database | undefined;
}

function initDb(): Database.Database {
  const resolved = path.isAbsolute(DB_PATH)
    ? DB_PATH
    : path.join(process.cwd(), DB_PATH);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }
  runMigrations(db);
  return db;
}

/**
 * Lightweight additive migrations for existing databases.
 * `CREATE TABLE IF NOT EXISTS` won't add columns to a pre-existing table, so
 * new columns are added here idempotently — no reseed required.
 */
function runMigrations(db: Database.Database): void {
  const projectColumns = db
    .prepare(`PRAGMA table_info(projects)`)
    .all() as { name: string }[];
  if (!projectColumns.some((c) => c.name === 'sort_order')) {
    db.exec(
      `ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`
    );
  }

  // Manual ordering for the Reverse Catalog (list + Kanban board views).
  const productColumns = db
    .prepare(`PRAGMA table_info(products)`)
    .all() as { name: string }[];
  if (!productColumns.some((c) => c.name === 'sort_order')) {
    db.exec(
      `ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`
    );
  }
}

export function getDb(): Database.Database {
  if (!global.__meshopDb) {
    global.__meshopDb = initDb();
  }
  return global.__meshopDb;
}

// ----- Row <-> domain object mappers -----

/* eslint-disable @typescript-eslint/no-explicit-any */

export function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToProject(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    scenarioId: row.scenario_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: safeParse(row.metadata, {}),
  };
}

export function rowToProduct(row: any): Product {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    metadata: safeParse(row.metadata, {}),
    sources: safeParse(row.sources, []),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToConversation(row: any): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    messages: safeParse(row.messages, []),
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    servings: row.servings ?? undefined,
    prepTime: row.prep_time ?? undefined,
    cookTime: row.cook_time ?? undefined,
    ingredients: safeParse(row.ingredients, []),
    instructions: safeParse(row.instructions, []),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToLlmConfig(row: any): LLMConfig {
  return {
    userId: row.user_id,
    provider: row.provider,
    baseURL: row.base_url,
    apiKey: row.api_key ?? undefined,
    model: row.model,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
