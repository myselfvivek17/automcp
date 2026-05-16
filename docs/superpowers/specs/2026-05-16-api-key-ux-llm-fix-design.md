# API Key UX & LLM Activation — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all API key fields from the browser; store provider keys securely in the backend `.env` file; ensure real LLM calls fire when a key is configured instead of falling through to deterministic mock code.

**Date:** 2026-05-16

---

## Problem Statement

### 1 — API Key confusion
Keys can be entered in two places (generate page global field, and per-agent field in Settings). They interact in non-obvious ways. Users cannot tell which key is actually being used.

### 2 — LLM never fires
Root cause: all 8 agents default to `provider: "watsonx"`. When the user picks "OpenRouter" on the generate page and enters a key, the injection code only fills agents whose `provider` already equals `"openrouter"` — so zero agents get the key. All fall through to deterministic/mock fallback.

---

## Chosen Approach: Backend-Managed Keys

Keys are written once to the backend `.env` file via a small API. They are never stored in the browser. The browser only stores per-agent `provider` + `model` selection.

---

## Architecture

### Data stores

```
Browser localStorage (unchanged key: automcp_agent_configs):
  Record<AgentName, { provider: string; model: string }>
  — NO apiKey field

Backend .env file (already exists):
  OPENROUTER_API_KEY=sk-or-...
  OPENAI_API_KEY=sk-...
  ANTHROPIC_API_KEY=sk-ant-...
  GOOGLE_API_KEY=...
  WATSONX_API_KEY=...
  WATSONX_PROJECT_ID=...
  WATSONX_URL=...
```

### New backend endpoints

```
POST /api/simple/keys
  Body: { provider: "openrouter", key: "sk-or-..." }
  Action: write OPENROUTER_API_KEY=<key> to backend .env; reload settings
  Response: { ok: true }

GET /api/simple/keys/status
  Response: { openrouter: true, openai: false, anthropic: false, google: false, watsonx: false }
  — returns boolean per provider; never returns key values
```

### Key resolution in agents (backend)

`BaseAgent._env_key()` already reads env vars. No change needed there.

`MultiAgentPipeline.run()` no longer receives `api_key` in the payload (frontend stops sending it). Agents call `_env_key(provider)` to get the key from the environment, which is now always up-to-date because `POST /keys` reloads settings.

### LLM activation fix

`_get_llm()` falls back to `None` for watsonx when `WATSONX_PROJECT_ID` is missing. For all other providers (openai, anthropic, openrouter, google) it only needs the API key. So:

- If `agent_config.provider == "openrouter"` and `OPENROUTER_API_KEY` is set → `_get_llm()` returns a real LangChain model → real LLM call fires.
- No more injection hacks needed in the frontend.

The actual bug fix: **agents must read their provider from their per-agent config**, and the env var for that provider must be populated. When both are true, LLM fires. This already works in the code — the only missing piece was that the env var was never being set via the UI.

---

## Frontend Changes

### `frontend/src/lib/agent-config.ts`
- Remove `apiKey` field from `AgentConfig` interface
- Remove `apiKey` from `DEFAULT_CONFIGS`
- Remove `apiKey` from `loadAgentConfigs` / `saveAgentConfigs`
- Add `CONFIG_VERSION` bump to `'3.0'` to clear stale localStorage

### `frontend/src/app/settings/page.tsx`
**Provider Keys section (new, at top of page):**
- One password input + "Save" button per provider (watsonx, openai, anthropic, google, openrouter)
- On save: `POST /api/simple/keys` with `{ provider, key }`
- Show green dot (configured) / gray dot (not set) per provider — fetched from `GET /keys/status` on mount
- Watsonx additionally shows Project ID and URL fields (two extra inputs)

**Agent rows (modified):**
- Remove `apiKey` input field entirely
- Keep provider dropdown + model dropdown

### `frontend/src/app/generate/page.tsx`
- Remove `apiKey` state + input field entirely
- Remove top-level `provider` state + dropdown
- Add provider status bar (read from `GET /keys/status`): small badges showing "OpenRouter ✓" / "Watsonx ✓" etc.
- `handleGenerate` sends only `{ input_type, content, language, agent_configs }` — no `api_key` or `provider`

### `frontend/src/lib/api.ts`
- Add `saveProviderKey(provider: string, key: string): Promise<void>`
- Add `getProviderStatus(): Promise<Record<string, boolean>>`

---

## Backend Changes

### `backend/app/api/simple/keys.py` (new file)
```python
router = APIRouter(prefix="/keys", tags=["keys"])

PROVIDER_ENV_MAP = {
    "openai":     [("OPENAI_API_KEY", "key")],
    "anthropic":  [("ANTHROPIC_API_KEY", "key")],
    "google":     [("GOOGLE_API_KEY", "key")],
    "openrouter": [("OPENROUTER_API_KEY", "key")],
    "watsonx":    [
        ("WATSONX_API_KEY", "key"),
        ("WATSONX_PROJECT_ID", "project_id"),
        ("WATSONX_URL", "url"),
    ],
}

POST /keys
  → use python-dotenv's dotenv_values() + set_key(env_path, ENV_VAR, value) to write
  → also set os.environ[ENV_VAR] = value immediately so agents pick it up without restart
  → Response: { ok: true }

GET /keys/status
  → check os.environ for each known env var; return boolean per provider
  → Response: { openrouter: true, openai: false, ... }
  — never returns key values
```

### `backend/app/main.py`
- Mount new keys router at `/api/simple`

### `backend/app/api/simple/generation.py`
- Remove `api_key` and `provider` fields from `GenerateRequest`
- `_build_provider_service()` reads from `settings` only (already does this as fallback — make it primary)

### `backend/app/agents/multi_agent_pipeline.py`
- `MultiAgentPipeline.run()`: remove `_provider_service` injection (agents use env vars directly via `_env_key()`)
- `BaseAgent._call_llm()`: simplify — remove legacy `provider_service` fallback path (it's no longer needed; env vars are the single source of truth)

---

## Data Flow (after fix)

```
1. User opens Settings
2. GET /keys/status → shows which providers configured
3. User enters OpenRouter key → POST /keys { provider: "openrouter", key: "sk-..." }
4. Backend writes OPENROUTER_API_KEY to .env, sets os.environ["OPENROUTER_API_KEY"]

5. User opens Generate page
6. GET /keys/status → status bar shows "OpenRouter ✓"
7. User clicks Generate
8. Frontend sends: { input_type, content, language,
     agent_configs: { "Code Generator": { provider: "openrouter", model: "openai/gpt-4o" }, ... } }

9. Each agent's __call__: self._current_cfg = agent_configs[self.name]
10. _get_llm(): provider="openrouter", api_key=_env_key("openrouter") → OPENROUTER_API_KEY → real key
11. LangChain ChatOpenAI(base_url=openrouter) fires real LLM call
12. Real code generated
```

---

## What Does NOT Change

- LangGraph StateGraph pipeline structure
- Per-agent provider + model selection in Settings
- `_get_llm()` LangChain logic
- `_extract_json()`, agent `process()` methods
- All 8 agent classes
- WebSocket streaming

---

## Security Properties

- API keys never stored in browser (not localStorage, not sessionStorage)
- Keys never returned from backend (status endpoint returns booleans only)
- Keys live in `.env` on the local machine — same threat model as any local dev tool
- XSS cannot steal keys (they're not in the browser)

---

## Out of Scope

- Key encryption at rest (acceptable for a local dev tool)
- Multi-user key isolation
- Key rotation / expiry
- Google Gemini LangChain integration (langchain-google-genai not yet in requirements)
