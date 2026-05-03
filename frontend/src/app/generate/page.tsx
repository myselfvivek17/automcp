'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { loadAgentConfigs } from '@/lib/agent-config';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface AgentUpdate {
  agent_name: string;
  status: string;
  data: any;
  progress: number;
  message: string;
  timestamp: string;
}

const AGENT_ORDER: Record<string, number> = {
  'Input Parser': 0,
  'Schema Extractor': 1,
  'Endpoint Mapper': 2,
  'Auth Analyzer': 3,
  'MCP Translator': 4,
  'Code Generator': 5,
  'Validator': 6,
  'Docs Generator': 7,
};
const TOTAL_AGENTS = 8;

function calcOverallProgress(agentName: string, agentProgress: number): number {
  const slot = AGENT_ORDER[agentName] ?? 0;
  return Math.round(((slot + agentProgress) / TOTAL_AGENTS) * 100);
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto">{code}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function GenerationInsights({ agentUpdates }: { agentUpdates: AgentUpdate[] }) {
  const [open, setOpen] = useState(false);
  const completed = agentUpdates.filter(u => u.status === 'completed' && u.agent_name !== 'Pipeline');
  if (completed.length === 0) return null;

  const endpointCount = completed.find(u => u.agent_name === 'Schema Extractor')?.data?.endpoints?.length ?? 0;
  const toolCount = completed.find(u => u.agent_name === 'Endpoint Mapper')?.data?.tool_count ?? 0;
  const authType = completed.find(u => u.agent_name === 'Auth Analyzer')?.data?.auth_config?.type ?? 'unknown';
  const endpoints: any[] = completed.find(u => u.agent_name === 'Schema Extractor')?.data?.endpoints ?? [];
  const tools: any[] = completed.find(u => u.agent_name === 'Endpoint Mapper')?.data?.mcp_tools ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">How it was built</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {endpointCount} endpoints discovered → {toolCount} MCP tools · Auth: {authType}
          </p>
        </div>
        <span className="text-gray-400 dark:text-slate-500 text-lg ml-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-slate-700 p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Endpoints extracted ({endpointCount})</h3>
            <div className="space-y-1.5">
              {endpoints.map((ep: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    ep.method === 'GET' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    ep.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    ep.method === 'PUT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                    ep.method === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                    'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>{ep.method}</span>
                  <code className="text-gray-600 dark:text-slate-400 text-xs">{ep.path}</code>
                  {ep.summary && <span className="text-gray-400 dark:text-slate-500 text-xs">— {ep.summary}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">MCP tools generated ({toolCount})</h3>
            <div className="flex flex-wrap gap-2">
              {tools.map((t: any, i: number) => (
                <span key={i} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Authentication detected</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Type: <strong>{authType}</strong> · Location: header · Scheme: Bearer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SetupInstructions({ language }: { language: string }) {
  const isPython = language === 'python';
  const filename = isPython ? 'mcp_server.py' : 'mcp_server.ts';

  const installCmd = isPython
    ? 'pip install mcp requests'
    : 'npm install @modelcontextprotocol/sdk node-fetch';

  const runCmd = isPython
    ? `python ${filename}`
    : `npx ts-node ${filename}`;

  const claudeConfig = isPython
    ? `{
  "mcpServers": {
    "my-api": {
      "command": "python",
      "args": ["/absolute/path/to/${filename}"]
    }
  }
}`
    : `{
  "mcpServers": {
    "my-api": {
      "command": "npx",
      "args": ["ts-node", "/absolute/path/to/${filename}"]
    }
  }
}`;

  const cursorConfig = `// Add to Cursor settings → MCP → Add Server
{
  "name": "my-api",
  "command": "${isPython ? 'python' : 'npx ts-node'}",
  "args": ["/absolute/path/to/${filename}"]
}`;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Setup & Configuration</h2>

      <div>
        <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-2">1. Install dependencies</h3>
        <CodeBlock code={installCmd} />
      </div>

      <div>
        <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-2">2. Save the generated code</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
          Download the file above and save it as <code className="bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-sm">{filename}</code>.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-2">3. Test the server</h3>
        <CodeBlock code={runCmd} />
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">The server communicates over stdio — it won't print anything on startup unless there's an error.</p>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-2">4. Add to Claude Desktop</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
          Edit <code className="bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-sm">~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code className="bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded font-mono text-sm">%APPDATA%\Claude\claude_desktop_config.json</code> (Windows):
        </p>
        <CodeBlock code={claudeConfig} />
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Restart Claude Desktop after saving.</p>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 dark:text-slate-200 mb-2">5. Add to Cursor</h3>
        <CodeBlock code={cursorConfig} />
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Environment variables</p>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          If your API requires authentication, set the API key as an environment variable and update the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded font-mono text-xs">headers</code> dict in the generated code before running.
        </p>
      </div>
    </div>
  );
}

const INPUT_CLS = "w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100";

export default function GeneratePage() {
  const [inputType, setInputType] = useState('text');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('python');
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('watsonx');

  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [agentUpdates, setAgentUpdates] = useState<AgentUpdate[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentUpdate | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [readme, setReadme] = useState('');
  const [outputTab, setOutputTab] = useState<'code' | 'readme'>('code');
  const [formApiName, setFormApiName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formEndpoints, setFormEndpoints] = useState<{method: string; path: string; description: string}[]>([
    { method: 'GET', path: '/items', description: 'List all items' },
  ]);

  const wsRef = useRef<WebSocket | null>(null);

  const sampleOpenAPI = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Sample API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.example.com/v1"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "List users",
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      },
      "post": {
        "summary": "Create user",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "email": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Success"
          }
        }
      }
    }
  }
}`;

  const handleGenerate = () => {
    setGenerating(true);
    setAgentUpdates([]);
    setCurrentAgent(null);
    setOverallProgress(0);
    setGeneratedCode('');

    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + '/api/simple/generate/stream';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        input_type: inputType,
        content,
        language,
        api_key: apiKey || undefined,
        provider,
        agent_configs: loadAgentConfigs(),
      }));
    };

    ws.onmessage = (event) => {
      const msg: AgentUpdate = JSON.parse(event.data);

      if (msg.agent_name === 'Pipeline' && msg.status === 'completed') {
        setGeneratedCode(msg.data?.code ?? '');
        setReadme(msg.data?.readme ?? '');
        setOutputTab('code');
        setOverallProgress(100);
        setCurrentAgent(msg);
        setAgentUpdates(prev => [...prev, msg]);
        setGenerating(false);
        ws.close();
        return;
      }

      if (msg.status === 'error') {
        alert(`Generation failed: ${msg.message}`);
        setCurrentAgent(msg);
        setAgentUpdates(prev => [...prev, msg]);
        setGenerating(false);
        ws.close();
        return;
      }

      setCurrentAgent(msg);
      setAgentUpdates(prev => [...prev, msg]);
      setOverallProgress(prev => Math.max(prev, calcOverallProgress(msg.agent_name, msg.progress)));
    };

    ws.onerror = () => {
      alert('WebSocket connection failed. Is the backend running?');
      setGenerating(false);
    };

    ws.onclose = () => {
      setGenerating(false);
    };
  };

  const handleStop = () => {
    if (wsRef.current) wsRef.current.close();
    setGenerating(false);
  };

  const loadSample = () => {
    setInputType('openapi');
    setContent(sampleOpenAPI);
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp_server.${language === 'python' ? 'py' : 'ts'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const serializeForm = (name: string, baseUrl: string, endpoints: {method: string; path: string; description: string}[]) => {
    setContent(JSON.stringify({ api_name: name, base_url: baseUrl, endpoints }));
  };

  const addEndpoint = () => {
    const updated = [...formEndpoints, { method: 'GET', path: '/endpoint', description: '' }];
    setFormEndpoints(updated);
    serializeForm(formApiName, formBaseUrl, updated);
  };

  const removeEndpoint = (i: number) => {
    const updated = formEndpoints.filter((_, idx) => idx !== i);
    setFormEndpoints(updated);
    serializeForm(formApiName, formBaseUrl, updated);
  };

  const updateEndpoint = (i: number, field: string, value: string) => {
    const updated = formEndpoints.map((ep, idx) => idx === i ? { ...ep, [field]: value } : ep);
    setFormEndpoints(updated);
    serializeForm(formApiName, formBaseUrl, updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-50 mb-2">
            AutoMCP Generator
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            Generate MCP server code from any API specification with real-time agent visualization
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Input Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Input Type</label>
                  <select value={inputType} onChange={(e) => setInputType(e.target.value)} className={INPUT_CLS}>
                    <option value="text">Plain Text</option>
                    <option value="url">URL (API Docs Page)</option>
                    <option value="github">GitHub Repository</option>
                    <option value="openapi">OpenAPI 3.0 JSON</option>
                    <option value="swagger">Swagger 2.0 JSON</option>
                    <option value="file">Upload File (.json / .yaml)</option>
                    <option value="form">Manual Entry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Output Language</label>
                  <select title="Output language" value={language} onChange={(e) => setLanguage(e.target.value)} className={INPUT_CLS}>
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">AI Provider (Optional)</label>
                  <select title="AI provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={INPUT_CLS}>
                    <option value="watsonx">IBM Watsonx.ai</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="google">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">API Key (Optional)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave empty for mock generation"
                    className={INPUT_CLS}
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Works without API key using mock responses</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  {inputType === 'url' ? 'API Docs URL' : 'API Specification'}
                </h2>
                {(inputType === 'openapi' || inputType === 'swagger' || inputType === 'text') && (
                  <button type="button" onClick={loadSample} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    Load Sample
                  </button>
                )}
              </div>
              {inputType === 'url' && (
                <div className="space-y-3">
                  <input type="url" value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="https://api.example.com/docs or https://petstore.swagger.io/v2/swagger.json"
                    className={INPUT_CLS} />
                  <p className="text-xs text-gray-500 dark:text-slate-400">HTML docs, raw OpenAPI/Swagger JSON, or README files.</p>
                </div>
              )}
              {inputType === 'github' && (
                <div className="space-y-3">
                  <input type="url" value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className={INPUT_CLS} />
                  <p className="text-xs text-gray-500 dark:text-slate-400">Auto-finds openapi.json / swagger.yaml in the repo root or /docs.</p>
                </div>
              )}
              {inputType === 'file' && (
                <div className="space-y-3">
                  <input type="file" accept=".json,.yaml,.yml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target?.result as string;
                        setContent(text);
                        try {
                          const parsed = JSON.parse(text);
                          setInputType(parsed.swagger ? 'swagger' : 'openapi');
                        } catch { setInputType('openapi'); }
                      };
                      reader.readAsText(file);
                    }}
                    className={INPUT_CLS} />
                  <p className="text-xs text-gray-500 dark:text-slate-400">Upload OpenAPI 3.0 or Swagger 2.0 .json / .yaml file.</p>
                </div>
              )}
              {inputType === 'form' && (
                <div className="space-y-3">
                  <input type="text" placeholder="API Name (e.g. Petstore API)" value={formApiName}
                    onChange={(e) => { setFormApiName(e.target.value); serializeForm(e.target.value, formBaseUrl, formEndpoints); }}
                    className={INPUT_CLS} />
                  <input type="url" placeholder="Base URL (e.g. https://api.example.com)" value={formBaseUrl}
                    onChange={(e) => { setFormBaseUrl(e.target.value); serializeForm(formApiName, e.target.value, formEndpoints); }}
                    className={INPUT_CLS} />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-slate-400">Endpoints</p>
                    {formEndpoints.map((ep, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={ep.method} onChange={(e) => updateEndpoint(i, 'method', e.target.value)}
                          className="w-24 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                          {['GET','POST','PUT','DELETE','PATCH'].map(m => <option key={m}>{m}</option>)}
                        </select>
                        <input type="text" placeholder="/path/{id}" value={ep.path}
                          onChange={(e) => updateEndpoint(i, 'path', e.target.value)}
                          className="w-36 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
                        <input type="text" placeholder="Description" value={ep.description}
                          onChange={(e) => updateEndpoint(i, 'description', e.target.value)}
                          className="flex-1 px-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
                        <button onClick={() => removeEndpoint(i)}
                          className="text-red-500 hover:text-red-700 text-xl font-bold leading-none px-1">×</button>
                      </div>
                    ))}
                    <button onClick={addEndpoint} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add Endpoint</button>
                  </div>
                </div>
              )}
              {(inputType === 'openapi' || inputType === 'swagger' || inputType === 'text') && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    inputType === 'openapi' ? 'Paste OpenAPI 3.0 JSON here...' :
                    inputType === 'swagger' ? 'Paste Swagger 2.0 JSON here...' :
                    'Describe your API endpoints, e.g.:\n\nBase URL: https://api.example.com\n\nGET /users — list all users\nPOST /users — create a user\nGET /users/{id} — get user by ID'
                  }
                  className={`${INPUT_CLS} h-64 font-mono text-sm`}
                />
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={generating || (inputType === 'form' ? (!formApiName || !formBaseUrl || formEndpoints.length === 0) : !content)}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? 'Generating...' : 'Generate MCP Server'}
              </button>
              {generating && (
                <button onClick={handleStop} className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {(generating || agentUpdates.length > 0) && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Agent Pipeline</h2>
                  {!generating && overallProgress === 100 && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">Complete</span>
                  )}
                </div>

                <div className="mb-5">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400 mb-1.5">
                    <span>Overall Progress</span>
                    <span className="font-medium">{Math.round(overallProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div
                      className={`bg-blue-600 h-2.5 rounded-full transition-all duration-500 ${generating ? 'animate-pulse' : ''}`}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-gray-50 dark:divide-slate-700 max-h-72 overflow-y-auto">
                  {agentUpdates.filter(u => u.agent_name !== 'Pipeline').map((update, index) => (
                    <div key={index} className="flex items-start gap-3 py-2.5">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                        update.status === 'completed' ? 'bg-green-500 text-white' :
                        update.status === 'error' ? 'bg-red-500 text-white' :
                        update.status === 'processing' ? 'bg-amber-400 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {update.status === 'completed' ? '✓' : update.status === 'error' ? '✗' : '·'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 leading-tight">{update.agent_name}</p>
                        <p className={`text-xs mt-0.5 truncate ${
                          update.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                          update.status === 'error' ? 'text-red-600 dark:text-red-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>{update.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(generatedCode || readme) && (
              <>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
                  <div className="flex border-b border-gray-200 dark:border-slate-700">
                    <button onClick={() => setOutputTab('code')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${outputTab === 'code' ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                      Generated Code
                    </button>
                    <button onClick={() => setOutputTab('readme')} disabled={!readme}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors disabled:opacity-40 ${outputTab === 'readme' ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                      README {readme && <span className="ml-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">new</span>}
                    </button>
                  </div>

                  {outputTab === 'code' && generatedCode && (
                    <div className="p-6">
                      <div className="flex justify-end mb-3">
                        <button onClick={downloadCode} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">Download</button>
                      </div>
                      <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
                        <MonacoEditor height="500px" language={language === 'python' ? 'python' : 'typescript'}
                          value={generatedCode} theme="vs-dark"
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true }} />
                      </div>
                    </div>
                  )}

                  {outputTab === 'readme' && readme && (
                    <div className="p-6">
                      <div className="flex justify-end mb-3">
                        <button onClick={() => {
                          const blob = new Blob([readme], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = 'README.md'; a.click();
                          URL.revokeObjectURL(url);
                        }} className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                          Download README
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-[500px] text-gray-800 dark:text-slate-200">
                        {readme}
                      </pre>
                    </div>
                  )}
                </div>

                <GenerationInsights agentUpdates={agentUpdates} />
                <SetupInstructions language={language} />
              </>
            )}

            {!generating && !generatedCode && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">Ready to Generate</h3>
                <p className="text-gray-500 dark:text-slate-400">
                  Configure your input and click "Generate MCP Server" to start
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
