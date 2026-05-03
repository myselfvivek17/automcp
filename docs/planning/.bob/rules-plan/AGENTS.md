# AGENTS.md - Plan Mode

This file provides guidance for Plan mode when working with AutoMCP planning documents.

## Planning Document Architecture (Non-Obvious)

### Document Interdependencies
- [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md) defines the 9-agent pipeline - this is the SOURCE OF TRUTH
- [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md) extends it with per-agent config and parallelization
- Changes to agent order in ARCHITECTURE must cascade to ENHANCED, IMPLEMENTATION_GUIDE, and AGENT_IMPLEMENTATION_EXAMPLE
- [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md) references all other docs - update it LAST

### Phase Numbering System
- 20 phases total, numbered 1-20 in [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md:81-100)
- Phase numbers are FIXED - don't renumber when adding content
- Each phase maps to specific weeks (Phase 1-2 = Week 1-3, etc.)
- MVP scope is Phases 1-6 only (see [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md:265-275))

### Mermaid Diagram Constraints
- NEVER use double quotes ("") inside square brackets [] - causes parsing errors
- NEVER use parentheses () inside square brackets [] - breaks rendering
- Use single quotes or no quotes for labels
- Example: `[Agent Name]` not `["Agent Name"]` or `[Agent (Name)]`

### Technology Stack Decisions
- Stack choices in [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md:17-60) are FINAL
- Python FastAPI (not Flask/Django) - justified by async/await and Pydantic
- Next.js 14+ App Router (not Pages Router) - justified by SSR and built-in API routes
- IBM Cloudant (not MongoDB) - justified by document-based storage and replication
- Changing stack requires updating 5+ documents

### Agent Configuration Pattern
- Each agent has 3 config sources: custom > preset > file (see [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:54-154))
- Presets are: cost_optimized, performance_optimized, balanced
- Fallback providers are REQUIRED for production reliability
- Temperature ranges: 0.1 (code gen) to 0.5 (docs)

### Parallel Execution Constraints
- Only 2 parallel groups possible: Analysis (after Agent 3) and Enhancement (after Agent 6)
- Cannot parallelize Agents 1-3 or 5-6 due to data dependencies
- Semaphore limits concurrent execution (default: 3-4 agents)
- Performance gain: 20-40% (not 4x even with 4 parallel agents due to overhead)

## Planning Best Practices

### When Adding New Features
1. Check if it fits existing phases or needs new phase
2. Update [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md) first (source of truth)
3. Add implementation details to [`IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md)
4. Update [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md) last (references all docs)
5. Update [`INDEX.md`](../../INDEX.md) if adding new document

### When Modifying Agent Pipeline
1. Agent order is FIXED - cannot reorder without breaking dependencies
2. Update [`AgentContext`](../../AGENT_IMPLEMENTATION_EXAMPLE.md:43-56) if adding new fields
3. Update all 4 docs: ARCHITECTURE, ENHANCED, IMPLEMENTATION_GUIDE, AGENT_IMPLEMENTATION_EXAMPLE
4. Verify field names match across all documents

### Cost Estimation Updates
- Cost per generation in [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:755-769)
- Based on: (tokens per agent × cost per token × number of agents)
- Update when changing models or adding agents
- Presets must maintain cost ratios: cost_optimized (1x) < balanced (2.4x) < performance (5x)