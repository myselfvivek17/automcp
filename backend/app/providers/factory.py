from typing import Optional
from app.providers.base import BaseAIProvider
from app.providers.watsonx import WatsonxProvider
from app.providers.openai_provider import OpenAIProvider
from app.providers.anthropic_provider import AnthropicProvider


class ProviderFactory:
    @staticmethod
    def create_provider(provider_type: str, api_key: Optional[str] = None, **kwargs) -> Optional[BaseAIProvider]:
        p = provider_type.lower()
        if p == "watsonx":
            return WatsonxProvider(api_key=api_key, **kwargs)
        if p == "openai":
            return OpenAIProvider(api_key=api_key, **kwargs)
        if p == "anthropic":
            return AnthropicProvider(api_key=api_key, **kwargs)
        return None
