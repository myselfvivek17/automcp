"""Structured logging configuration"""
import logging
import sys
import structlog
from app.config import settings


def setup_logging() -> structlog.BoundLogger:
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=False),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    return structlog.get_logger()


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    if name:
        return structlog.get_logger(name)
    return structlog.get_logger()
