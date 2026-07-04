# meShop v0.0.1 — Product Foundation

**A Personal Shopping System**

---

## Philosophy
meShop is a personal shopping system built around a single conviction: shopping at its best is a deeply human activity, a pursuit driven by curiosity, taste, and passion, not by conversion funnels and recommendation algorithms optimized for engagement.

### Why This Exists

The inspiration draws from three sources that, at first glance, have nothing in common:

**Guido van Rossum's foreword to "Programming Python" (1996)** — Python started as a Christmas hobby project. It prioritized readability and joy over raw speed. Guido wrote: *"many consider using Python a pleasure — a better recommendation is hard to imagine."*. meShop takes the same stance toward shopping tools. The system should be a pleasure to use. It should be readable. It should invite you in rather than overwhelm you.

**Shaquille O'Neal** — *"I'm tired of hearing about money, money, money. I just want to play the game, drink Pepsi, wear Reebok."*. Shopping, at its core, is about the thing you care about, the book you've been hunting for years, the sneaker that completes a fit, the recipe that reminds you of home. meShop strips away the noise and puts the passion back at the center.

## What meShop Is

meShop is an open-source personal shopping system. It gives you a place to create **shopping projects** organized around things you care about and equip each project with **tools** that make the pursuit richer, smarter, and more personal.

It is not a storefront. It is not a marketplace. It is not a price comparison engine.

It is the space between *wanting something* and *finding exactly the right one*.

### Core Concept: The Shopping Project

A shopping project is a first-class entity in meShop. It has:

- A **scenario** (theme) that determines which tools are available
- A **rubber duck** — an LLM-powered conversational companion that remembers context across sessions
- A **reverse catalog** — user-created product entries (SKUs) for things they're looking for
- **Specialized tools** loaded based on the scenario
- **Learned preferences** — sizing, taste, budget, and style that accumulate over time

### Default Scenarios (v1)

| Scenario | Description | Specialized Tools |
|---|---|---|
| **Books** | Looking for books, especially rare and used editions in secondhand bookstores | Website Watcher (ISBN availability/discounts), Reverse Catalog (custom book SKUs with edition/condition metadata) |
| **Recipes & Ingredients** | Exploring recipes and sourcing ingredients | Recipe Builder (specify recipe + ingredient list), Reverse Catalog (ingredient sourcing with store/market metadata) |
| **Sneakers & Streetwear** | Buying sneakers and assembling outfits that go with them | 3D Product Visualizer (sneaker viewing), Price Watcher (multi-site price tracking + alerts), Reverse Catalog (sizing/colorway/style metadata) |

---

## User Stories

### Project Management

1. **As a user, my homepage is a "projects view."** Each project is a shopping scenario with its own state, tools, and history. I see my active projects as cards, each one a living pursuit.

2. **As a user, I can create a new shopping project and select a scenario for it.** When I create a project, I pick a theme (Books, Recipes, Sneakers & Streetwear). The scenario loads its specific tools into my workspace.

3. **As a user, I can let meShop learn my preferences.** Over time, meShop accumulates my sizing, taste patterns, budget ranges, and style. I can spin up agents to look for best matches or tell me if a certain size fits.

### Tools & Intelligence

4. **As a user, I have a rubber duck in every project.** A conversational LLM companion that helps me think through my shopping decisions, remembers what we've discussed, and saves conversation state within the app.

5. **As a user, I can use meShop without any LLM at all.** The reverse catalog, recipe builder, and manual tracking work perfectly on their own. When I'm ready, I install Ollama for free local AI or connect a cloud provider for heavier tasks. Each step adds capability without taking anything away.

6. **As a user, I can create products I want to buy.** A reverse catalog builder: I define the SKU for the book I'm hunting, the recipe I want to cook, or the sneaker I'm tracking. On each product, I add metadata, where to find it, condition, price range, alternatives, notes.

### Extensibility

7. **As a developer, I can build custom tools.** Tools are code-defined and composable. meShop provides a tool registration API; developers can create and contribute new tools.

8. **As a user who knows how to code, I can fork and extend.** The project is open source. I can build my own scenarios, my own tools, and run it however I want.

---

## Architecture (v0.0.1)

### Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│          React (Next.js or Vite+React)                  │
│     Tailwind CSS · Apple-inspired design system         │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Projects │  │  Tools   │  │  Rubber Duck Chat    │  │
│  │   View   │  │ Workspace│  │  (streaming LLM)     │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ REST API
                        │
