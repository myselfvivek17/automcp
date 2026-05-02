from typing import Optional
from app.providers.base import BaseAIProvider


class WatsonxProvider(BaseAIProvider):
    """IBM Watsonx.ai provider using the official ibm-watsonx-ai SDK with Chat API."""

    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)
        self.base_url = kwargs.get("base_url", "https://us-south.ml.cloud.ibm.com")
        self.project_id = kwargs.get("project_id")

    def _get_client(self):
        from ibm_watsonx_ai import APIClient, Credentials
        credentials = Credentials(url=self.base_url, api_key=self.api_key)
        return APIClient(credentials=credentials, project_id=self.project_id)

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.api_key:
            return ""
        try:
            from ibm_watsonx_ai.foundation_models import ModelInference

            client = self._get_client()
            model_id = kwargs.get("model_id", "meta-llama/llama-3-8b-instruct")

            model = ModelInference(
                model_id=model_id,
                api_client=client,
                project_id=self.project_id,
            )

            messages = [
                {
                    "role": "system",
                    "content": "You are an expert API developer and MCP server code generator. Be precise and return exactly what is requested.",
                },
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                },
            ]

            response = model.chat(
                messages=messages,
                params={"max_tokens": kwargs.get("max_tokens", 2000)},
            )
            return response["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Error: {str(e)}"
