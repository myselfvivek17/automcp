# API Key UX & LLM Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store provider API keys securely in the backend `.env` file (never browser), fix LLM activation so real LLM calls fire when a key is configured.

**Architecture:** New `POST /api/simple/keys` and `GET /api/simple/keys/status` endpoints write keys to the backend `.env` via `python-dotenv set_key()` and expose them to agents immediately via `os.environ`. Frontend removes all `apiKey` fields from localStorage and all API key inputs from the UI; agents read keys from env via the existing `_env_key()` method, which already reads `os.environ`. The legacy `provider_service` fallback path in `_call_llm()` is removed — `_env_key()` is the single source of truth.

**Tech Stack:** FastAPI, python-dotenv (`set_key`), pydantic-settings, Next.js 14, LangChain (already integrated).

---

## File Map

| Action | File |
|--------|------|
| Create | `backend/app/api/simple/keys.py` |
| Create | `backend/tests/test_keys.py` |
| Modify | `backend/app/main.py` |
| Modify | `backend/app/api/simple/generation.py` |
| Modify | `backend/app/agents/multi_agent_pipeline.py` |
| Modify | `frontend/src/lib/agent-config.ts` |
| Modify | `frontend/src/lib/api.ts` |
| Modify | `frontend/src/app/settings/page.tsx` |
| Modify | `frontend/src/app/generate/page.tsx` |

---

### Task 1: Backend — Create `keys.py` router

**Files:**
- Create: `backend/app/api/simple/keys.py`
- Create: `backend/tests/test_keys.py`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/__init__.py` (empty file) and `backend/tests/test_keys.py`:

```python
# backend/tests/test_keys.py
import os
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.main import app


@pytest.mark.asyncio
async def test_get_keys_status_returns_booleans():
    """GET /api/simple/keys/status returns bool per provider, never key values."""
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "sk-or-test"}, clear=False):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/simple/keys/status")
    assert response.status_code == 200
    data = response.json()
    assert data["openrouter"] is True
    assert data["openai"] is False
    assert "sk-or-test" not in str(data)


@pytest.mark.asyncio
async def test_post_key_sets_env_var(tmp_path):
    """POST /api/simple/keys writes key to os.environ immediately."""
    env_file = tmp_path / ".env"
    env_file.write_text("")
    with patch("app.api.simple.keys.ENV_PATH", str(env_file)):
        with patch.dict(os.environ, {}, clear=False):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                response = await client.post(
                    "/api/simple/keys",
                    json={"provider": "openai", "key": "sk-test-123"},
                )
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert os.environ.get("OPENAI_API_KEY") == "sk-test-123"


