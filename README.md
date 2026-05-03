# AutoMCP — Automatic MCP Server Generator

> **Turn any API into a production-ready MCP (Model Context Protocol) server in seconds — powered by IBM watsonx.ai Granite.**

---

## The Problem

Connecting AI assistants like Claude to external APIs requires writing MCP server boilerplate by hand — parsing the spec, mapping endpoints, handling auth, writing tool schemas, generating code. It takes hours per API. AutoMCP does it in under a minute.

## Demo

Paste the [Petstore Swagger spec](https://petstore.swagger.io/v2/swagger.json) URL → click Generate → in ~45 seconds you get a fully working Python MCP server with a README, ready to drop into Claude Desktop.

## 8-Agent Pipeline

Eight specialized IBM Granite agents work in sequence, each streaming live progress:

| # | Agent | What it does |
|---|-------|------|
| 1 | **Input Parser** | Normalizes OpenAPI 3.0, Swagger 2.0, URL, GitHub repo, file upload, or plain text |
| 2 | **Schema Extractor** | Extracts endpoints, parameters, and request/response schemas |
| 3 | **Endpoint Mapper** | Maps each endpoint to an MCP tool definition |
| 4 | **Auth Analyzer** | Detects auth type (Bearer, API key, OAuth) and configures headers |
| 5 | **MCP Translator** | Formalizes tool schemas with full JSON Schema input definitions |
| 6 | **Code Generator** | Generates secure, runnable Python or TypeScript MCP server code |
| 7 | **Validator** | Reviews generated code for syntax errors and MCP compliance — auto-fixes issues |
| 8 | **Docs Generator** | Writes a README with setup instructions, tool list, and Claude Desktop config |

## Input Types

| Type | Example |
|------|---------|
| **Plain Text** | "GET /users — list users, POST /users — create user" |
| **OpenAPI 3.0 JSON** | Paste raw spec |
| **Swagger 2.0 JSON** | Paste raw spec |
| **URL** | `https://petstore.swagger.io/v2/swagger.json` |
| **GitHub Repository** | `https://github.com/owner/repo` — auto-finds openapi.json / swagger.yaml |
| **File Upload** | Upload `.json` or `.yaml` spec |
| **Manual Entry** | Fill in API name, base URL, and endpoints via form |

## IBM Technology

AutoMCP is built on **IBM watsonx.ai** with the following Granite models, each chosen for its strength:

| Model | Used for |
|-------|----------|
| `ibm/granite-4-h-small` | Fast parsing, schema extraction, auth analysis |
| `ibm/granite-8b-code-instruct` | Code generation (strongest code model) |
| `ibm/granite-3-8b-instruct` | MCP translation, validation, docs generation |
| `ibm/granite-guardian-3-8b` | Optional safety checks on generated code |

Every agent can be independently assigned a different model or API key via the `/settings` page — enabling cost vs. quality tradeoffs per task.

The watsonx.ai integration uses:
- **IAM token auth** — exchanges IBM Cloud API key for short-lived tokens with auto-refresh
- **`/ml/v1/text/chat`** (chat completions) with automatic fallback to `/ml/v1/text/generation`
- Structured JSON prompts with deterministic fallbacks when LLM output is unparseable

## Features

- Real-time agent visualization via WebSocket streaming
- Per-agent model configuration — assign any Granite model to any agent
- Session persistence — last generation auto-saved, restore on next visit
- Code output with syntax highlighting and one-click download
- README output tab — generated setup docs, downloadable as `README.md`
- Docker support — `docker compose up --build` runs the full stack

## Quick Start

### Local

```bash
# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # fill in WATSONX_API_KEY + WATSONX_PROJECT_ID
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`

### Docker

```bash
cp .env.example .env   # fill in your keys
docker compose up --build
```

### Environment Variables

```env
WATSONX_API_KEY=your-ibm-cloud-api-key
WATSONX_PROJECT_ID=your-watsonx-project-id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

Get credentials at [cloud.ibm.com/catalog/services/watsonx-ai](https://cloud.ibm.com/catalog/services/watsonx-ai).

## Usage

1. Open `http://localhost:3000/generate`
2. Select input type and provide your API spec (try the Petstore URL: `https://petstore.swagger.io/v2/swagger.json`)
3. Select output language (Python or TypeScript)
4. Click **Generate MCP Server** — watch all 8 agents run live
5. Download the generated code from the **Code** tab
6. Download the auto-generated README from the **README** tab
7. Run the server and add it to your Claude Desktop config

## Architecture

```
User Input (7 types)
         ↓
   WebSocket /api/simple/generate/stream
         ↓
   MultiAgentPipeline (IBM watsonx.ai Granite)
   ├── InputParserAgent       → normalized API spec
   ├── SchemaExtractorAgent   → endpoints + schemas
   ├── EndpointMapperAgent    → MCP tool definitions
   ├── AuthAnalyzerAgent      → auth config
   ├── MCPTranslatorAgent     → JSON Schema tool definitions
   ├── CodeGeneratorAgent     → Python / TypeScript MCP server
   ├── ValidatorAgent         → validated + auto-fixed code
   └── DocsGeneratorAgent     → README.md
         ↓
   Complete MCP Server Package (code + README)
```

## Project Structure

```
automcp/
├── backend/
│   ├── app/
│   │   ├── agents/          # 8-agent pipeline
│   │   ├── api/simple/      # FastAPI + WebSocket
│   │   ├── providers/       # IBM watsonx.ai, OpenAI, Anthropic
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── generate/        # Main generator UI
│   │   ├── settings/        # Per-agent model config
│   │   └── lib/agent-config.ts
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

*Built for IBM Hackathon 2025 — demonstrating how IBM watsonx.ai Granite models can orchestrate a sophisticated multi-agent developer tooling workflow.*
