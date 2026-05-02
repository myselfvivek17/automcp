"""AutoMCP FastAPI Application"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from app.config import settings
from app.core.logging import setup_logging
from app.api.simple.generation import router as generate_router

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AutoMCP", version="1.0.0")
    yield
    logger.info("Shutting down AutoMCP")


app = FastAPI(
    title="AutoMCP",
    description="Automatic MCP Server Generator — generate production-ready MCP servers from API specs",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.time() - start)
    return response


app.include_router(generate_router, prefix="/api/simple")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"name": "AutoMCP", "version": "1.0.0", "docs": "/docs"}


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"error": "Not Found", "path": request.url.path})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
