import time
import requests
from typing import Optional, Any
from app.providers.base import BaseAIProvider


class WatsonxProvider(BaseAIProvider):
    """IBM Watsonx.ai provider using Chat API (REST) with IAM token auth."""

    IAM_URL = "https://iam.cloud.ibm.com/identity/token"
    CHAT_API_VERSION = "2024-05-31"

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = kwargs.get("base_url", "https://us-south.ml.cloud.ibm.com")
        self.project_id = kwargs.get("project_id")
        self._iam_token: Optional[str] = None
        self._iam_expiry: float = 0.0

    def _get_iam_token(self) -> str:
        """Exchange API key for IAM bearer token, cached until near expiry."""
        if self._iam_token and time.time() < self._iam_expiry:
            return self._iam_token
        resp = requests.post(
            self.IAM_URL,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": self.api_key,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        self._iam_token = data["access_token"]
        self._iam_expiry = time.time() + data.get("expires_in", 3600) - 60
        return self._iam_token

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.api_key:
            return ""
        try:
            token = self._get_iam_token()
            model_id = kwargs.get("model_id", "ibm/granite-13b-chat-v2")

            # Try Chat API first (newer endpoint)
            result = self._try_chat(token, model_id, prompt, **kwargs)
            if result:
                return result

            # Fall back to Text Generation API
            return self._try_text_generation(token, model_id, prompt, **kwargs)
        except Exception as e:
            return f"Error: {str(e)}"

    def _try_chat(self, token: str, model_id: str, prompt: str, **kwargs) -> Optional[str]:
        """Try /ml/v1/text/chat endpoint."""
        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert API developer and MCP server code generator. Return exactly what is requested with no extra explanation.",
                },
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                },
            ]
            resp = requests.post(
                f"{self.base_url}/ml/v1/text/chat?version={self.CHAT_API_VERSION}",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_id": model_id,
                    "project_id": self.project_id,
                    "messages": messages,
                    "max_tokens": kwargs.get("max_tokens", 2000),
                },
                timeout=90,
            )
            if resp.status_code == 404:
                return None  # endpoint not available, fall through
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except requests.HTTPError:
            return None
        except Exception:
            return None

    def _try_text_generation(self, token: str, model_id: str, prompt: str, **kwargs) -> str:
        """Fall back to /ml/v1/text/generation endpoint."""
        system = "You are an expert API developer and MCP server code generator. Return exactly what is requested with no extra explanation.\n\n"
        full_prompt = system + prompt
        resp = requests.post(
            f"{self.base_url}/ml/v1/text/generation?version=2023-05-29",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "input": full_prompt,
                "model_id": model_id,
                "project_id": self.project_id,
                "parameters": {
                    "max_new_tokens": kwargs.get("max_tokens", 2000),
                    "temperature": kwargs.get("temperature", 0.3),
                },
            },
            timeout=90,
        )
        resp.raise_for_status()
        return resp.json().get("results", [{}])[0].get("generated_text", "")
