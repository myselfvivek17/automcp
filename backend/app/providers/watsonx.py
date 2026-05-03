import time
import requests
from typing import Optional
from app.providers.base import BaseAIProvider


class WatsonxProvider(BaseAIProvider):
    """IBM Watsonx.ai — textChat (/ml/v1/text/chat) with IAM token auth, text/generation fallback."""

    IAM_URL = "https://iam.cloud.ibm.com/identity/token"
    CHAT_VERSION = "2024-05-31"
    GEN_VERSION = "2023-05-29"

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = kwargs.get("base_url", "https://us-south.ml.cloud.ibm.com")
        self.project_id = kwargs.get("project_id")
        self._iam_token: Optional[str] = None
        self._iam_expiry: float = 0.0

    def _get_iam_token(self) -> str:
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
            model_id = kwargs.pop("model_id", "ibm/granite-4-h-small")

            result = self._try_text_chat(token, model_id, prompt, **kwargs)
            if result:
                return result

            return self._try_text_generation(token, model_id, prompt, **kwargs)
        except Exception as e:
            return f"Error: {str(e)}"

    def _try_text_chat(self, token: str, model_id: str, prompt: str, **kwargs) -> Optional[str]:
        """POST /ml/v1/text/chat — matches SDK textChat() signature."""
        try:
            resp = requests.post(
                f"{self.base_url}/ml/v1/text/chat?version={self.CHAT_VERSION}",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "model_id": model_id,
                    "project_id": self.project_id,
                    "max_tokens": kwargs.get("max_tokens", 2000),
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert API developer and MCP server code generator. Return exactly what is requested with no extra explanation.",
                        },
                        {
                            "role": "user",
                            "content": [{"type": "text", "text": prompt}],
                        },
                    ],
                },
                timeout=90,
            )
            if resp.status_code in (404, 422):
                print(f"[watsonx] textChat {resp.status_code} — falling back to text/generation")
                return None
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except requests.HTTPError as e:
            print(f"[watsonx] textChat HTTP error: {e.response.status_code} {e.response.text[:200]}")
            return None
        except Exception as e:
            print(f"[watsonx] textChat error: {e}")
            return None

    def _try_text_generation(self, token: str, model_id: str, prompt: str, **kwargs) -> str:
        """POST /ml/v1/text/generation — fallback."""
        system = "You are an expert API developer and MCP server code generator. Return exactly what is requested with no extra explanation.\n\n"
        resp = requests.post(
            f"{self.base_url}/ml/v1/text/generation?version={self.GEN_VERSION}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "input": system + prompt,
                "model_id": model_id,
                "project_id": self.project_id,
                "parameters": {
                    "max_new_tokens": kwargs.get("max_tokens", 2000),
                },
            },
            timeout=90,
        )
        resp.raise_for_status()
        return resp.json().get("results", [{}])[0].get("generated_text", "")
