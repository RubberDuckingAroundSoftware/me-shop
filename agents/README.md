# meShop Agent Service

FastAPI + LangGraph service that powers the **Rubber Duck** shopping companion.
The Next.js app proxies chat requests here; all LLM/agent logic lives in Python.

```
Browser → Next.js /api/chat → (HTTP) → this service :8000 → LangGraph → LLM
```

## Setup

Requires Python 3.11+.

```bash
# From the repo root:
pnpm agents:install
# or, directly:
cd agents
pip install -e '.[dev]' --break-system-packages
```

## Run

```bash
# From the repo root:
pnpm dev:agents
# or:
cd agents
uvicorn main:app --reload --port 8000
```

Run both frontend and agent service together with `pnpm dev:all`.

## Endpoints

| Route     | Method | Description                              |
| --------- | ------ | ---------------------------------------- |
| `/health` | GET    | Health check + LLM connectivity status   |
| `/chat`   | POST   | Streaming chat (SSE) via the Rubber Duck |
| `/config` | GET    | Current LLM config                       |
| `/config` | PUT    | Update LLM config (in-process override)  |

## Configuration

Config is read from the shared SQLite database (`llm_config` table, written by
the Settings page) and falls back to `../.env.local`:

```
LLM_PROVIDER=ollama          # ollama | cloud | none
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.2
```

### Using Ollama (default)

```bash
ollama serve
ollama pull llama3.2
```

### Using a cloud provider

Set provider to `cloud` in Settings and use a litellm model string, e.g.
`anthropic/claude-3-haiku` or `gpt-4o`, with the matching API key.

## Structure

```
agents/
├── main.py                     # FastAPI app + SSE streaming
├── config.py                   # LLM config resolution (DB → env)
├── llm.py                      # litellm/ChatLiteLLM provider factory
├── db.py                       # read-only SQLite access
├── models.py                   # Pydantic request/response models
├── graphs/
│   ├── base.py                 # shared graph utilities (checkpointer)
│   └── rubber_duck.py          # the Rubber Duck StateGraph
└── agents/
    └── rubber_duck_agent.py    # system prompt + project-context assembly
```
