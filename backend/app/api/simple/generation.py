"""
Simple generation API — real multi-agent pipeline with WebSocket streaming
"""
import json
from typing import Optional, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.config import settings
from app.agents.multi_agent_pipeline import MultiAgentPipeline
from app.services.provider_service import ProviderService

router = APIRouter(prefix="/generate", tags=["generation"])


class AgentConfig(BaseModel):
    provider: str = "watsonx"
    model: str = ""
    apiKey: str = ""


class GenerateRequest(BaseModel):
    input_type: str
    content: str
    language: str = "python"
    api_key: Optional[str] = None
    provider: str = "watsonx"
    agent_configs: Optional[Dict[str, AgentConfig]] = None


@router.post("")
async def generate(req: GenerateRequest):
    """Synchronous generation endpoint"""
    provider_service = _build_provider_service(req)
    pipeline = MultiAgentPipeline(provider_service=provider_service)
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

        provider_service = _build_provider_service(data)
        pipeline = MultiAgentPipeline(provider_service=provider_service)
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
        ]
    }


def _build_provider_service(req: GenerateRequest) -> Optional[ProviderService]:
    """Build a provider service from the request, or return None for mock generation"""
    api_key = req.api_key
    provider = req.provider

    if not api_key:
        # Try to get from settings
        if provider == "watsonx" and settings.watsonx_api_key:
            api_key = settings.watsonx_api_key
        elif provider == "openai" and settings.openai_api_key:
            api_key = settings.openai_api_key
        elif provider == "anthropic" and settings.anthropic_api_key:
            api_key = settings.anthropic_api_key
        elif provider == "google" and settings.google_api_key:
            api_key = settings.google_api_key

    if not api_key:
        return None

    try:
        kwargs: dict = {}
        if provider == "watsonx":
            if settings.watsonx_project_id:
                kwargs["project_id"] = settings.watsonx_project_id
            kwargs["base_url"] = settings.watsonx_url
        return ProviderService(provider=provider, api_key=api_key, **kwargs)
    except Exception:
        return None
