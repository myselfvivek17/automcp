"""Provider key management — write API keys to backend .env, never return them."""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
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

    @field_validator("key")
    @classmethod
    def key_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("key must not be empty")
        return v


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
