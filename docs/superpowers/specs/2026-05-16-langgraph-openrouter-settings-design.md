# AutoMCP: LangGraph Migration + OpenRouter + Settings Fix

**Date:** 2026-05-16  
**Scope:** Four improvements to the AutoMCP backend and frontend

---

## 1. Goals

1. Replace `MultiAgentPipeline` custom orchestration with a proper LangGraph `StateGraph`
2. Replace raw HTTP `_call_llm()` with LangChain `BaseChatModel` per provider
3. Add OpenRouter as a selectable provider (backend + frontend)
4. Fix settings page to show all 8 agents instead of 5

---

## 2. LangGraph Migration — Approach A (Adapter)

### 2.1 State Schema

A single `PipelineState` TypedDict replaces the loose `current_data` dict passed through agents.

```python
# backend/app/agents/state.py
from typing import Any, TypedDict

class PipelineState(TypedDict, total=False):
    # request inputs
    input_type: str
    content: str
    language: str
    agent_configs: dict[str, dict]
    _callback: Any          # WebSocket send callable
    _provider_service: Any  # legacy compat, None if unused

    # accumulated agent outputs
    parsed_input: dict
    endpoints: list
    schemas: dict
    base_url: str
    mcp_tools: list
    tool_count: int
    auth_required: bool
    auth_config: dict
    mcp_schema: dict
    code: str
    validation_result: dict
    readme: str
```

### 2.2 Agent Adapter

Each existing agent class gains one new method:

```python
async def __call__(self, state: PipelineState) -> dict:
    # set internal cfg from state
    self._current_cfg = state.get("agent_configs", {}).get(self.name, {})
    result = await self.process(dict(state))
    return result   # only the fields this agent produces
```

`process()` stays unchanged. LangGraph merges returned dict into state automatically.

### 2.3 LangChain Model Integration

`BaseAgent._call_llm()` is replaced by `_get_llm()` returning a `BaseChatModel`:

```python
def _get_llm(self) -> BaseChatModel:
    provider = self._current_cfg.get("provider", "watsonx")
    model    = self._current_cfg.get("model", self._default_model)
    api_key  = self._current_cfg.get("apiKey") or self._env_key(provider)

    if provider == "watsonx":
        return ChatWatsonx(model_id=model, watsonx_url=..., project_id=..., token=...)
    elif provider == "openai":
        return ChatOpenAI(model=model, api_key=api_key)
    elif provider == "anthropic":
        return ChatAnthropic(model=model, api_key=api_key)
    elif provider == "openrouter":
        return ChatOpenAI(
            model=model, api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={"HTTP-Referer": "https://automcp.dev"}
        )
    raise ValueError(f"Unknown provider: {provider}")

async def _call_llm(self, prompt: str, **kwargs) -> str | None:
    try:
        llm = self._get_llm()
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        logger.warning(f"LLM call failed: {e}")
        return None
```

Deterministic fallback logic in each agent is untouched.

### 2.4 Graph Construction

```python
# backend/app/agents/pipeline_graph.py
from langgraph.graph import StateGraph, END
from .state import PipelineState

def build_pipeline(agents: dict) -> CompiledGraph:
    graph = StateGraph(PipelineState)

    NODES = [
        ("input_parser",     agents["InputParser"]),
        ("schema_extractor", agents["SchemaExtractor"]),
        ("endpoint_mapper",  agents["EndpointMapper"]),
        ("auth_analyzer",    agents["AuthAnalyzer"]),
        ("mcp_translator",   agents["MCPTranslator"]),
        ("code_generator",   agents["CodeGenerator"]),
        ("validator",        agents["Validator"]),
        ("docs_generator",   agents["DocsGenerator"]),
    ]

    for name, agent in NODES:
        graph.add_node(name, agent)

    graph.set_entry_point("input_parser")
    for i in range(len(NODES) - 1):
        graph.add_edge(NODES[i][0], NODES[i + 1][0])
    graph.add_edge("docs_generator", END)

    return graph.compile()
```

