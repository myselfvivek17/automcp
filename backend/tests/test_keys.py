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
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
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