@pytest.mark.asyncio
async def test_post_key_unknown_provider_returns_400():
    """POST /api/simple/keys with unknown provider returns 400."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/simple/keys",
            json={"provider": "unknown", "key": "sk-test"},
        )
    assert response.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
cd backend
python -m pytest tests/test_keys.py -v
```
Expected: `ImportError` or `404` — `keys.py` doesn't exist yet.

- [ ] **Step 3: Create `backend/app/api/simple/keys.py`**

```python
"""Provider key management — write API keys to backend .env, never return them."""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import set_key

router = APIRouter(prefix="/keys", tags=["keys"])

# Path to the backend .env file (backend/app/api/simple/keys.py → backend/.env)
ENV_PATH = str(Path(__file__).parent.parent.parent.parent / ".env")

PROVIDER_ENV_MAP: dict[str, str] = {
    "openai":     "OPENAI_API_KEY",
    "anthropic":  "ANTHROPIC_API_KEY",
    "google":     "GOOGLE_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "watsonx":    "WATSONX_API_KEY",
}


class SaveKeyRequest(BaseModel):
    provider: str
    key: str
    project_id: str = ""  # watsonx only
    url: str = ""         # watsonx only


@router.post("")
async def save_key(req: SaveKeyRequest):
    env_var = PROVIDER_ENV_MAP.get(req.provider)
    if env_var is None:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {req.provider!r}")

    env_path = Path(ENV_PATH)
    env_path.touch(exist_ok=True)

    set_key(ENV_PATH, env_var, req.key)
    os.environ[env_var] = req.key

    if req.provider == "watsonx":
        if req.project_id:
            set_key(ENV_PATH, "WATSONX_PROJECT_ID", req.project_id)
            os.environ["WATSONX_PROJECT_ID"] = req.project_id
        if req.url:
            set_key(ENV_PATH, "WATSONX_URL", req.url)
            os.environ["WATSONX_URL"] = req.url

    return {"ok": True}


@router.get("/status")
async def get_status():
    return {
        "openai":     bool(os.environ.get("OPENAI_API_KEY")),
        "anthropic":  bool(os.environ.get("ANTHROPIC_API_KEY")),
        "google":     bool(os.environ.get("GOOGLE_API_KEY")),
        "openrouter": bool(os.environ.get("OPENROUTER_API_KEY")),
        "watsonx":    bool(
            os.environ.get("WATSONX_API_KEY") and os.environ.get("WATSONX_PROJECT_ID")
        ),
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
cd backend
python -m pytest tests/test_keys.py -v
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/app/api/simple/keys.py backend/tests/__init__.py backend/tests/test_keys.py
git commit -m "feat: add /keys and /keys/status endpoints for secure provider key management"
```

---

### Task 2: Backend — Mount keys router in `main.py`

**Files:**
- Modify: `backend/app/main.py`

Current `backend/app/main.py` line 10:
```python
from app.api.simple.generation import router as generate_router
```
Current line 47:
```python
app.include_router(generate_router, prefix="/api/simple")
```

- [ ] **Step 1: Add keys router import and mount**

Add the import after line 10:
```python
from app.api.simple.keys import router as keys_router
```

Add the router mount after line 47 (the existing `app.include_router(generate_router, ...)`):
```python
app.include_router(keys_router, prefix="/api/simple")
```

- [ ] **Step 2: Verify endpoints are registered**

```powershell
cd backend
python -c "from app.main import app; routes = [r.path for r in app.routes]; print([r for r in routes if 'keys' in r])"
```
Expected output: `['/api/simple/keys', '/api/simple/keys/status']`

- [ ] **Step 3: Commit**

```powershell
git add backend/app/main.py
git commit -m "feat: mount keys router at /api/simple"
```

---

### Task 3: Backend — Simplify `generation.py`

**Files:**
- Modify: `backend/app/api/simple/generation.py`

Changes: remove `api_key` and `provider` from `GenerateRequest`, remove `apiKey` from `AgentConfig`, remove `_build_provider_service` (agents use env vars directly). Pass `provider_service=None` explicitly.

- [ ] **Step 1: Replace `generation.py` with the simplified version**

Full new content for `backend/app/api/simple/generation.py`:

```python
"""
Simple generation API — real multi-agent pipeline with WebSocket streaming
"""
import json
from typing import Optional, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.agents.multi_agent_pipeline import MultiAgentPipeline

router = APIRouter(prefix="/generate", tags=["generation"])


class AgentConfig(BaseModel):
    provider: str = "watsonx"
    model: str = ""


class GenerateRequest(BaseModel):
    input_type: str
    content: str
    language: str = "python"
    agent_configs: Optional[Dict[str, AgentConfig]] = None


@router.post("")
async def generate(req: GenerateRequest):
    """Synchronous generation endpoint"""
    pipeline = MultiAgentPipeline()
    result = await pipeline.run({
        "input_type": req.input_type,
        "content": req.content,
        "language": req.language,
        "agent_configs": {k: v.model_dump() for k, v in (req.agent_configs or {}).items()},
    })
    return {"success": True, "code": result.get("code", ""), "message": "Generated successfully"}


@router.websocket("/stream")
async def generate_stream(websocket: WebSocket):
    """WebSocket streaming endpoint — streams agent updates in real time"""
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        data = GenerateRequest(**json.loads(raw))

        async def send_update(msg):
            try:
                await websocket.send_text(json.dumps(msg.to_dict()))
            except Exception:
                pass

        pipeline = MultiAgentPipeline()
        await pipeline.run(
            {
                "input_type": data.input_type,
                "content": data.content,
                "language": data.language,
                "agent_configs": {k: v.model_dump() for k, v in (data.agent_configs or {}).items()},
            },
            callback=send_update,
        )
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            from app.agents.multi_agent_pipeline import AgentMessage
            err = AgentMessage("Pipeline", "error", None, 0.0, str(e))
            await websocket.send_text(json.dumps(err.to_dict()))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/languages")
async def list_languages():
    return {"languages": ["python", "typescript"]}


@router.get("/input-types")
async def list_input_types():
    return {"input_types": ["text", "openapi", "swagger"]}


@router.get("/providers")
async def list_providers():
    return {
        "providers": [
            {"id": "watsonx", "name": "IBM Watsonx.ai", "models": [
                "ibm/granite-13b-chat-v2",
                "ibm/granite-20b-code-instruct",
                "ibm/granite-34b-code-instruct",
                "ibm/granite-3-8b-instruct",
            ]},
            {"id": "openai", "name": "OpenAI", "models": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]},
            {"id": "anthropic", "name": "Anthropic Claude", "models": ["claude-opus-4-7", "claude-sonnet-4-6"]},
            {"id": "google", "name": "Google Gemini", "models": ["gemini-1.5-pro", "gemini-1.5-flash"]},
            {"id": "openrouter", "name": "OpenRouter", "models": [
                "meta-llama/llama-3.3-70b-instruct:free",
                "mistralai/mistral-7b-instruct:free",
                "qwen/qwen-2.5-72b-instruct:free",
                "openai/gpt-4o",
                "anthropic/claude-sonnet-4-5",
                "google/gemini-pro-1.5",
            ]},
        ]
    }
```

- [ ] **Step 2: Verify the module imports cleanly**

```powershell
cd backend
python -c "from app.api.simple.generation import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```powershell
git add backend/app/api/simple/generation.py
git commit -m "refactor: remove api_key/provider from GenerateRequest, agents use env vars directly"
```

---

### Task 4: Backend — Remove legacy `provider_service` fallback from `_call_llm()`

**Files:**
- Modify: `backend/app/agents/multi_agent_pipeline.py`

The `_call_llm` method is at lines 110-144. The legacy fallback (lines 127-144) uses `self.provider_service` which is now always `None`. Remove it.

- [ ] **Step 1: Replace `_call_llm` method body**

Find this exact block in `backend/app/agents/multi_agent_pipeline.py`:

```python
    async def _call_llm(self, prompt: str, max_tokens: int = 2000) -> Optional[str]:
        """Call LLM via LangChain. Falls back to legacy provider_service if no LangChain model."""
        llm = self._get_llm(max_tokens)
        if llm is not None:
            try:
                from langchain_core.messages import HumanMessage
                logger.info(f"[LLM] {self.name} → {type(llm).__name__}")
                response = await llm.ainvoke([HumanMessage(content=prompt)])
                result = response.content
                if isinstance(result, str) and result:
                    logger.info(f"[LLM] {self.name} got {len(result)} chars")
                    return result
                logger.warning(f"[LLM] {self.name} empty response")
            except Exception as e:
                logger.warning(f"[LLM] {self.name} LangChain call failed: {e}")
            return None

        # Legacy fallback: raw provider_service
        if not self.provider_service:
            return None
        provider = self.provider_service.get_provider()
        if not provider:
            return None
        try:
            model_id = self._current_cfg.get("model") or None
            kwargs: Dict[str, Any] = {"max_tokens": max_tokens}
            if model_id:
                kwargs["model_id"] = model_id
            logger.info(f"[LLM] {self.name} legacy {provider.__class__.__name__} model={model_id or 'default'}")
            result = await asyncio.to_thread(provider.generate, prompt, **kwargs)
            if isinstance(result, str) and result and not result.startswith("Error:"):
                return result
        except Exception as e:
            logger.warning(f"[LLM] {self.name} legacy call failed: {e}")
        return None
```

Replace with:

```python
    async def _call_llm(self, prompt: str, max_tokens: int = 2000) -> Optional[str]:
        """Call LLM via LangChain. Returns None if no model configured (triggers deterministic fallback)."""
        llm = self._get_llm(max_tokens)
        if llm is None:
            return None
        try:
            from langchain_core.messages import HumanMessage
            logger.info(f"[LLM] {self.name} → {type(llm).__name__}")
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            result = response.content
            if isinstance(result, str) and result:
                logger.info(f"[LLM] {self.name} got {len(result)} chars")
                return result
            logger.warning(f"[LLM] {self.name} empty response")
        except Exception as e:
            logger.warning(f"[LLM] {self.name} LangChain call failed: {e}")
        return None
```

- [ ] **Step 2: Verify the module imports cleanly**

```powershell
cd backend
python -c "from app.agents.multi_agent_pipeline import MultiAgentPipeline; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```powershell
git add backend/app/agents/multi_agent_pipeline.py
git commit -m "refactor: remove legacy provider_service fallback from _call_llm, env vars are source of truth"
```

---

### Task 5: Frontend — Update `agent-config.ts`

**Files:**
- Modify: `frontend/src/lib/agent-config.ts`

- [ ] **Step 1: Remove `apiKey` from `AgentConfig` interface (line 1-5)**

Replace:
```typescript
export interface AgentConfig {
  provider: string;
  model: string;
  apiKey: string;
}
```
With:
```typescript
export interface AgentConfig {
  provider: string;
  model: string;
}
```

- [ ] **Step 2: Remove `apiKey` from all 8 `DEFAULT_CONFIGS` entries (lines 54-63)**

Replace the entire `DEFAULT_CONFIGS` block:
```typescript
export const DEFAULT_CONFIGS: AgentConfigs = {
  'Input Parser':    { provider: 'watsonx', model: 'ibm/granite-4-h-small',        apiKey: '' },
  'Schema Extractor':{ provider: 'watsonx', model: 'ibm/granite-4-h-small',        apiKey: '' },
  'Endpoint Mapper': { provider: 'watsonx', model: 'ibm/granite-4-h-small',        apiKey: '' },
  'Auth Analyzer':   { provider: 'watsonx', model: 'ibm/granite-4-h-small',        apiKey: '' },
  'MCP Translator':  { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct',    apiKey: '' },
  'Code Generator':  { provider: 'watsonx', model: 'ibm/granite-8b-code-instruct', apiKey: '' },
  'Validator':       { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct',    apiKey: '' },
  'Docs Generator':  { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct',    apiKey: '' },
};
```
With:
```typescript
export const DEFAULT_CONFIGS: AgentConfigs = {
  'Input Parser':    { provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'Schema Extractor':{ provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'Endpoint Mapper': { provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'Auth Analyzer':   { provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'MCP Translator':  { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct' },
  'Code Generator':  { provider: 'watsonx', model: 'ibm/granite-8b-code-instruct' },
  'Validator':       { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct' },
  'Docs Generator':  { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct' },
};
```

- [ ] **Step 3: Bump `CONFIG_VERSION` to `'3.0'` (line 72)**

Replace:
```typescript
const CONFIG_VERSION = '2.0'; // Increment when DEFAULT_CONFIGS structure changes
```
With:
```typescript
const CONFIG_VERSION = '3.0';
```

- [ ] **Step 4: Verify TypeScript compiles**

```powershell
cd frontend
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Expected: No errors from `agent-config.ts`. (Errors in other files will be fixed in later tasks.)

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/lib/agent-config.ts
git commit -m "refactor: remove apiKey from AgentConfig, bump CONFIG_VERSION to 3.0"
```

---

### Task 6: Frontend — Update `api.ts`

**Files:**
- Modify: `frontend/src/lib/api.ts`

The current `api.ts` has a dead `generateMCP` function pointing to a non-existent `/api/v1/generation/generate` path. Replace the entire file.

- [ ] **Step 1: Replace `api.ts` entirely**

Full new content for `frontend/src/lib/api.ts`:

```typescript
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProviderStatus {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  openrouter: boolean;
  watsonx: boolean;
}

export interface SaveKeyPayload {
  provider: string;
  key: string;
  project_id?: string;
  url?: string;
}

export async function saveProviderKey(payload: SaveKeyPayload): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/simple/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to save key');
  }
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch(`${BACKEND_URL}/api/simple/keys/status`);
  if (!res.ok) throw new Error('Failed to fetch key status');
  return res.json();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
cd frontend
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Expected: No errors from `api.ts`.

- [ ] **Step 3: Commit**

```powershell
git add frontend/src/lib/api.ts
git commit -m "feat: add saveProviderKey and getProviderStatus to api.ts"
```

---

### Task 7: Frontend — Update `settings/page.tsx`

**Files:**
- Modify: `frontend/src/app/settings/page.tsx`

Changes: add Provider Keys section at top (with status dots and Save buttons), remove per-agent API Key input, update footer text, add imports and state variables.

- [ ] **Step 1: Add imports for `api.ts` functions**

At the top of `frontend/src/app/settings/page.tsx`, the current import block ends at line 15. Add one import line after the existing `@/lib/agent-config` import:

```typescript
import { saveProviderKey, getProviderStatus, ProviderStatus, SaveKeyPayload } from '@/lib/api';
```

- [ ] **Step 2: Add Provider Keys state variables inside `SettingsPage`**

After `const [saved, setSaved] = useState(false);` (line 47), add:

```typescript
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    openai: false, anthropic: false, google: false, openrouter: false, watsonx: false,
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});
  const [keySaved, setKeySaved] = useState<Record<string, boolean>>({});
```

- [ ] **Step 3: Add `useEffect` to fetch provider status on mount**

After the existing `useEffect(() => { setConfigs(loadAgentConfigs()); }, []);` (line 49), add:

```typescript
  useEffect(() => {
    getProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);
```

- [ ] **Step 4: Add `handleSaveKey` function**

After the `handleReset` function (around line 86), add:

```typescript
  const handleSaveKey = async (provider: string) => {
    const key = keyInputs[provider] ?? '';
    if (!key) return;
    setKeySaving(prev => ({ ...prev, [provider]: true }));
    try {
      const payload: SaveKeyPayload = { provider, key };
      if (provider === 'watsonx') {
        payload.project_id = keyInputs['watsonx_project_id'] ?? '';
        payload.url = keyInputs['watsonx_url'] ?? '';
      }
      await saveProviderKey(payload);
      const status = await getProviderStatus();
      setProviderStatus(status);
      setKeySaved(prev => ({ ...prev, [provider]: true }));
      setTimeout(() => setKeySaved(prev => ({ ...prev, [provider]: false })), 2000);
    } catch {
      alert(`Failed to save ${provider} key`);
    } finally {
      setKeySaving(prev => ({ ...prev, [provider]: false }));
    }
  };
```

- [ ] **Step 5: Add Provider Keys section JSX**

In the JSX return, find the agent rows section which begins with:
```tsx
        <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 16, marginBottom: 24 }}>
```
Insert the following Provider Keys `<div>` block immediately before it:

```tsx
        {/* Provider Keys */}
        <div className="surface" style={{ padding: 20, marginBottom: 24 }}>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>
            Provider API Keys
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>
            Keys are stored in the backend .env file — never in your browser.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 14 }}>
            {(['openrouter', 'openai', 'anthropic', 'watsonx'] as const).map(prov => (
              <div key={prov}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: providerStatus[prov] ? 'var(--ok)' : 'var(--ink-mute)',
                  }} />
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>
                    {prov === 'openrouter' ? 'OpenRouter' : prov === 'openai' ? 'OpenAI' : prov === 'anthropic' ? 'Anthropic' : 'IBM Watsonx.ai'}
                    {providerStatus[prov] && <span style={{ color: 'var(--ok)', marginLeft: 6, fontWeight: 400 }}> configured</span>}
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    value={keyInputs[prov] ?? ''}
                    onChange={e => setKeyInputs(prev => ({ ...prev, [prov]: e.target.value }))}
                    placeholder={prov === 'openrouter' ? 'sk-or-...' : prov === 'openai' ? 'sk-...' : prov === 'anthropic' ? 'sk-ant-...' : 'IBM API key'}
                    className="field"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => handleSaveKey(prov)}
                    className="btn btn-sm"
                    disabled={keySaving[prov] || !keyInputs[prov]}
                    style={{
                      flexShrink: 0,
                      background: keySaved[prov] ? 'var(--ok)' : undefined,
                      color: keySaved[prov] ? 'var(--paper)' : undefined,
                      borderColor: keySaved[prov] ? 'var(--ok)' : undefined,
                    }}
                  >
                    {keySaved[prov] ? '✓ Saved' : keySaving[prov] ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {prov === 'watsonx' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <input
                      type="text"
                      value={keyInputs['watsonx_project_id'] ?? ''}
                      onChange={e => setKeyInputs(prev => ({ ...prev, watsonx_project_id: e.target.value }))}
                      placeholder="Project ID (required)"
                      className="field"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      value={keyInputs['watsonx_url'] ?? ''}
                      onChange={e => setKeyInputs(prev => ({ ...prev, watsonx_url: e.target.value }))}
                      placeholder="URL (optional)"
                      className="field"
                      style={{ flex: 1 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
```

- [ ] **Step 6: Remove per-agent API Key input**

In the agent rows section (inside `{AGENT_ORDER.map(...)}` around line 176), find and remove the entire `<div style={{ gridColumn: '1 / -1' }}>` block containing the API Key Override input:

```tsx
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                      API Key Override{' '}
                      <span style={{ fontWeight: 'normal', color: 'var(--ink-mute)' }}>(optional — falls back to global key)</span>
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={e => updateAgent(name, 'apiKey', e.target.value)}
                      placeholder="Leave empty to use the global API key"
                      className={SELECT_CLS}
                    />
                  </div>
```

After removing that block, also change the grid from `repeat(2, minmax(0, 1fr))` to keep 2 columns (already correct, just the agent row grid wrapper for provider+model). No column-span change needed since the removed element used `gridColumn: '1 / -1'`.

- [ ] **Step 7: Update footer paragraph**

Find:
```tsx
          Configuration is saved locally in your browser and sent to the pipeline on each generation.
```
Replace with:
```tsx
          Agent provider/model settings are saved in your browser. API keys are stored in the backend .env file.
```

- [ ] **Step 8: Verify TypeScript compiles**

```powershell
cd frontend
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: No errors from `settings/page.tsx`.

- [ ] **Step 9: Commit**

```powershell
git add frontend/src/app/settings/page.tsx
git commit -m "feat: add Provider Keys section to settings, remove per-agent apiKey fields"
```

---

### Task 8: Frontend — Update `generate/page.tsx`

**Files:**
- Modify: `frontend/src/app/generate/page.tsx`

The current generate page (line 249-251) has `apiKey` and `provider` state. Lines 538-579 have the Provider and API Key form inputs. The `ws.onopen` (lines 359-378) injects apiKey. Replace these with a provider status bar.

- [ ] **Step 1: Add `getProviderStatus` and `ProviderStatus` import**

At the top of `frontend/src/app/generate/page.tsx`, after the existing imports, add:

```typescript
import { getProviderStatus, ProviderStatus } from '@/lib/api';
```

- [ ] **Step 2: Replace `apiKey` and `provider` state with `providerStatus` state**

Find (lines 249-250):
```typescript
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('watsonx');
```
Replace with:
```typescript
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    openai: false, anthropic: false, google: false, openrouter: false, watsonx: false,
  });
```

- [ ] **Step 3: Add `useEffect` to load provider status on mount**

After the existing `useEffect` for `savedSession` (around line 269), add:

```typescript
  useEffect(() => {
    getProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);
```

- [ ] **Step 4: Simplify `ws.onopen` — remove apiKey injection**

Find the `ws.onopen` block (lines 359-378):
```typescript
    ws.onopen = () => {
      setOverallProgress(0);
      const agentConfigs = loadAgentConfigs();
      // Inject global API key into all agents using the selected provider
      if (apiKey) {
        for (const name of Object.keys(agentConfigs) as Array<keyof typeof agentConfigs>) {
          if (agentConfigs[name].provider === provider) {
            agentConfigs[name] = { ...agentConfigs[name], apiKey };
          }
        }
      }
      ws.send(JSON.stringify({
        input_type: inputType,
        content,
        language,
        api_key: apiKey || undefined,
        provider,
        agent_configs: agentConfigs,
      }));
    };
```
Replace with:
```typescript
    ws.onopen = () => {
      setOverallProgress(0);
      const agentConfigs = loadAgentConfigs();
      ws.send(JSON.stringify({
        input_type: inputType,
        content,
        language,
        agent_configs: agentConfigs,
      }));
    };
```

- [ ] **Step 5: Replace provider dropdown and API key input with status bar**

Find the entire `<div>` for "AI Provider (Optional)" and the `<div>` for "API Key" (lines 538-579):

```tsx
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>AI Provider (Optional)</label>
                  <select title="AI provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={INPUT_CLS}>
                    <option value="watsonx">IBM Watsonx.ai</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="google">Google Gemini</option>
                    <option value="openrouter">OpenRouter (free models available)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>
                    <span>API Key</span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '11px',
                      fontWeight: 400,
                      color: apiKey ? 'var(--ok)' : 'var(--ink-mute)',
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: apiKey ? 'var(--ok)' : 'var(--ink-mute)',
                        display: 'inline-block',
                      }} />
                      {apiKey ? 'API key set — all agents will use this' : 'Mock mode (no API key)'}
                    </span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave empty for mock generation"
                    className={INPUT_CLS}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>
                    One key for all agents — no per-agent key needed. Works without a key using deterministic fallback.
                  </p>
                </div>
```

Replace with:

```tsx
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>AI Providers</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as any }}>
                    {(['openrouter', 'openai', 'anthropic', 'watsonx'] as const).filter(p => providerStatus[p]).map(p => (
                      <span key={p} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px',
                        background: '#e6f4ea',
                        color: '#1a7f37',
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        fontFamily: 'var(--sans)',
                        fontWeight: 500,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a7f37', display: 'inline-block' }} />
                        {p === 'openrouter' ? 'OpenRouter' : p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Watsonx'}
                      </span>
                    ))}
                    {!Object.values(providerStatus).some(Boolean) && (
                      <span style={{ fontSize: '12px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>
                        No keys set —{' '}
                        <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>add in Settings</a>
                        {' '}(pipeline still runs with deterministic fallback)
                      </span>
                    )}
                  </div>
                </div>
```

- [ ] **Step 6: Verify TypeScript compiles**

```powershell
cd frontend
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: Zero errors.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/app/generate/page.tsx
git commit -m "feat: replace apiKey/provider inputs with provider status bar on generate page"
```

---

### Task 9: End-to-end smoke test

- [ ] **Step 1: Start backend**

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```
In a second terminal, verify:
```powershell
curl http://localhost:8000/api/simple/keys/status
```
Expected: `{"openai":false,"anthropic":false,"google":false,"openrouter":false,"watsonx":false}`

- [ ] **Step 2: Save a key via API**

```powershell
curl -X POST http://localhost:8000/api/simple/keys -H "Content-Type: application/json" -d '{"provider":"openrouter","key":"sk-or-test-key"}'
```
Expected: `{"ok":true}`

- [ ] **Step 3: Verify status updates**

```powershell
curl http://localhost:8000/api/simple/keys/status
```
Expected: `{"openai":false,"anthropic":false,"google":false,"openrouter":true,"watsonx":false}`

- [ ] **Step 4: Start frontend and verify Settings page**

```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000/settings` — verify:
- "Provider API Keys" section appears at top
- OpenRouter shows green dot (key was saved in step 2)
- No API Key Override input in agent rows

- [ ] **Step 5: Verify Generate page**

Open `http://localhost:3000/generate` — verify:
- No "AI Provider" dropdown
- No "API Key" input
- Green "OpenRouter ✓" badge shown in provider status area
- Click Generate — pipeline runs; check backend logs for `[LLM]` lines showing real LLM calls

- [ ] **Step 6: Final commit if everything is clean**

```powershell
git add -A
git status
git commit -m "chore: verified end-to-end LLM activation and key management flow"
```