### 2.5 Streaming via astream_events

The WebSocket endpoint switches from manual callback to LangGraph event streaming:

```python
compiled = build_pipeline(agents)
async for event in compiled.astream_events(initial_state, version="v2"):
    kind = event["event"]
    name = event.get("name", "")
    if kind == "on_chain_start" and name in NODE_TO_AGENT:
        await send_update(AgentMessage(agent_name=NODE_TO_AGENT[name], status="running", ...))
    elif kind == "on_chain_end" and name in NODE_TO_AGENT:
        await send_update(AgentMessage(agent_name=NODE_TO_AGENT[name], status="complete", ...))
```

---

## 3. OpenRouter Provider

### 3.1 Backend

New file `backend/app/providers/openrouter.py`:

```python
class OpenRouterProvider(BaseAIProvider):
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
    DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

    async def generate(self, prompt: str, **kwargs) -> str:
        # OpenAI-compatible, adds HTTP-Referer header
        ...
```

`factory.py` gains `"openrouter"` → `OpenRouterProvider`.  
`config.py` gains `OPENROUTER_API_KEY: str = ""`.  
`.env.example` gains `OPENROUTER_API_KEY=`.

### 3.2 Frontend Models

`agent-config.ts` `MODELS_BY_PROVIDER` gains:

```ts
openrouter: [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4-5",
  "google/gemini-pro-1.5",
]
```

Settings page provider dropdown gains `OpenRouter` option.  
Default agent configs stay on Watsonx; OpenRouter is an opt-in alternative.

---

## 4. Settings Agent Fix

`settings/page.tsx` `AGENT_ORDER` currently has 5 entries. Replace with all 8 in pipeline order:

```ts
const AGENT_ORDER: AgentName[] = [
  'Input Parser',
  'Schema Extractor',
  'Endpoint Mapper',
  'Auth Analyzer',
  'MCP Translator',   // was missing
  'Code Generator',
  'Validator',        // was missing
  'Docs Generator',   // was missing
];
```

`agent-config.ts` already defines all 8 names and defaults — no type changes required.

---

## 5. New Dependencies

```
# backend/requirements.txt additions
langgraph>=0.2.0
langchain>=0.3.0
langchain-openai>=0.2.0
langchain-anthropic>=0.2.0
langchain-ibm>=0.3.0
```

---

## 6. Files Changed

| File | Change |
|---|---|
| `backend/app/agents/state.py` | **new** — PipelineState TypedDict |
| `backend/app/agents/pipeline_graph.py` | **new** — StateGraph builder |
| `backend/app/agents/multi_agent_pipeline.py` | adapt agents + replace `_call_llm` + replace orchestrator |
| `backend/app/providers/openrouter.py` | **new** — OpenRouter provider |
| `backend/app/providers/factory.py` | add openrouter case |
| `backend/app/config.py` | add OPENROUTER_API_KEY |
| `backend/app/api/simple/generation.py` | switch to graph streaming |
| `backend/requirements.txt` | add langchain packages |
| `.env.example` | add OPENROUTER_API_KEY |
| `frontend/src/lib/agent-config.ts` | add openrouter models |
| `frontend/src/app/settings/page.tsx` | fix AGENT_ORDER to 8 agents, add OpenRouter provider |

---

## 7. Error Handling

- All agents retain deterministic fallback — LLM failure never crashes the pipeline
- LangGraph node exceptions propagate as graph errors; caught in WebSocket handler and sent as error AgentMessage
- OpenRouter 402/429 errors surfaced as LLM failure → deterministic fallback kicks in

---

## 8. Out of Scope

- Conditional edges / branching (future: retry loops, parallel agents)
- LangSmith tracing integration
- Human-in-the-loop checkpoints
- Replacing `ValidatorAgent` with a LangGraph interrupt
