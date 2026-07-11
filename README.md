"Me shop. Me like. Me buy." - Mr. Bean, probably

## What meShop Is

meShop is an open-source personal shopping system. It gives you a place to create **shopping projects** organized around things you care about and equip each project with **tools** that make the pursuit richer, smarter, and more personal.

It is not a storefront. It is not a marketplace. It is not a price comparison engine.

It is the space between *wanting something* and *finding exactly the right one*.

See [`docs/what-is-meshop.md`](./docs/what-is-meshop.md) to learn more about product vision and [`agents/README.md`](agents/README.md) for agent-service details.

---

## Quickstart

meShop is a Next.js app (frontend + API) backed by a Python agent service
(FastAPI + LangGraph) for the AI chat companion. State lives in a single
file-based SQLite database shared by both.

Note: current version is 0.0.1, it's usable but features are limited.

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+ (for the agent service)
- Optional: [Ollama](https://ollama.com) for local LLM chat (`ollama serve && ollama pull gemma3:4b`)

### Install & run

```bash
pnpm install            # frontend deps
pnpm agents:install     # Python agent service deps
pnpm db:seed            # seed the demo database
pnpm dev:all            # start Next.js (:3000) + agent service (:8000)
```

Then open http://localhost:3000 and **sign in with the demo account or create your own account**:

- **Email:** `demo@meshop.world`
- **Password:** `meshop`

The demo account comes pre-loaded with three sample projects:

- **Rare Sci-Fi Collection** (Books) — a reverse catalog of first editions
- **Sunday Italian Dinner** (Recipes) — recipes with ingredient checklists
- **Fall Rotation 2026** (Sneakers & Streetwear) — sneakers + streetwear tracking

The **Rubber Duck** chat tool works once an LLM is configured in **Settings**
(defaults to Ollama). Without one, it shows a friendly setup prompt.

### Handy scripts

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | Frontend only                                 |
| `pnpm dev:agents`   | Agent service only (`uvicorn main:app :8000`) |
| `pnpm dev:all`      | Both, in one terminal                         |
| `pnpm db:seed`      | Seed the database with demo data              |
| `pnpm db:reset`     | Wipe and re-seed the database                 |
| `pnpm auth:reset-password <email>` | Reset a user's password from the terminal |
| `pnpm build`        | Production build                              |

### Forgot your password?

If you're self-hosting and forgot your password, reset it from the terminal:

```bash
pnpm auth:reset-password your@email.com
```

### Tech stack

- **Frontend/API:** Next.js 14 (App Router), TypeScript, Tailwind
- **Database:** better-sqlite3 (file-based, shared with Python)
- **Agents:** FastAPI + LangGraph + litellm (Ollama / cloud / none)
