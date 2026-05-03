# Agent Implementation Example

This document provides a complete example of implementing an agent in the AutoMCP multi-agent pipeline, including base classes, concrete implementations, and integration patterns.

## Base Agent Architecture

### Base Agent Class

**File: `backend/app/agents/base.py`**

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, AsyncIterator
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import logging
import time

logger = logging.getLogger(__name__)

class AgentStatus(str, Enum):
    """Agent execution status"""
    PENDING = "pending"
    STARTED = "started"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class AgentMessage(BaseModel):
    """Message sent by agent during execution"""
    agent_id: str
    agent_name: str
    status: AgentStatus
    progress: float = Field(ge=0.0, le=1.0)
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    execution_time: Optional[float] = None
    error: Optional[str] = None

class AgentContext(BaseModel):
    """Context passed between agents"""
    session_id: str
    input_data: Dict[str, Any]
    normalized_spec: Optional[Dict[str, Any]] = None
    extracted_schema: Optional[Dict[str, Any]] = None
    endpoint_mappings: Optional[Dict[str, Any]] = None
    auth_config: Optional[Dict[str, Any]] = None
    mcp_schema: Optional[Dict[str, Any]] = None
    generated_code: Optional[Dict[str, str]] = None
    optimized_code: Optional[Dict[str, str]] = None
    validation_results: Optional[Dict[str, Any]] = None
    documentation: Optional[Dict[str, str]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class BaseAgent(ABC):
    """Base class for all agents in the pipeline"""
    
    def __init__(
        self,
        agent_id: str,
        agent_name: str,
        description: str,
        provider: Optional[Any] = None
    ):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.description = description
        self.provider = provider
        self.logger = logging.getLogger(f"agent.{agent_id}")
    
    async def execute(
        self,
        context: AgentContext,
        stream_callback: Optional[callable] = None
    ) -> AgentContext:
        """
        Execute the agent's task
        
        Args:
            context: Current pipeline context
            stream_callback: Optional callback for streaming updates
        
        Returns:
            Updated context with agent's output
        """
        start_time = time.time()
        
        try:
            # Send started message
            await self._send_message(
                AgentStatus.STARTED,
                f"Starting {self.agent_name}",
                0.0,
                stream_callback
            )
            
            # Validate prerequisites
            if not await self._validate_prerequisites(context):
                await self._send_message(
                    AgentStatus.SKIPPED,
                    f"Prerequisites not met, skipping {self.agent_name}",
                    1.0,
                    stream_callback
                )
                return context
            
            # Process the task
            updated_context = await self._process_with_progress(
                context,
                stream_callback
            )
            
            # Send completion message
            execution_time = time.time() - start_time
            await self._send_message(
                AgentStatus.COMPLETED,
                f"Completed {self.agent_name}",
                1.0,
                stream_callback,
                execution_time=execution_time
            )
            
            return updated_context
            
        except Exception as e:
            execution_time = time.time() - start_time
            self.logger.error(f"Agent {self.agent_id} failed: {e}", exc_info=True)
            
            await self._send_message(
                AgentStatus.FAILED,
                f"Failed: {str(e)}",
                0.0,
                stream_callback,
                execution_time=execution_time,
                error=str(e)
            )
            
            raise
    
    async def _process_with_progress(
        self,
        context: AgentContext,
        stream_callback: Optional[callable]
    ) -> AgentContext:
        """Process with progress updates"""
        
        # Send processing message
        await self._send_message(
            AgentStatus.PROCESSING,
            f"Processing {self.agent_name}",
            0.1,
            stream_callback
        )
        
        # Execute the actual processing
        async for progress, message, data in self.process(context):
            await self._send_message(
                AgentStatus.PROCESSING,
                message,
                progress,
                stream_callback,
                data=data
            )
        
        return context
    
    @abstractmethod
    async def process(
        self,
        context: AgentContext
    ) -> AsyncIterator[tuple[float, str, Optional[Dict[str, Any]]]]:
        """
        Process the agent's task with progress updates
        
        Yields:
            Tuple of (progress, message, data)
            - progress: float between 0.0 and 1.0
            - message: status message
            - data: optional data to include in update
        """
        pass
    
    async def _validate_prerequisites(self, context: AgentContext) -> bool:
        """Validate that prerequisites are met"""
        return True
    
    async def _send_message(
        self,
        status: AgentStatus,
        message: str,
        progress: float,
        callback: Optional[callable],
        data: Optional[Dict[str, Any]] = None,
        execution_time: Optional[float] = None,
        error: Optional[str] = None
    ):
        """Send message via callback"""
        if callback:
            msg = AgentMessage(
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                status=status,
                progress=progress,
                message=message,
                data=data,
                execution_time=execution_time,
                error=error
            )
            await callback(msg)
```

## Concrete Agent Implementation

### Input Normalizer Agent

**File: `backend/app/agents/input_normalizer.py`**

```python
from typing import AsyncIterator, Dict, Any, Optional
from app.agents.base import BaseAgent, AgentContext
from app.services.input_processors.openapi_parser import OpenAPIParser
from app.services.input_processors.doc_crawler import DocumentationCrawler
from app.services.input_processors.nl_processor import NaturalLanguageProcessor
import logging

logger = logging.getLogger(__name__)

class InputNormalizerAgent(BaseAgent):
    """
    Agent responsible for normalizing all input formats into a unified schema
    """
    
    def __init__(self, provider=None):
        super().__init__(
            agent_id="input_normalizer",
            agent_name="Input Normalizer",
            description="Standardizes all input formats into unified API specification",
            provider=provider
        )
        self.openapi_parser = OpenAPIParser()
        self.doc_crawler = DocumentationCrawler()
        self.nl_processor = NaturalLanguageProcessor(provider)
    
    async def _validate_prerequisites(self, context: AgentContext) -> bool:
        """Validate that input data exists"""
        return bool(context.input_data)
    
    async def process(
        self,
        context: AgentContext
    ) -> AsyncIterator[tuple[float, str, Optional[Dict[str, Any]]]]:
        """
        Normalize input data into unified format
        
        Yields progress updates during processing
        """
        input_data = context.input_data
        input_type = input_data.get("type")
        
        yield (0.2, f"Detected input type: {input_type}", {"input_type": input_type})
        
        try:
            if input_type == "openapi":
                normalized = await self._normalize_openapi(input_data)
                yield (0.6, "Parsed OpenAPI specification", {"endpoints": len(normalized.get("endpoints", []))})
                
            elif input_type == "documentation_url":
                normalized = await self._normalize_documentation(input_data)
                yield (0.6, "Crawled and parsed documentation", {"endpoints": len(normalized.get("endpoints", []))})
                
            elif input_type == "manual":
                normalized = await self._normalize_manual(input_data)
                yield (0.6, "Processed manual entries", {"endpoints": len(normalized.get("endpoints", []))})
                
            elif input_type == "natural_language":
                normalized = await self._normalize_natural_language(input_data)
                yield (0.6, "Inferred API structure from description", {"endpoints": len(normalized.get("endpoints", []))})
                
            else:
                raise ValueError(f"Unknown input type: {input_type}")
            
            # Store normalized spec in context
            context.normalized_spec = normalized
            
            yield (0.9, "Validating normalized specification", None)
            
            # Validate the normalized spec
            validation_result = await self._validate_normalized_spec(normalized)
            
            if not validation_result["valid"]:
                warnings = validation_result.get("warnings", [])
                yield (1.0, f"Validation completed with {len(warnings)} warnings", {"warnings": warnings})
            else:
                yield (1.0, "Normalization completed successfully", {"spec_summary": self._get_spec_summary(normalized)})
            
        except Exception as e:
            logger.error(f"Normalization failed: {e}", exc_info=True)
            raise
    
    async def _normalize_openapi(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize OpenAPI/Swagger specification"""
        source = input_data.get("source")
        
        if source.get("type") == "url":
            spec = await self.openapi_parser.parse_from_url(source["url"])
        elif source.get("type") == "file":
            spec = await self.openapi_parser.parse_from_file(source["path"])
        else:
            spec = await self.openapi_parser.parse_from_content(
                source["content"],
                source.get("format", "json")
            )
        
        return self._convert_to_normalized_format(spec)
    
    async def _normalize_documentation(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize documentation URL"""
        url = input_data.get("url")
        crawled_data = await self.doc_crawler.crawl(url)
        
        # Use AI to extract API structure from documentation
        extracted = await self.nl_processor.extract_api_from_docs(crawled_data)
        
        return extracted
    
    async def _normalize_manual(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize manual entries"""
        endpoints = input_data.get("endpoints", [])
        
        return {
            "metadata": {
                "name": input_data.get("name", "Custom API"),
                "version": input_data.get("version", "1.0.0"),
                "description": input_data.get("description", ""),
                "baseUrl": input_data.get("baseUrl", "")
            },
            "authentication": input_data.get("authentication", {"type": "none"}),
            "endpoints": [self._normalize_endpoint(ep) for ep in endpoints],
            "schemas": input_data.get("schemas", {})
        }
    
    async def _normalize_natural_language(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize natural language description"""
        description = input_data.get("description")
        
        # Use AI to infer API structure
        inferred = await self.nl_processor.infer_api_structure(description)
        
        return inferred
    
    def _convert_to_normalized_format(self, openapi_spec) -> Dict[str, Any]:
        """Convert OpenAPI spec to normalized format"""
        return {
            "metadata": {
                "name": openapi_spec.info.get("title", "API"),
                "version": openapi_spec.info.get("version", "1.0.0"),
                "description": openapi_spec.info.get("description", ""),
                "baseUrl": openapi_spec.servers[0]["url"] if openapi_spec.servers else ""
            },
            "authentication": self._extract_auth(openapi_spec),
            "endpoints": self._extract_endpoints(openapi_spec),
            "schemas": openapi_spec.components.get("schemas", {}) if openapi_spec.components else {}
        }
    
    def _extract_auth(self, spec) -> Dict[str, Any]:
        """Extract authentication configuration"""
        if not spec.security:
            return {"type": "none"}
        
        # Get first security requirement
        security_req = spec.security[0]
        scheme_name = list(security_req.keys())[0]
        
        if spec.components and spec.components.get("securitySchemes"):
            scheme = spec.components["securitySchemes"].get(scheme_name, {})
            return {
                "type": scheme.get("type", "none"),
                "config": scheme
            }
        
        return {"type": "none"}
    
    def _extract_endpoints(self, spec) -> list[Dict[str, Any]]:
        """Extract endpoints from OpenAPI spec"""
        endpoints = []
        
        for path, path_item in spec.paths.items():
            for method, operation in path_item.items():
                if method in ["get", "post", "put", "delete", "patch"]:
                    endpoints.append({
                        "id": f"{method}_{path}".replace("/", "_").replace("{", "").replace("}", ""),
                        "path": path,
                        "method": method.upper(),
                        "summary": operation.get("summary", ""),
                        "description": operation.get("description", ""),
                        "parameters": operation.get("parameters", []),
                        "requestBody": operation.get("requestBody"),
                        "responses": operation.get("responses", {}),
                        "tags": operation.get("tags", [])
                    })
        
        return endpoints
    
    def _normalize_endpoint(self, endpoint: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a single endpoint"""
        return {
            "id": endpoint.get("id", ""),
            "path": endpoint.get("path", ""),
            "method": endpoint.get("method", "GET"),
            "summary": endpoint.get("summary", ""),
            "description": endpoint.get("description", ""),
            "parameters": endpoint.get("parameters", []),
            "requestBody": endpoint.get("requestBody"),
            "responses": endpoint.get("responses", {}),
            "tags": endpoint.get("tags", [])
        }
    
    async def _validate_normalized_spec(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Validate normalized specification"""
        warnings = []
        
        # Check metadata
        if not spec.get("metadata", {}).get("name"):
            warnings.append("API name is missing")
        
        if not spec.get("metadata", {}).get("baseUrl"):
            warnings.append("Base URL is missing")
        
        # Check endpoints
        endpoints = spec.get("endpoints", [])
        if not endpoints:
            warnings.append("No endpoints found")
        
        for endpoint in endpoints:
            if not endpoint.get("path"):
                warnings.append(f"Endpoint {endpoint.get('id')} missing path")
            if not endpoint.get("method"):
                warnings.append(f"Endpoint {endpoint.get('id')} missing method")
        
        return {
            "valid": len(warnings) == 0,
            "warnings": warnings
        }
    
    def _get_spec_summary(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Get summary of normalized spec"""
        return {
            "name": spec.get("metadata", {}).get("name"),
            "version": spec.get("metadata", {}).get("version"),
            "endpoint_count": len(spec.get("endpoints", [])),
            "auth_type": spec.get("authentication", {}).get("type"),
            "has_schemas": bool(spec.get("schemas"))
        }
```

## Agent Orchestrator

**File: `backend/app/agents/orchestrator.py`**

```python
from typing import List, Optional, Callable
from app.agents.base import BaseAgent, AgentContext, AgentMessage
from app.agents.input_normalizer import InputNormalizerAgent
from app.agents.schema_extractor import SchemaExtractorAgent
from app.agents.endpoint_mapper import EndpointMapperAgent
from app.agents.auth_analyzer import AuthAnalyzerAgent
from app.agents.mcp_translator import MCPTranslatorAgent
from app.agents.code_generator import CodeGeneratorAgent
from app.agents.optimizer import OptimizerAgent
from app.agents.validator import ValidatorAgent
from app.agents.doc_generator import DocGeneratorAgent
import logging

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """Orchestrates the multi-agent pipeline"""
    
    def __init__(self, provider_factory):
        self.provider_factory = provider_factory
        self.agents: List[BaseAgent] = []
        self._initialize_agents()
    
    def _initialize_agents(self):
        """Initialize all agents in the pipeline"""
        # Create providers for different agents
        normalizer_provider = self.provider_factory.create("watsonx", "granite-13b-chat")
        extractor_provider = self.provider_factory.create("watsonx", "granite-20b-code")
        mapper_provider = self.provider_factory.create("openai", "gpt-4")
        auth_provider = self.provider_factory.create("anthropic", "claude-3-opus")
        translator_provider = self.provider_factory.create("watsonx", "granite-13b-instruct")
        generator_provider = self.provider_factory.create("watsonx", "granite-34b-code")
        optimizer_provider = self.provider_factory.create("openai", "gpt-4")
        validator_provider = self.provider_factory.create("anthropic", "claude-3-opus")
        doc_provider = self.provider_factory.create("openai", "gpt-4")
        
        # Initialize agents in order
        self.agents = [
            InputNormalizerAgent(normalizer_provider),
            SchemaExtractorAgent(extractor_provider),
            EndpointMapperAgent(mapper_provider),
            AuthAnalyzerAgent(auth_provider),
            MCPTranslatorAgent(translator_provider),
            CodeGeneratorAgent(generator_provider),
            OptimizerAgent(optimizer_provider),
            ValidatorAgent(validator_provider),
            DocGeneratorAgent(doc_provider)
        ]
    
    async def execute_pipeline(
        self,
        input_data: dict,
        session_id: str,
        stream_callback: Optional[Callable] = None
    ) -> AgentContext:
        """
        Execute the complete agent pipeline
        
        Args:
            input_data: Input data for generation
            session_id: Unique session identifier
            stream_callback: Optional callback for streaming updates
        
        Returns:
            Final context with all agent outputs
        """
        # Initialize context
        context = AgentContext(
            session_id=session_id,
            input_data=input_data
        )
        
        logger.info(f"Starting pipeline execution for session {session_id}")
        
        # Execute each agent sequentially
        for i, agent in enumerate(self.agents):
            logger.info(f"Executing agent {i+1}/{len(self.agents)}: {agent.agent_name}")
            
            try:
                context = await agent.execute(context, stream_callback)
            except Exception as e:
                logger.error(f"Agent {agent.agent_name} failed: {e}")
                raise
        
        logger.info(f"Pipeline execution completed for session {session_id}")
        
        return context
    
    def get_agent_info(self) -> List[dict]:
        """Get information about all agents"""
        return [
            {
                "id": agent.agent_id,
                "name": agent.agent_name,
                "description": agent.description
            }
            for agent in self.agents
        ]
```

## Usage Example

```python
from app.agents.orchestrator import AgentOrchestrator
from app.services.providers import ProviderFactory

# Initialize orchestrator
provider_factory = ProviderFactory()
orchestrator = AgentOrchestrator(provider_factory)

# Define streaming callback
async def stream_callback(message: AgentMessage):
    print(f"[{message.agent_name}] {message.message} ({message.progress*100:.0f}%)")
    if message.data:
        print(f"  Data: {message.data}")

# Execute pipeline
input_data = {
    "type": "openapi",
    "source": {
        "type": "url",
        "url": "https://petstore.swagger.io/v2/swagger.json"
    },
    "options": {
        "target_language": "python",
        "enable_caching": True,
        "enable_rate_limiting": True
    }
}

context = await orchestrator.execute_pipeline(
    input_data=input_data,
    session_id="test-session-123",
    stream_callback=stream_callback
)

# Access results
print(f"Generated code: {context.generated_code}")
print(f"Documentation: {context.documentation}")
```

This example demonstrates the complete agent architecture with a concrete implementation of the Input Normalizer agent and the orchestrator that manages the pipeline execution.