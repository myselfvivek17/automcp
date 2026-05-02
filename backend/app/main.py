"""
AutoMCP FastAPI Application
Main entry point for the backend API
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import structlog
import time

from app.config import settings
from app.core.logging import setup_logging
from app.core.database import init_database, close_database
from app.core.redis_client import init_redis, close_redis
from app.api.v1 import api_router
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.error_handler import error_handler_middleware


# Setup structured logging
logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting AutoMCP application", version=settings.app_version)
    
    try:
        # Initialize database connection
        try:
            await init_database()
            logger.info("Database initialized")
        except Exception as e:
            logger.warning("Database unavailable, running without it", error=str(e))

        # Initialize Redis connection
        try:
            await init_redis()
            logger.info("Redis initialized")
        except Exception as e:
            logger.warning("Redis unavailable, running without it", error=str(e))

        logger.info("Application startup complete")

        yield
        
    finally:
        # Shutdown
        logger.info("Shutting down AutoMCP application")
        
        # Close database connection
        await close_database()
        logger.info("Database connection closed")
        
        # Close Redis connection
        await close_redis()
        logger.info("Redis connection closed")
        
        logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Automatic MCP Server Generator - Generate production-ready MCP servers from API specifications",
    version=settings.app_version,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=settings.cors_max_age,
)


# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)


# Add error handler middleware
app.middleware("http")(error_handler_middleware)


# Add request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to responses"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Include API router
app.include_router(api_router, prefix="/api/v1")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Automatic MCP Server Generator API",
        "docs": "/docs" if settings.is_development else None,
        "health": "/health",
    }


# Exception handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": f"The requested resource {request.url.path} was not found",
            "path": request.url.path,
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 errors"""
    logger.error(
        "Internal server error",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.is_development,
        log_level=settings.log_level.lower(),
    )

# Made with Bob
