"""
Structured Logging Configuration
Uses structlog for structured, JSON-formatted logging
"""

import logging
import sys
from typing import Any, Dict

import structlog
from structlog.types import EventDict, Processor

from app.config import settings


def add_app_context(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """Add application context to log entries"""
    event_dict["app"] = settings.app_name
    event_dict["version"] = settings.app_version
    event_dict["environment"] = settings.environment
    return event_dict


def setup_logging() -> structlog.BoundLogger:
    """
    Configure structured logging for the application
    
    Returns:
        Configured structlog logger instance
    """
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )
    
    # Define processors based on log format
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        add_app_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    
    if settings.log_format == "json":
        # JSON output for production
        processors.append(structlog.processors.JSONRenderer())
    else:
        # Console-friendly output for development
        processors.extend([
            structlog.dev.ConsoleRenderer(colors=True),
        ])
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Return configured logger
    return structlog.get_logger()


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    """
    Get a logger instance with optional name
    
    Args:
        name: Optional logger name
        
    Returns:
        Configured logger instance
    """
    if name:
        return structlog.get_logger(name)
    return structlog.get_logger()

# Made with Bob