┌───────────────────────┴─────────────────────────────────┐
│                    Backend                              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Scenario Engine                      │   │
│  │  Loads scenario definitions (JSON/YAML)           │   │
│  │  Registers tools per scenario                     │   │
│  │  Manages project lifecycle                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ Tool Registry │  │  LLM       │  │  Preference    │  │
│  │ (pluggable)  │  │  Gateway   │  │  Engine        │  │
│  └──────────────┘  │ (see below)│  │  (learning)    │  │
│                     └────────────┘  └────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Agentic Layer (LangGraph/Python)     │   │
│  │  Preference agents · Search agents · Watchers     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Storage (SQLite + JSON)              │   │
│  │  Projects · Products · Conversations · Prefs     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tool System

Each tool is a self-contained module with:

```typescript
interface MeShopTool {
  id: string;                          // e.g. "rubber-duck", "recipe-builder"
  name: string;                        // Human-readable name
  description: string;                 // What this tool does
  scenarios: string[];                 // Which scenarios include this tool
  component: React.ComponentType;      // Frontend UI component
  api?: ToolAPI;                       // Optional backend API routes
  agentCapabilities?: AgentCapability[]; // Optional LangGraph agent definitions
}
```

### LLM Gateway

The LLM gateway is a single interface with three providers, powered by `litellm` for provider-agnostic LLM access. Ollama is the default; any cloud provider (Anthropic, Mistral, OpenAI, Groq, etc.) can be added by changing the model string and API key.

```
LLM Provider
├── Ollama (default)                  → localhost:11434, zero config, free, local
├── Cloud (any provider + key)        → cloud fallback, power users
└── None (disabled)                   → everything works, no AI features
```

**Onboarding gradient:**

1. **No LLM** — Install meShop, use the reverse catalog, recipe builder, manual tracking. Everything works.
2. **Ollama** — Install Ollama, run `ollama pull llama3.2`. The rubber duck lights up. Conversations, preference learning, and smart suggestions come alive — all free, all local, all private.
3. **Cloud provider** — Add an API key and set the model string. Access Claude, Mistral, GPT-4, or any provider supported by litellm for heavier reasoning tasks.

Each step adds capability without taking anything away. The AI enhances every tool but is never a gate.

```typescript
interface LLMConfig {
  provider: 'ollama' | 'cloud' | 'none';
  baseURL: string;            // default: "http://localhost:11434/v1"
  apiKey?: string;             // not needed for Ollama
  model: string;               // default: "llama3.2" (litellm format: "ollama/llama3.2", "anthropic/claude-3-haiku", etc.)
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}
```

**Note on model quality:** Local models (7B–8B) are meaningfully less capable than cloud models for nuanced tasks like recipe substitution reasoning or sneaker market analysis.

### Default Tools (v1)

| Tool | ID | Scenarios | Description |
|---|---|---|---|
| **Rubber Duck** | `rubber-duck` | All | LLM chat companion with per-project conversation memory. Helps reason through shopping decisions. Saves state in-app. |
| **Reverse Catalog** | `reverse-catalog` | All | Create SKUs for things you want to buy. Add metadata: where to find, condition, price range, alternatives. Think of it as building your own product catalog, from the buyer's side. |
| **3D Product Visualizer** | `3d-visualizer` | Sneakers & Streetwear | Interactive 3D viewer for sneaker models. Rotate, zoom, inspect details. |
| **Recipe Builder** | `recipe-builder` | Recipes & Ingredients | Specify a recipe with structured ingredient list. Link ingredients to sourcing locations and availability. |
| **Website Watcher** | `website-watcher` | Books | Monitor used bookstore websites for specific ISBNs. Alert when available or when price drops below threshold. |
| **Price Watcher** | `price-watcher` | Sneakers & Streetwear | Track price evolution across multiple sneaker retail sites. Get alerts for price drops and good opportunities. |

---

## Name

The "me" is the point. It's personal. It's yours.

*Tagline candidates:*

- **meShop — Shopping is personal.**
- **meShop — The space between wanting and finding.**
- **meShop — Your pursuits, your tools.**

---

*RubberDuckingAroundSoftware · We See People*
*github.com/RubberDuckingAroundSoftware/me-shop*