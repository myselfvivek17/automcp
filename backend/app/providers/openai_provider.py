import requests
from typing import Optional
from app.providers.base import BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = "https://api.openai.com/v1"

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.api_key:
            return ""
        model = kwargs.get("model_id", "gpt-4o-mini")
        try:
            resp = requests.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
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
