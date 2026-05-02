import requests
from typing import Optional
from app.providers.base import BaseAIProvider


class AnthropicProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.api_key:
            return ""
        model = kwargs.get("model_id", "claude-haiku-4-5-20251001")
        try:
            resp = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": kwargs.get("max_tokens", 2000),
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=90,
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
        except Exception as e:
            return f"Error: {str(e)}"
