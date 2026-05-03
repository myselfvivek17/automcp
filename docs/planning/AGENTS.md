# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Type

**Planning/Documentation Repository** - This is NOT an implementation codebase. Contains architectural planning documents for AutoMCP (MCP server generator), not actual code.

## Critical Non-Obvious Information

### Document Structure Pattern
- All docs use **multi-agent pipeline architecture** (9 sequential agents)
- Agent execution order is FIXED and CRITICAL: Input Normalizer → Schema Extractor → Endpoint Mapper → Auth Analyzer → MCP Translator → Code Generator → Optimizer → Validator → Doc Generator
- Breaking this order will corrupt the pipeline design

### Agent Context Passing
- Each agent MUST update specific fields in [`AgentContext`](AGENT_IMPLEMENTATION_EXAMPLE.md:43-56):
  - `normalized_spec` (Agent 1)
  - `extracted_schema` (Agent 2)
  - `endpoint_mappings` (Agent 3)
  - `auth_config` (Agent 4)
  - `mcp_schema` (Agent 5)
  - `generated_code` (Agent 6)
  - `optimized_code` (Agent 7)
  - `validation_results` (Agent 8)
  - `documentation` (Agent 9)
- Missing any field breaks downstream agents

### Provider Configuration Pattern
- Each agent can use DIFFERENT AI providers/models (see [`ENHANCED_AGENT_ARCHITECTURE.md`](ENHANCED_AGENT_ARCHITECTURE.md:36-48))
- Configuration priority: custom_configs > preset > file config > defaults
- Fallback providers are MANDATORY for production (see [`agent_models.yaml`](ENHANCED_AGENT_ARCHITECTURE.md:54-154))

### Parallel Execution Groups
- Only 2 stages support parallelization (see [`ENHANCED_AGENT_ARCHITECTURE.md`](ENHANCED_AGENT_ARCHITECTURE.md:319-369)):
  - Analysis phase (after Endpoint Mapper)
  - Enhancement phase (after Code Generator)
- All other stages MUST be sequential due to data dependencies

### OpenAPI Version Handling
- Swagger 2.0 specs MUST be converted to OpenAPI 3.0 (see [`openapi_parser.py`](IMPLEMENTATION_GUIDE.md:852-909))
- Conversion is automatic but changes structure significantly
- `host` + `basePath` → `servers` array
- `securityDefinitions` → `components.securitySchemes`

### WebSocket Streaming Protocol
- Agent progress updates use [`AgentMessage`](AGENT_IMPLEMENTATION_EXAMPLE.md:31-41) format
- Progress MUST be 0.0-1.0 float, not percentage
- Status transitions: PENDING → STARTED → PROCESSING → COMPLETED/FAILED
- SKIPPED status used when prerequisites not met

### Technology Stack Constraints
- Backend: Python 3.11+ with FastAPI (NOT Flask/Django)
- Frontend: Next.js 14+ with App Router (NOT Pages Router)
- Database: IBM Cloudant (CouchDB-based, NOT MongoDB/PostgreSQL)
- Primary AI: IBM watsonx.ai Granite models (NOT just OpenAI)

### Configuration File Locations
- Agent configs: `config/agent_models.yaml` (NOT in root)
- Environment: `.env` in project root
- Docker: `docker-compose.yml` in root (NOT in deployment/)

### Cost Optimization Strategy
- Use Granite models for simple tasks (cheaper)
- Use GPT-4/Claude only for complex reasoning
- Estimated costs per preset (see [`ENHANCED_AGENT_ARCHITECTURE.md`](ENHANCED_AGENT_ARCHITECTURE.md:755-769)):
  - cost_optimized: $0.05/generation
  - balanced: $0.12/generation
  - performance_optimized: $0.25/generation

## Testing Commands

No actual code to test - this is a planning repository.

## Code Style

N/A - Documentation only. Follow standard Markdown formatting.