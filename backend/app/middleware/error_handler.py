"""
Error Handler Middleware
Global error handling with structured logging
"""

from typing import Callable, Union
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError
import traceback

from app.core.logging import get_logger
from app.config import settings


logger = get_logger(__name__)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware for global error handling and logging
    
    Catches all exceptions, logs them with structured logging,
    and returns appropriate JSON error responses.
    """
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        Process request and handle any errors
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler in chain
            
        Returns:
            HTTP response
        """
        try:
            response = await call_next(request)
            return response
            
        except Exception as exc:
            return await self._handle_exception(request, exc)
    
    async def _handle_exception(
        self,
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """
        Handle exception and return appropriate response
        
        Args:
            request: HTTP request
            exc: Exception that occurred
            
        Returns:
            JSON error response
        """
        # Get request details for logging
        request_details = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "client": request.client.host if request.client else "unknown",
        }
        
        # Add user info if available
        if hasattr(request.state, "user_id"):
            request_details["user_id"] = request.state.user_id
        
        # Handle different exception types
        if isinstance(exc, StarletteHTTPException):
            return await self._handle_http_exception(exc, request_details)
        
        elif isinstance(exc, RequestValidationError):
            return await self._handle_validation_error(exc, request_details)
        
        elif isinstance(exc, ValidationError):
            return await self._handle_pydantic_validation_error(exc, request_details)
        
        else:
            return await self._handle_generic_exception(exc, request_details)
    
    async def _handle_http_exception(
        self,
        exc: StarletteHTTPException,
        request_details: dict
    ) -> JSONResponse:
        """
        Handle HTTP exceptions (4xx, 5xx)
        
        Args:
            exc: HTTP exception
            request_details: Request information
            
        Returns:
            JSON error response
        """
        # Log based on status code
        if exc.status_code >= 500:
            logger.error(
                "HTTP server error",
                status_code=exc.status_code,
                detail=exc.detail,
                **request_details
            )
        elif exc.status_code >= 400:
            logger.warning(
                "HTTP client error",
                status_code=exc.status_code,
                detail=exc.detail,
                **request_details
            )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "http_error",
                    "message": exc.detail,
                    "status_code": exc.status_code,
                }
            }
        )
    
    async def _handle_validation_error(
        self,
        exc: RequestValidationError,
        request_details: dict
    ) -> JSONResponse:
        """
        Handle request validation errors (FastAPI)
        
        Args:
            exc: Validation error
            request_details: Request information
            
        Returns:
            JSON error response
        """
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })
        
        logger.warning(
            "Request validation error",
            errors=errors,
            **request_details
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "type": "validation_error",
                    "message": "Request validation failed",
                    "details": errors,
                }
            }
        )
    
    async def _handle_pydantic_validation_error(
        self,
        exc: ValidationError,
        request_details: dict
    ) -> JSONResponse:
        """
        Handle Pydantic validation errors
        
        Args:
            exc: Validation error
            request_details: Request information
            
        Returns:
            JSON error response
        """
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })
        
        logger.warning(
            "Data validation error",
            errors=errors,
            **request_details
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "type": "validation_error",
                    "message": "Data validation failed",
                    "details": errors,
                }
            }
        )
    
    async def _handle_generic_exception(
        self,
        exc: Exception,
        request_details: dict
    ) -> JSONResponse:
        """
        Handle unexpected exceptions
        
        Args:
            exc: Exception
            request_details: Request information
            
        Returns:
            JSON error response
        """
        # Get exception details
        exc_type = type(exc).__name__
        exc_message = str(exc)
        
        # Get traceback in development mode
        exc_traceback = None
        if settings.is_development:
            exc_traceback = traceback.format_exc()
        
        # Log error with full details
        logger.error(
            "Unhandled exception",
            exception_type=exc_type,
            exception_message=exc_message,
            traceback=exc_traceback,
            **request_details
        )
        
        # Prepare response content
        error_content = {
            "error": {
                "type": "internal_error",
                "message": "An internal server error occurred",
            }
        }
        
        # Include details in development mode
        if settings.is_development:
            error_content["error"]["details"] = {
                "exception_type": exc_type,
                "exception_message": exc_message,
                "traceback": exc_traceback,
            }
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_content
        )


class AppException(Exception):
    """
    Base exception class for application-specific errors
    
    Attributes:
        message: Error message
        status_code: HTTP status code
        error_code: Application-specific error code
        details: Additional error details
    """
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "APP_ERROR",
        details: dict = None
    ):
        """
        Initialize application exception
        
        Args:
            message: Error message
            status_code: HTTP status code
            error_code: Application-specific error code
            details: Additional error details
        """
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class DatabaseError(AppException):
    """Database operation error"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="DATABASE_ERROR",
            details=details
        )


class AuthenticationError(AppException):
    """Authentication error"""
    
    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR",
            details=details
        )


class AuthorizationError(AppException):
    """Authorization error"""
    
    def __init__(self, message: str = "Access denied", details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTHORIZATION_ERROR",
            details=details
        )


class NotFoundError(AppException):
    """Resource not found error"""
    
    def __init__(self, message: str = "Resource not found", details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details=details
        )


class ValidationError(AppException):
    """Data validation error"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details
        )


class RateLimitError(AppException):
    """Rate limit exceeded error"""
    
    def __init__(self, message: str = "Rate limit exceeded", details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_ERROR",
            details=details
        )


class ExternalServiceError(AppException):
    """External service error"""
    
    def __init__(self, message: str, service: str, details: dict = None):
        details = details or {}
        details["service"] = service
        super().__init__(
            message=message,
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            details=details
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """
    Handler for application-specific exceptions
    
    Args:
        request: HTTP request
        exc: Application exception
        
    Returns:
        JSON error response
    """
    logger.error(
        "Application error",
        error_code=exc.error_code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
        path=request.url.path,
        method=request.method
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "type": exc.error_code.lower(),
                "message": exc.message,
                "details": exc.details if exc.details else None,
            }
        }
    )

# Made with Bob
