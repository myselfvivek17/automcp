"""
Base Agent Class
Simple base class for all agents
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import structlog

logger = structlog.get_logger(__name__)


class BaseAgent(ABC):
    """
    Base class for all agents in the system
    Provides common interface and functionality
    """
    
    def __init__(self, name: str = "BaseAgent"):
        """
        Initialize the base agent
        
        Args:
            name: Name of the agent for logging
        """
        self.name = name
        self.logger = logger.bind(agent=name)
    
    @abstractmethod
    async def execute(self, input_data: Any) -> Any:
        """
        Execute the agent's main task
        
        Args:
            input_data: Input data for the agent
            
        Returns:
            Result of the agent's execution
        """
        pass
    
    def log_info(self, message: str, **kwargs):
        """Log info message"""
        self.logger.info(message, **kwargs)
    
    def log_error(self, message: str, **kwargs):
        """Log error message"""
        self.logger.error(message, **kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning message"""
        self.logger.warning(message, **kwargs)


# Made with Bob