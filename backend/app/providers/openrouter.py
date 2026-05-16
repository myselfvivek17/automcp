import requests
from typing import Optional
from app.providers.base import BaseAIProvider


class OpenRouterProvider(BaseAIProvider):
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.api_key:
            return ""
        model = kwargs.get("model_id", "meta-llama/llama-3.3-70b-instruct:free")
        try:
            resp = requests.post(
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://automcp.dev",
                    "X-Title": "AutoMCP",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": kwargs.get("max_tokens", 2000),
                    "temperature": kwargs.get("temperature", 0.3),
                },
                timeout=90,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Error: {str(e)}"
