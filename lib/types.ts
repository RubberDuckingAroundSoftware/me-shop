// Users & Auth
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

// Scenarios
export type ScenarioId = 'books' | 'recipes' | 'sneakers-streetwear';

export interface ScenarioField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'currency' | 'tags';
  options?: string[]; // for select type
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // hex color
  tools: string[]; // tool IDs available in this scenario
  productSchema: ScenarioField[];
}

// Projects
export interface Project {
  id: string;
  userId: string;
  name: string;
  scenarioId: ScenarioId;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// Products (Reverse Catalog)
export type ProductStatus = 'hunting' | 'found' | 'bought' | 'archived';

export interface ProductSource {
  url: string;
  storeName: string;
  price?: number;
  currency?: string;
  lastChecked?: string;
  notes?: string;
}

export interface Product {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  description?: string;
  metadata: Record<string, unknown>; // scenario-specific fields
  sources: ProductSource[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

// Conversations (Rubber Duck)
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  projectId: string;
  messages: ChatMessage[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

// Recipes
export interface RecipeIngredient {
  name: string;
  quantity: string;
  unit?: string;
  notes?: string;
  found: boolean; // has the user sourced this?
  sourceStore?: string;
}

export interface Recipe {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  description?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// LLM Config (per-user)
export interface LLMConfig {
  userId?: string;
  provider: 'ollama' | 'cloud' | 'none';
  baseURL: string;
  apiKey?: string;
  model: string;
}
