# AutoMCP — Automatic MCP Server Generator

> **Generate production-ready MCP (Model Context Protocol) server code from any API specification in seconds.**

Built with IBM watsonx.ai Granite models and a real-time 5-agent pipeline.

---

## What it does

Paste an OpenAPI spec (or plain text API description) → watch 5 AI agents work in real-time via WebSocket → download a ready-to-use Python or TypeScript MCP server.

## 5-Agent Pipeline

| # | Agent | Task |
|---|-------|------|
| 1 | **Input Parser** | Normalizes OpenAPI 3.0, Swagger 2.0, or plain text |
| 2 | **Schema Extractor** | Extracts endpoints, parameters, and schemas |
| 3 | **Endpoint Mapper** | Maps each endpoint to an MCP tool definition |
| 4 | **Auth Analyzer** | Detects authentication type and configures headers |
| 5 | **Code Generator** | Generates clean, secure MCP server code |

## Features

- **Real-time agent visualization** — watch each agent's progress live via WebSocket streaming
- **Per-agent model configuration** — assign different IBM Granite models to each agent independently
- **Python & TypeScript output** — generated code follows MCP SDK best practices
- **Secure generated code** — environment variable API keys, 30s timeouts, full error handling
- **Generation insights** — see exactly what endpoints were found and what tools were created
- **One-click setup guide** — install commands + Claude Desktop / Cursor config included

## IBM Technology

- **IBM watsonx.ai** — Primary AI provider using Granite models
  - `ibm/granite-13b-chat-v2` — lightweight parsing and analysis
  - `ibm/granite-20b-code-instruct` — schema extraction and mapping
  - `ibm/granite-34b-code-instruct` — code generation (most capable)
- Each agent can be independently configured to use a different Granite model or provider

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- IBM Watsonx.ai API key and Project ID ([get one here](https://cloud.ibm.com/catalog/services/watsonx-ai))

### Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env — fill in WATSONX_API_KEY and WATSONX_PROJECT_ID
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000` · API docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

## Usage

1. Open `http://localhost:3000/generate`
2. Click **Load Sample** or paste your OpenAPI spec
3. Select output language (Python or TypeScript)
4. Click **Generate MCP Server**
5. Watch 5 agents process your spec in real time
6. Download the generated code and follow the setup guide

### Per-Agent Configuration

Visit `/settings` to assign a specific AI model and API key to each pipeline agent. Presets available:
- **Cost-Optimized** — Granite 13b for all agents (~fastest, lowest cost)
- **Balanced** — Granite 20b for all agents
- **Performance** — Granite 34b for all agents (~best quality)

## Project Structure

```
automcp/
├── backend/
│   ├── app/
│   │   ├── agents/          # 5-agent multi-agent pipeline
│   │   ├── api/simple/      # FastAPI endpoints + WebSocket
│   │   ├── providers/       # IBM Watsonx.ai + other AI providers
│   │   ├── services/        # Provider service
│   │   └── main.py          # FastAPI app entry point
│   └── requirements.txt
└── frontend/
    └── src/app/
        ├── page.tsx          # Landing page
        ├── generate/         # Main generator page
        ├── settings/         # Per-agent configuration
        └── lib/agent-config.ts
```

## Architecture

```
User Input (OpenAPI / Swagger / Plain Text)
         ↓
   WebSocket /api/simple/generate/stream
         ↓
   MultiAgentPipeline
   ├── InputParserAgent      → normalizes spec
   ├── SchemaExtractorAgent  → extracts endpoints
   ├── EndpointMapperAgent   → maps to MCP tools
   ├── AuthAnalyzerAgent     → detects auth
   └── CodeGeneratorAgent    → generates code
         ↓
   Generated Python / TypeScript MCP Server
```

---

*Built for IBM Hackathon 2025 — demonstrating how IBM watsonx.ai Granite models can power a sophisticated multi-agent developer tooling workflow.*
