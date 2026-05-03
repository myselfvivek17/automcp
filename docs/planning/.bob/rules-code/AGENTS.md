# AGENTS.md - Code Mode

This file provides guidance for Code mode when working with AutoMCP planning documents.

## Document Editing Rules (Non-Obvious)

### Cross-Document Consistency
- Agent pipeline order appears in 4 documents - MUST update all simultaneously:
  1. [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md:89-147) - Agent specifications
  2. [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:36-48) - Agent-model matching
  3. [`IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md) - Code examples
  4. [`AGENT_IMPLEMENTATION_EXAMPLE.md`](../../AGENT_IMPLEMENTATION_EXAMPLE.md:43-56) - AgentContext fields
- Changing one without others creates inconsistency

### AgentContext Field Naming
- Field names in [`AgentContext`](../../AGENT_IMPLEMENTATION_EXAMPLE.md:43-56) MUST match agent output names:
  - `normalized_spec` (not `normalized_specification`)
  - `extracted_schema` (not `schema`)
  - `endpoint_mappings` (not `endpoints`)
  - `auth_config` (not `authentication`)
  - `mcp_schema` (not `mcp_spec`)
  - `generated_code` (not `code`)
  - `optimized_code` (not `optimizations`)
  - `validation_results` (not `validation`)
  - `documentation` (not `docs`)

### Mermaid Diagram Syntax
- NEVER use `"` or `()` inside `[]` - breaks rendering
- Use `graph TB` (top-bottom) for pipelines, not `graph LR`
- Use `subgraph` for grouping, not nested graphs
- Example: `A[Agent Name]` not `A["Agent Name"]` or `A[Agent (Name)]`

### Code Example File Paths
- All paths in code examples are RELATIVE to future project root
- Backend paths: `backend/app/agents/`, `backend/app/services/`
- Frontend paths: `frontend/src/app/`, `frontend/src/components/`
- Config paths: `config/agent_models.yaml`, `.env`
- These paths DON'T exist in this planning repo

### Provider Configuration Format
- YAML format in [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:54-154)
- Required fields: `provider`, `model`, `temperature`, `max_tokens`
- Optional fields: `timeout`, `retry_attempts`, `fallback_provider`, `fallback_model`
- Temperature ranges: 0.1-0.5 (lower for code, higher for docs)

### Python Code Style in Examples
- Use `async def` for all agent methods (not `def`)
- Use `AsyncIterator` for streaming (not `Iterator`)
- Use `Pydantic BaseModel` for all data classes (not dataclasses)
- Use `logger.info()` not `print()` for logging
- Use `raise ValueError()` not `raise Exception()` for validation errors

### TypeScript Code Style in Examples
- Use `async/await` not `.then()` for promises
- Use `interface` for data shapes, `type` for unions
- Use `const` not `let` unless reassignment needed
- Use optional chaining `?.` for nullable access
- Use nullish coalescing `??` not `||` for defaults

## Editing Best Practices

### When Adding New Agents
1. Update [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md:89-147) agent list
2. Add field to [`AgentContext`](../../AGENT_IMPLEMENTATION_EXAMPLE.md:43-56)
3. Add to [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:36-48) model matching table
4. Add config to [`agent_models.yaml`](../../ENHANCED_AGENT_ARCHITECTURE.md:54-154)
5. Update [`ParallelAgentOrchestrator`](../../ENHANCED_AGENT_ARCHITECTURE.md:419-600) if parallel-capable

### When Modifying Code Examples
- Verify Python version compatibility (3.11+)
- Verify Next.js version compatibility (14+)
- Check imports are from correct packages
- Ensure async/await used consistently
- Add type hints to all function signatures

### When Updating Costs
- Update all 3 preset costs in [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:755-769)
- Maintain cost ratios: cost_optimized (1x) < balanced (2.4x) < performance (5x)
- Update based on: (tokens per agent × cost per token × number of agents)

## File Restrictions

- Can only edit `.md` files (Markdown)
- Cannot create Python/TypeScript files (this is planning repo)
- Cannot create config files (examples only)
- Can create new `.md` documentation files