# AutoMCP - Detailed Implementation Guide

This guide provides step-by-step instructions for implementing each phase of the AutoMCP project, including code examples, configuration details, and best practices.

## Phase 1: Foundation Setup

### 1.1 Initialize Project Structure

```bash
# Create project root
mkdir automcp
cd automcp

# Initialize backend
mkdir -p backend/app/{agents,api,services,models,utils}
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn pydantic python-dotenv websockets

# Initialize frontend
cd ..
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @monaco-editor/react react-flow-renderer socket.io-client
```

### 1.2 Backend Configuration

**File: `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AutoMCP"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # Database
    CLOUDANT_URL: Optional[str] = None
    CLOUDANT_API_KEY: Optional[str] = None
    CLOUDANT_DATABASE: str = "automcp"
    
    # Redis
    REDIS_URL: Optional[str] = "redis://localhost:6379"
    
    # AI Providers
    WATSONX_API_KEY: Optional[str] = None
    WATSONX_PROJECT_ID: Optional[str] = None
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    
    # Security
    ENCRYPTION_KEY: str = os.urandom(32).hex()
    SECRET_KEY: str = os.urandom(32).hex()
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 1.3 FastAPI Application Setup

**File: `backend/app/main.py`**

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from app.config import settings
from app.api.routes import projects, generate, templates, health
from app.api.websocket import generation_stream
from app.utils.logger import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Initialize services
    # await init_database()
    # await init_cache()
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    # await cleanup_resources()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
app.include_router(generate.router, prefix="/api/v1/generate", tags=["generate"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["templates"])

# WebSocket endpoint
@app.websocket("/ws/generate/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await generation_stream.handle_connection(websocket, session_id)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=settings.WORKERS if not settings.DEBUG else 1
    )
```

### 1.4 Logging Utility

**File: `backend/app/utils/logger.py`**

```python
import logging
import sys
from pythonjsonlogger import jsonlogger
from app.config import settings

def setup_logging():
    """Configure application logging"""
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    # Remove existing handlers
    logger.handlers = []
    
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    
    if settings.LOG_FORMAT == "json":
        # JSON formatter for production
        formatter = jsonlogger.JsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s',
            rename_fields={'timestamp': '@timestamp', 'level': 'severity'}
        )
    else:
        # Standard formatter for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger
```

### 1.5 Health Check Endpoint

**File: `backend/app/api/routes/health.py`**

```python
from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime
from app.config import settings

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    environment: str

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        timestamp=datetime.utcnow(),
        environment=settings.ENVIRONMENT
    )

@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes/Code Engine"""
    # Check database connection
    # Check Redis connection
    # Check provider availability
    
    return {"status": "ready"}

@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes/Code Engine"""
    return {"status": "alive"}
```

### 1.6 Frontend Setup

**File: `frontend/src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AutoMCP - Automatic MCP Server Generator',
  description: 'Generate production-ready MCP servers from API specifications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}
```

**File: `frontend/src/app/page.tsx`**

```typescript
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold text-center mb-8">
          Auto<span className="text-blue-600">MCP</span>
        </h1>
        
        <p className="text-xl text-center text-gray-600 mb-12">
          Automatically generate production-ready MCP servers from API specifications
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/generate" className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">Generate Server →</h2>
            <p className="text-gray-600">
              Create a new MCP server from OpenAPI, documentation, or natural language
            </p>
          </Link>
          
          <Link href="/projects" className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">My Projects →</h2>
            <p className="text-gray-600">
              View and manage your generated MCP servers
            </p>
          </Link>
          
          <Link href="/templates" className="p-6 border rounded-lg hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold mb-2">Templates →</h2>
            <p className="text-gray-600">
              Browse pre-built templates for popular APIs
            </p>
          </Link>
          
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-2">Documentation</h2>
            <p className="text-gray-600">
              Learn how to use AutoMCP and integrate generated servers
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### 1.7 Docker Setup

**File: `backend/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**File: `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - DEBUG=true
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend/app:/app/app
    depends_on:
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8000
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Phase 2: Provider Abstraction Layer

### 2.1 Base Provider Interface

**File: `backend/app/services/providers/base.py`**

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator, Union, Dict, Any, Optional
from pydantic import BaseModel

class ProviderConfig(BaseModel):
    """Configuration for AI provider"""
    api_key: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 60

class ProviderResponse(BaseModel):
    """Standardized response from provider"""
    content: str
    model: str
    tokens_used: int
    finish_reason: str
    metadata: Dict[str, Any] = {}

class AIProvider(ABC):
    """Base class for AI providers"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[ProviderResponse, AsyncIterator[str]]:
        """Generate completion from prompt"""
        pass
    
    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is available"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model"""
        pass
```

### 2.2 IBM watsonx.ai Provider

**File: `backend/app/services/providers/watsonx.py`**

