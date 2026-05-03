# AutoMCP — Automatic MCP Server Generator

> **Generate production-ready MCP (Model Context Protocol) server code from any API specification in seconds.**

Built with IBM watsonx.ai Granite models and a real-time 8-agent pipeline.

---

## What it does

Paste an OpenAPI spec, drop a GitHub URL, upload a file, or fill out a form → watch 8 AI agents work in real-time via WebSocket → download a ready-to-use Python or TypeScript MCP server plus a generated README.

## 8-Agent Pipeline

| # | Agent | Task |
|---|-------|------|
| 1 | **Input Parser** | Normalizes OpenAPI 3.0, Swagger 2.0, URL, GitHub repo, file upload, or plain text |
| 2 | **Schema Extractor** | Extracts endpoints, parameters, and schemas |
| 3 | **Endpoint Mapper** | Maps each endpoint to an MCP tool definition |
| 4 | **Auth Analyzer** | Detects authentication type and configures headers |
| 5 | **MCP Translator** | Formalizes tool schemas with JSON Schema input definitions |
| 6 | **Code Generator** | Generates secure Python or TypeScript MCP server code |
| 7 | **Validator** | Reviews generated code for syntax errors and MCP compliance |
| 8 | **Docs Generator** | Writes README with setup instructions, tool list, and Claude Desktop config |

## Input Types

| Type | Description |
|------|-------------|
| **Plain Text** | Describe your API endpoints in natural language |
| **OpenAPI 3.0 JSON** | Paste a raw OpenAPI 3.0 spec |
| **Swagger 2.0 JSON** | Paste a raw Swagger 2.0 spec |
| **URL** | Any API docs page or direct link to a JSON/YAML spec |
| **GitHub Repository** | Auto-finds `openapi.json` / `swagger.yaml` in repo root or `/docs` |
| **File Upload** | Upload a `.json` or `.yaml` spec file |
| **Manual Entry** | Fill in API name, base URL, and endpoints via a form |

## Features

- **Real-time agent visualization** — watch each agent's progress live via WebSocket streaming
- **Per-agent model configuration** — assign different IBM Granite models to each agent independently
- **Python & TypeScript output** — generated code follows MCP SDK best practices
- **README output tab** — generated README with setup instructions and Claude Desktop config, downloadable
- **Secure generated code** — environment variable API keys, 30s timeouts, full error handling
- **Generation insights** — see exactly what endpoints were found and what tools were created
- **One-click setup guide** — install commands + Claude Desktop / Cursor config included

## IBM Technology

- **IBM watsonx.ai** — Primary AI provider using Granite and other foundation models
  - `ibm/granite-4-h-small` — fast general-purpose tasks (default for most agents)
  - `ibm/granite-3-8b-instruct` — balanced instruction following
  - `ibm/granite-8b-code-instruct` — code generation (default for Code Generator agent)
  - `ibm/granite-guardian-3-8b` — Granite Guardian safety model
  - `meta-llama/llama-3-3-70b-instruct` — high-quality generation
  - `meta-llama/llama-4-maverick-17b-128e-instruct-fp8` — Llama 4 Maverick
  - `mistralai/mistral-small-3-1-24b-instruct-2503` — Mistral Small
- REST API with IAM token auth — chat endpoint with text/generation fallback

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- IBM watsonx.ai API key and Project ID ([get one here](https://cloud.ibm.com/catalog/services/watsonx-ai))

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env — fill in WATSONX_API_KEY, WATSONX_PROJECT_ID, WATSONX_URL
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

### Environment Variables

```env
WATSONX_API_KEY=your-ibm-cloud-api-key
WATSONX_PROJECT_ID=your-watsonx-project-id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

## Usage

1. Open `http://localhost:3000/generate`
2. Select an input type and provide your API spec
3. Select output language (Python or TypeScript)
4. Click **Generate MCP Server**
5. Watch all 8 agents process your spec in real time
6. Download generated code from the **Code** tab
7. Download the auto-generated README from the **README** tab

### Per-Agent Configuration

Visit `/settings` to assign a specific AI model and API key to each pipeline agent. Presets available:
- **Cost-Optimized** — Granite 4.0 small for all agents (fastest)
- **Balanced** — Granite 3 8B instruct for all agents
- **Performance** — Granite 8B Code instruct for all agents

## Project Structure

```
automcp/
├── backend/
│   ├── app/
│   │   ├── agents/          # 8-agent multi-agent pipeline
│   │   ├── api/simple/      # FastAPI endpoints + WebSocket
│   │   ├── providers/       # IBM watsonx.ai + OpenAI + Anthropic
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
User Input (OpenAPI / Swagger / URL / GitHub / File / Form / Plain Text)
         ↓
   WebSocket /api/simple/generate/stream
         ↓
   MultiAgentPipeline
   ├── InputParserAgent       → normalizes spec
   ├── SchemaExtractorAgent   → extracts endpoints
   ├── EndpointMapperAgent    → maps to MCP tools
   ├── AuthAnalyzerAgent      → detects auth
   ├── MCPTranslatorAgent     → formalizes JSON Schema
   ├── CodeGeneratorAgent     → generates code
   ├── ValidatorAgent         → validates + fixes code
   └── DocsGeneratorAgent     → writes README
         ↓
   Generated Python / TypeScript MCP Server + README.md
```

---

*Built for IBM Hackathon 2025 — demonstrating how IBM watsonx.ai Granite models can power a sophisticated multi-agent developer tooling workflow.*
