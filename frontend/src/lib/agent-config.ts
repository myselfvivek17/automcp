export interface AgentConfig {
  provider: string;
  model: string;
}

export type AgentName =
  | 'Input Parser'
  | 'Schema Extractor'
  | 'Endpoint Mapper'
  | 'Auth Analyzer'
  | 'MCP Translator'
  | 'Code Generator'
  | 'Validator'
  | 'Docs Generator';

export type AgentConfigs = Record<AgentName, AgentConfig>;

export const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  'Input Parser':    'Parses and normalizes OpenAPI, Swagger, URL, GitHub, file upload, or plain text',
  'Schema Extractor': 'Extracts endpoint paths, methods, parameters, and schemas',
  'Endpoint Mapper': 'Maps API endpoints to MCP tool definitions',
  'Auth Analyzer':   'Detects authentication type and configures auth headers',
  'MCP Translator':  'Formalizes tool schemas with JSON Schema input definitions',
  'Code Generator':  'Generates production-ready Python or TypeScript MCP server code',
  'Validator':       'Reviews generated code for syntax errors and MCP compliance',
  'Docs Generator':  'Writes README with setup instructions and Claude Desktop config',
};

export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  watsonx: [
    'ibm/granite-4-h-small',                    // Granite 4.0 small, fast general tasks
    'ibm/granite-3-8b-instruct',                // Granite 3 instruct
    'ibm/granite-8b-code-instruct',             // code generation
    'ibm/granite-guardian-3-8b',                // Granite Guardian safety model
    'meta-llama/llama-3-3-70b-instruct',        // Llama 3.3 70B
    'meta-llama/llama-4-maverick-17b-128e-instruct-fp8', // Llama 4 Maverick
    'mistralai/mistral-small-3-1-24b-instruct-2503', // Mistral Small
    'mistral-large-2512',                       // Mistral Large
  ],
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'poolside/laguna-m.1:free',
    'openai/gpt-oss-120b:free',
    'z-ai/glm-4.5-air:free',
    'minimax/minimax-m2.5:free',
    'poolside/laguna-xs.2:free',
  ],
};

export const DEFAULT_CONFIGS: AgentConfigs = {
  'Input Parser':    { provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'Schema Extractor':{ provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'Endpoint Mapper': { provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'Auth Analyzer':   { provider: 'watsonx', model: 'ibm/granite-4-h-small' },
  'MCP Translator':  { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct' },
  'Code Generator':  { provider: 'watsonx', model: 'ibm/granite-8b-code-instruct' },
  'Validator':       { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct' },
  'Docs Generator':  { provider: 'watsonx', model: 'ibm/granite-3-8b-instruct' },
};

export const PRESETS: Record<string, { provider: string; modelIndex: number }> = {
  'Cost-Optimized': { provider: 'watsonx', modelIndex: 0 },
  'Balanced':       { provider: 'watsonx', modelIndex: 1 },
  'Performance':    { provider: 'watsonx', modelIndex: 2 },
};

const STORAGE_KEY = 'automcp_agent_configs';
const CONFIG_VERSION = '3.0';
const VERSION_KEY = 'automcp_config_version';

export function loadAgentConfigs(): AgentConfigs {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIGS };
  try {
    const savedVersion = localStorage.getItem(VERSION_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);

    // If version mismatch or no saved config, use defaults
    if (savedVersion !== CONFIG_VERSION || !saved) {
      saveAgentConfigs(DEFAULT_CONFIGS);
      localStorage.setItem(VERSION_KEY, CONFIG_VERSION);
      return { ...DEFAULT_CONFIGS };
    }

    return { ...DEFAULT_CONFIGS, ...JSON.parse(saved) };
  } catch {
    return { ...DEFAULT_CONFIGS };
  }
}

export function saveAgentConfigs(configs: AgentConfigs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
