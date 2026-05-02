from typing import Optional
from app.providers.base import BaseAIProvider
from app.providers.watsonx import WatsonxProvider


class ProviderFactory:
    """Simple factory for creating AI providers"""
    
    @staticmethod
    def create_provider(provider_type: str, api_key: Optional[str] = None, **kwargs) -> Optional[BaseAIProvider]:
        """Create provider instance"""
        if provider_type.lower() == "watsonx":
            return WatsonxProvider(api_key=api_key, **kwargs)
        return None

# Made with Bob
