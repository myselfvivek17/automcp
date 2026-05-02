from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseAIProvider(ABC):
    """Base class for AI providers"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        self.api_key = api_key
        self.config = kwargs
    
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from prompt"""
        pass

# Made with Bob