```python
from typing import AsyncIterator, Union, Optional, Dict, Any
import httpx
from app.services.providers.base import AIProvider, ProviderConfig, ProviderResponse
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class WatsonxProvider(AIProvider):
    """IBM watsonx.ai provider implementation"""
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.base_url = settings.WATSONX_URL
        self.project_id = settings.WATSONX_PROJECT_ID
        self.client = httpx.AsyncClient(timeout=config.timeout)
    
    async def _get_token(self) -> str:
        """Get IAM token for authentication"""
        url = "https://iam.cloud.ibm.com/identity/token"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": self.config.api_key
        }
        
        response = await self.client.post(url, headers=headers, data=data)
        response.raise_for_status()
        return response.json()["access_token"]
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[ProviderResponse, AsyncIterator[str]]:
        """Generate completion using watsonx.ai"""
        
        token = await self._get_token()
        
        # Combine system and user prompts
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"
        
        url = f"{self.base_url}/ml/v1/text/generation?version=2023-05-29"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        payload = {
            "model_id": self.config.model,
            "input": full_prompt,
            "parameters": {
                "temperature": self.config.temperature,
                "max_new_tokens": self.config.max_tokens,
                "decoding_method": "greedy",
                **kwargs
            },
            "project_id": self.project_id
        }
        
        if stream:
            return self._stream_generate(url, headers, payload)
        else:
            response = await self.client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            return ProviderResponse(
                content=data["results"][0]["generated_text"],
                model=self.config.model,
                tokens_used=data["results"][0]["generated_token_count"],
                finish_reason=data["results"][0]["stop_reason"],
                metadata={"input_tokens": data["results"][0]["input_token_count"]}
            )
    
    async def _stream_generate(
        self,
        url: str,
        headers: Dict[str, str],
        payload: Dict[str, Any]
    ) -> AsyncIterator[str]:
        """Stream generation responses"""
        async with self.client.stream("POST", url, headers=headers, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]  # Remove "data: " prefix
                    if data and data != "[DONE]":
                        import json
                        chunk = json.loads(data)
                        if "results" in chunk:
                            yield chunk["results"][0]["generated_text"]
    
    async def count_tokens(self, text: str) -> int:
        """Estimate token count (approximate)"""
        # Rough estimation: 1 token ≈ 4 characters
        return len(text) // 4
    
    async def health_check(self) -> bool:
        """Check if watsonx.ai is available"""
        try:
            token = await self._get_token()
            return bool(token)
        except Exception as e:
            logger.error(f"watsonx.ai health check failed: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "provider": "watsonx.ai",
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "supports_streaming": True
        }
```

### 2.3 OpenAI Provider

**File: `backend/app/services/providers/openai.py`**

```python
from typing import AsyncIterator, Union, Optional, Dict, Any
import openai
from app.services.providers.base import AIProvider, ProviderConfig, ProviderResponse
import logging

logger = logging.getLogger(__name__)

class OpenAIProvider(AIProvider):
    """OpenAI provider implementation"""
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.client = openai.AsyncOpenAI(api_key=config.api_key)
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[ProviderResponse, AsyncIterator[str]]:
        """Generate completion using OpenAI"""
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        if stream:
            return self._stream_generate(messages, **kwargs)
        else:
            response = await self.client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                **kwargs
            )
            
            return ProviderResponse(
                content=response.choices[0].message.content,
                model=response.model,
                tokens_used=response.usage.total_tokens,
                finish_reason=response.choices[0].finish_reason,
                metadata={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens
                }
            )
    
    async def _stream_generate(
        self,
        messages: list,
        **kwargs
    ) -> AsyncIterator[str]:
        """Stream generation responses"""
        stream = await self.client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            temperature=self.config.temperature,
            max_tokens=self.config.max_tokens,
            stream=True,
            **kwargs
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def count_tokens(self, text: str) -> int:
        """Count tokens using tiktoken"""
        import tiktoken
        encoding = tiktoken.encoding_for_model(self.config.model)
        return len(encoding.encode(text))
    
    async def health_check(self) -> bool:
        """Check if OpenAI is available"""
        try:
            await self.client.models.retrieve(self.config.model)
            return True
        except Exception as e:
            logger.error(f"OpenAI health check failed: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "provider": "openai",
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "supports_streaming": True
        }
```

### 2.4 Provider Factory

**File: `backend/app/services/providers/__init__.py`**

```python
from typing import Dict, Type
from app.services.providers.base import AIProvider, ProviderConfig
from app.services.providers.watsonx import WatsonxProvider
from app.services.providers.openai import OpenAIProvider
# from app.services.providers.anthropic import AnthropicProvider
# from app.services.providers.gemini import GeminiProvider

PROVIDER_REGISTRY: Dict[str, Type[AIProvider]] = {
    "watsonx": WatsonxProvider,
    "openai": OpenAIProvider,
    # "anthropic": AnthropicProvider,
    # "gemini": GeminiProvider,
}

def create_provider(provider_name: str, config: ProviderConfig) -> AIProvider:
    """Factory function to create provider instances"""
    provider_class = PROVIDER_REGISTRY.get(provider_name.lower())
    if not provider_class:
        raise ValueError(f"Unknown provider: {provider_name}")
    
    return provider_class(config)

def list_providers() -> list[str]:
    """List available providers"""
    return list(PROVIDER_REGISTRY.keys())
```

