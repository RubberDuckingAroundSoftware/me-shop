-- meShop v1 schema (SQLite, shared between Node.js and Python)
-- JSON-heavy columns keep the schema simple; the app owns the shapes.
-- v0.0.1 (accounts): every user-owned table carries a user_id.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,               -- bcrypt hash
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  scenario_id  TEXT NOT NULL,
  metadata     TEXT NOT NULL DEFAULT '{}',   -- JSON
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS products (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  metadata     TEXT NOT NULL DEFAULT '{}',   -- JSON: scenario-specific fields
  sources      TEXT NOT NULL DEFAULT '[]',   -- JSON: ProductSource[]
  status       TEXT NOT NULL DEFAULT 'hunting',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_project ON products(project_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);

CREATE TABLE IF NOT EXISTS conversations (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  messages     TEXT NOT NULL DEFAULT '[]',   -- JSON: ChatMessage[]
  summary      TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

CREATE TABLE IF NOT EXISTS recipes (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  servings     INTEGER,
  prep_time    TEXT,
  cook_time    TEXT,
  ingredients  TEXT NOT NULL DEFAULT '[]',   -- JSON: RecipeIngredient[]
  instructions TEXT NOT NULL DEFAULT '[]',   -- JSON: string[]
  notes        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipes_project ON recipes(project_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);

-- Per-user LLM configuration (one row per user).
CREATE TABLE IF NOT EXISTS llm_config (
  user_id   TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  provider  TEXT NOT NULL DEFAULT 'ollama',
  base_url  TEXT NOT NULL DEFAULT 'http://localhost:11434/v1',
  api_key   TEXT,
  model     TEXT NOT NULL DEFAULT 'llama3.2'
);
