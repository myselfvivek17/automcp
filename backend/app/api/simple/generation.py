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
