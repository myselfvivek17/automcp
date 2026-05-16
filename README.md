# AutoMCP

> Turn any API into a production-ready MCP (Model Context Protocol) server in seconds.

Paste an OpenAPI spec, drop a GitHub URL, or describe your endpoints in plain text. Eight specialist agents work in sequence — extracting schemas, mapping tools, detecting auth, generating code — and hand you a runnable server ready to wire into Claude Desktop or Cursor.

---

## How it works

1. **Bring your spec** — OpenAPI 3.0, Swagger 2.0, a docs URL, a GitHub repo, a file upload, or plain prose
2. **Watch agents work** — a WebSocket streams every state transition live
3. **Wire it up** — download the server file + README, drop the config snippet into Claude Desktop, restart

## 8-Agent Pipeline

| # | Agent | Does |
|---|-------|------|
| 1 | Input Parser | Normalizes any input format into a canonical spec |
| 2 | Schema Extractor | Extracts endpoints, parameters, and schemas |
| 3 | Endpoint Mapper | Maps each endpoint to an MCP tool definition |
| 4 | Auth Analyzer | Detects auth type and configures header injection |
| 5 | MCP Translator | Formalizes tool schemas with full JSON Schema definitions |
| 6 | Code Generator | Generates Python or TypeScript MCP server code |
| 7 | Validator | Reviews code for syntax errors and MCP compliance |
| 8 | Docs Generator | Writes README with setup instructions and Claude Desktop config |

Each agent falls back to deterministic logic when no LLM is configured, so the pipeline works without any API keys.

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env      # add your API key(s)
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`

### Docker

```bash
docker compose up --build
```

### Environment Variables

Set at least one provider key — the pipeline uses whichever is configured:

```env
# Any one (or more) of:
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
OPENROUTER_API_KEY=
```

Keys can also be set at runtime via the **Settings → Provider API Keys** panel — no restart required.

## Provider Support

| Provider | Models |
|----------|--------|
| IBM watsonx.ai | Granite 4H, Granite 3 8B, Granite 8B Code, Llama 3.3 70B, Mistral |
| OpenAI | GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo |
| Anthropic | Claude Opus, Claude Sonnet, Claude Haiku |
| Google | Gemini 1.5 Pro, Gemini 1.5 Flash |
| OpenRouter | NVIDIA Nemotron, Poolside Laguna, OpenAI gpt-oss, GLM 4.5, MiniMax M2.5 (all free tier) + any model |

Each of the 8 agents can be independently routed to a different provider and model from the **Settings** page.

## Features

- Live agent progress via WebSocket streaming
- Per-agent model routing — mix providers for cost vs. quality tradeoffs
- Deterministic fallback — works without any API key
- Python and TypeScript output
- Monaco editor with syntax highlighting and one-click download
- Auto-generated README with Claude Desktop / Cursor config snippets
- Session persistence — last generation restored on next visit
- Docker support

## Architecture

```
WebSocket /api/simple/generate/stream
    ↓
MultiAgentPipeline
    ↓  (sequential, shared state dict)
InputParser → SchemaExtractor → EndpointMapper → AuthAnalyzer
    → MCPTranslator → CodeGenerator → Validator → DocsGenerator
    ↓
MCP server code + README streamed to frontend
```

```
automcp/
├── backend/
│   ├── app/
│   │   ├── agents/          # 8-agent pipeline
│   │   ├── api/simple/      # FastAPI + WebSocket endpoints
│   │   ├── providers/       # watsonx, OpenAI, Anthropic, Google
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── generate/    # Generator UI
│       │   └── settings/    # Per-agent model config
│       ├── components/      # AgentTimeline, NavBar
│       └── lib/             # agent-config, api helpers
└── docker-compose.yml
```

## License

MIT