## Phase 3: Input Processors

### 3.1 OpenAPI Parser

**File: `backend/app/services/input_processors/openapi_parser.py`**

```python
from typing import Dict, Any, Optional
import yaml
import json
from pydantic import BaseModel, HttpUrl
import httpx
from openapi_spec_validator import validate_spec
from openapi_spec_validator.readers import read_from_filename
import logging

logger = logging.getLogger(__name__)

class OpenAPISpec(BaseModel):
    """Parsed OpenAPI specification"""
    openapi_version: str
    info: Dict[str, Any]
    servers: list[Dict[str, Any]]
    paths: Dict[str, Any]
    components: Optional[Dict[str, Any]] = None
    security: Optional[list[Dict[str, Any]]] = None
    tags: Optional[list[Dict[str, Any]]] = None

class OpenAPIParser:
    """Parser for OpenAPI/Swagger specifications"""
    
    async def parse_from_url(self, url: str) -> OpenAPISpec:
        """Parse OpenAPI spec from URL"""
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            
            content_type = response.headers.get("content-type", "")
            
            if "json" in content_type:
                spec_dict = response.json()
            elif "yaml" in content_type or "yml" in content_type:
                spec_dict = yaml.safe_load(response.text)
            else:
                # Try to parse as JSON first, then YAML
                try:
                    spec_dict = json.loads(response.text)
                except json.JSONDecodeError:
                    spec_dict = yaml.safe_load(response.text)
        
        return await self._parse_spec(spec_dict)
    
    async def parse_from_file(self, file_path: str) -> OpenAPISpec:
        """Parse OpenAPI spec from file"""
        spec_dict, _ = read_from_filename(file_path)
        return await self._parse_spec(spec_dict)
    
    async def parse_from_content(self, content: str, format: str = "json") -> OpenAPISpec:
        """Parse OpenAPI spec from string content"""
        if format == "json":
            spec_dict = json.loads(content)
        else:
            spec_dict = yaml.safe_load(content)
        
        return await self._parse_spec(spec_dict)
    
    async def _parse_spec(self, spec_dict: Dict[str, Any]) -> OpenAPISpec:
        """Parse and validate OpenAPI specification"""
        
        # Validate spec
        try:
            validate_spec(spec_dict)
        except Exception as e:
            logger.warning(f"OpenAPI validation warning: {e}")
        
        # Extract version
        openapi_version = spec_dict.get("openapi") or spec_dict.get("swagger", "2.0")
        
        # Convert Swagger 2.0 to OpenAPI 3.0 if needed
        if openapi_version.startswith("2."):
            spec_dict = self._convert_swagger_to_openapi(spec_dict)
            openapi_version = "3.0.0"
        
        return OpenAPISpec(
            openapi_version=openapi_version,
            info=spec_dict.get("info", {}),
            servers=spec_dict.get("servers", []),
            paths=spec_dict.get("paths", {}),
            components=spec_dict.get("components"),
            security=spec_dict.get("security"),
            tags=spec_dict.get("tags")
        )
    
    def _convert_swagger_to_openapi(self, swagger_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Swagger 2.0 to OpenAPI 3.0"""
        openapi_spec = {
            "openapi": "3.0.0",
            "info": swagger_spec.get("info", {}),
            "servers": [],
            "paths": swagger_spec.get("paths", {}),
            "components": {
                "schemas": swagger_spec.get("definitions", {}),
                "securitySchemes": {}
            }
        }
        
        # Convert host and basePath to servers
        host = swagger_spec.get("host", "")
        base_path = swagger_spec.get("basePath", "")
        schemes = swagger_spec.get("schemes", ["https"])
        
        for scheme in schemes:
            openapi_spec["servers"].append({
                "url": f"{scheme}://{host}{base_path}"
            })
        
        # Convert security definitions
        security_defs = swagger_spec.get("securityDefinitions", {})
        for name, definition in security_defs.items():
            openapi_spec["components"]["securitySchemes"][name] = self._convert_security_scheme(definition)
        
        return openapi_spec
    
    def _convert_security_scheme(self, swagger_scheme: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Swagger security scheme to OpenAPI"""
        scheme_type = swagger_scheme.get("type")
        
        if scheme_type == "apiKey":
            return {
                "type": "apiKey",
                "in": swagger_scheme.get("in"),
                "name": swagger_scheme.get("name")
            }
        elif scheme_type == "oauth2":
            return {
                "type": "oauth2",
                "flows": {
                    swagger_scheme.get("flow", "implicit"): {
                        "authorizationUrl": swagger_scheme.get("authorizationUrl"),
                        "tokenUrl": swagger_scheme.get("tokenUrl"),
                        "scopes": swagger_scheme.get("scopes", {})
                    }
                }
            }
        elif scheme_type == "basic":
            return {
                "type": "http",
                "scheme": "basic"
            }
        
        return swagger_scheme
```

This implementation guide provides detailed code examples for the first three phases. Would you like me to continue with the remaining phases, or would you prefer to review this plan first?