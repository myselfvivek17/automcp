export interface AgentConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export type AgentName =
  | 'Input Parser'
  | 'Schema Extractor'
  | 'Endpoint Mapper'
  | 'Auth Analyzer'
  | 'Code Generator';

export type AgentConfigs = Record<AgentName, AgentConfig>;

export const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  'Input Parser': 'Parses and normalizes OpenAPI, Swagger, or plain text input',
  'Schema Extractor': 'Extracts endpoint paths, methods, parameters, and schemas',
  'Endpoint Mapper': 'Maps API endpoints to MCP tool definitions',
  'Auth Analyzer': 'Detects authentication type and configures auth headers',
  'Code Generator': 'Generates production-ready Python or TypeScript MCP server code',
};

export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  watsonx: [
    'meta-llama/llama-3-8b-instruct',   // chat API, recommended for general tasks
    'ibm/granite-3-8b-instruct',        // chat API, IBM native
    'ibm/granite-13b-chat-v2',          // chat API, larger context
    'ibm/granite-20b-code-instruct',    // code generation
    'ibm/granite-34b-code-instruct',    // best code generation
  ],
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
};

export const DEFAULT_CONFIGS: AgentConfigs = {
  'Input Parser':     { provider: 'watsonx', model: 'meta-llama/llama-3-8b-instruct', apiKey: '' },
  'Schema Extractor': { provider: 'watsonx', model: 'meta-llama/llama-3-8b-instruct', apiKey: '' },
  'Endpoint Mapper':  { provider: 'watsonx', model: 'meta-llama/llama-3-8b-instruct', apiKey: '' },
  'Auth Analyzer':    { provider: 'watsonx', model: 'meta-llama/llama-3-8b-instruct', apiKey: '' },
  'Code Generator':   { provider: 'watsonx', model: 'ibm/granite-34b-code-instruct',  apiKey: '' },
};

export const PRESETS: Record<string, { provider: string; modelIndex: number }> = {
  'Cost-Optimized': { provider: 'watsonx', modelIndex: 0 },
  'Balanced':       { provider: 'watsonx', modelIndex: 1 },
  'Performance':    { provider: 'watsonx', modelIndex: 2 },
};

const STORAGE_KEY = 'automcp_agent_configs';

export function loadAgentConfigs(): AgentConfigs {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIGS };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...DEFAULT_CONFIGS };
    return { ...DEFAULT_CONFIGS, ...JSON.parse(saved) };
  } catch {
    return { ...DEFAULT_CONFIGS };
  }
}

export function saveAgentConfigs(configs: AgentConfigs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
