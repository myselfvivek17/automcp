from typing import Optional
from app.providers.factory import ProviderFactory
from app.providers.base import BaseAIProvider
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProviderService:
    """Thin wrapper that creates an AI provider from explicit credentials"""

    def __init__(self, provider: str = "watsonx", api_key: Optional[str] = None, **kwargs):
        self._provider_type = provider
        self._api_key = api_key
        self._kwargs = kwargs

    def get_provider(self) -> Optional[BaseAIProvider]:
        if not self._api_key:
            return None
        return ProviderFactory.create_provider(self._provider_type, api_key=self._api_key, **self._kwargs)
