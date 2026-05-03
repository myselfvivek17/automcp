# AGENTS.md - Ask Mode

This file provides guidance for Ask mode when working with AutoMCP planning documents.

## Documentation Navigation (Non-Obvious)

### Document Reading Order
- Start with [`INDEX.md`](../../INDEX.md) - provides guided navigation
- For architecture questions: [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md) is source of truth
- For implementation: [`IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md) has working code
- For agent patterns: [`AGENT_IMPLEMENTATION_EXAMPLE.md`](../../AGENT_IMPLEMENTATION_EXAMPLE.md) has base classes
- For enhancements: [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md) has per-agent config and parallelization

### Hidden Context in Documents
- [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md:17-60) explains WHY each technology was chosen (not just what)
- [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:36-48) shows agent-model matching strategy (which model for which agent)
- [`IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md) Phases 1-3 have complete working code, Phases 4+ are planned
- [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md:265-275) defines MVP as Phases 1-6 only (not all 20 phases)

### Counterintuitive Organization
- This is a PLANNING repository, not implementation code
- All code examples are FUTURE implementation, not current code
- File paths in examples (like `backend/app/`) don't exist yet
- [`QUICK_START.md`](../../QUICK_START.md) is for FUTURE implementation setup, not current repo

### Multi-Agent Pipeline Context
- 9 agents run SEQUENTIALLY with 2 parallel groups
- Agent order is FIXED: Input Normalizer → Schema Extractor → Endpoint Mapper → Auth Analyzer → MCP Translator → Code Generator → Optimizer → Validator → Doc Generator
- Parallel Group 1 (after Agent 3): Auth Analyzer + Rate Limit Analyzer + Doc Extractor
- Parallel Group 2 (after Agent 6): Optimizer + Security Analyzer + Performance Analyzer
- Cannot parallelize other stages due to data dependencies

### Provider Configuration Context
- Each agent can use DIFFERENT AI providers/models
- Configuration hierarchy: custom_configs > preset > file config > defaults
- 3 presets: cost_optimized ($0.05), balanced ($0.12), performance_optimized ($0.25)
- Granite models (IBM watsonx.ai) are PRIMARY, not just OpenAI
- Fallback providers are MANDATORY for production

### Technology Stack Rationale
- Python FastAPI chosen for: async/await, Pydantic validation, WebSocket support
- Next.js 14+ App Router chosen for: SSR, built-in API routes, TypeScript support
- IBM Cloudant chosen for: document storage, replication, JSON-native
- NOT using: Flask, Django, Pages Router, MongoDB, PostgreSQL

## Question Answering Strategy

### For Architecture Questions
1. Check [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md) first (1000+ lines, comprehensive)
2. For enhancements: [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md)
3. For implementation: [`IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md)

### For Implementation Questions
1. Check [`IMPLEMENTATION_GUIDE.md`](../../IMPLEMENTATION_GUIDE.md) for Phases 1-3 (has complete code)
2. Check [`AGENT_IMPLEMENTATION_EXAMPLE.md`](../../AGENT_IMPLEMENTATION_EXAMPLE.md) for agent patterns
3. Check [`QUICK_START.md`](../../QUICK_START.md) for setup instructions

### For Cost/Performance Questions
- Cost estimates: [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:755-769)
- Performance analysis: [`ENHANCED_AGENT_ARCHITECTURE.md`](../../ENHANCED_AGENT_ARCHITECTURE.md:723-753)
- Parallel execution speedup: 20-40% (not 4x due to overhead)

### For Phase/Timeline Questions
- 20 phases over 14 weeks: [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md:81-100)
- MVP is Phases 1-6 (4-6 weeks): [`PROJECT_SUMMARY.md`](../../PROJECT_SUMMARY.md:265-275)
- Phase mapping: [`AUTOMCP_ARCHITECTURE.md`](../../AUTOMCP_ARCHITECTURE.md:617-787)