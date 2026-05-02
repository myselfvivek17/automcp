'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
  'Code Generator': 4,
};
const TOTAL_AGENTS = 5;

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
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">How it was built</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {endpointCount} endpoints discovered → {toolCount} MCP tools · Auth: {authType}
          </p>
        </div>
        <span className="text-gray-400 text-lg ml-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Endpoints extracted ({endpointCount})</h3>
            <div className="space-y-1.5">
              {endpoints.map((ep: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                    ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                    ep.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                    ep.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{ep.method}</span>
                  <code className="text-gray-600 text-xs">{ep.path}</code>
                  {ep.summary && <span className="text-gray-400 text-xs">— {ep.summary}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">MCP tools generated ({toolCount})</h3>
            <div className="flex flex-wrap gap-2">
              {tools.map((t: any, i: number) => (
                <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-mono">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Authentication detected</h3>
            <p className="text-sm text-gray-600">
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
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-semibold">Setup & Configuration</h2>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">1. Install dependencies</h3>
        <CodeBlock code={installCmd} />
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">2. Save the generated code</h3>
        <p className="text-sm text-gray-600 mb-2">
          Download the file above and save it as <code className="bg-gray-100 px-1 rounded font-mono text-sm">{filename}</code>.
        </p>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">3. Test the server</h3>
        <CodeBlock code={runCmd} />
        <p className="text-xs text-gray-500 mt-1">The server communicates over stdio — it won't print anything on startup unless there's an error.</p>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">4. Add to Claude Desktop</h3>
        <p className="text-sm text-gray-600 mb-2">
          Edit <code className="bg-gray-100 px-1 rounded font-mono text-sm">~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code className="bg-gray-100 px-1 rounded font-mono text-sm">%APPDATA%\Claude\claude_desktop_config.json</code> (Windows):
        </p>
        <CodeBlock code={claudeConfig} />
        <p className="text-xs text-gray-500 mt-1">Restart Claude Desktop after saving.</p>
      </div>

      <div>
        <h3 className="font-medium text-gray-800 mb-2">5. Add to Cursor</h3>
        <CodeBlock code={cursorConfig} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-800 mb-1">Environment variables</p>
        <p className="text-sm text-blue-700">
          If your API requires authentication, set the API key as an environment variable and update the <code className="bg-blue-100 px-1 rounded font-mono text-xs">headers</code> dict in the generated code before running.
        </p>
      </div>
    </div>
  );
}

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

  const wsRef = useRef<WebSocket | null>(null);

  // Sample OpenAPI spec for testing
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

    const ws = new WebSocket('ws://localhost:8000/api/simple/generate/stream');
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
    if (wsRef.current) {
      wsRef.current.close();
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'started': return 'text-blue-600';
      case 'processing': return 'text-yellow-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'started': return '🚀';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🤖 AutoMCP Generator
          </h1>
          <p className="text-gray-600">
            Generate MCP server code from API specifications with real-time agent visualization
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input Configuration */}
          <div className="space-y-6">
            {/* Input Type Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Input Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Input Type
                  </label>
                  <select
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="text">Plain Text</option>
                    <option value="openapi">OpenAPI 3.0</option>
                    <option value="swagger">Swagger 2.0</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Provider (Optional)
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="watsonx">IBM Watsonx.ai</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="google">Google Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave empty for mock generation"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Works without API key using mock responses
                  </p>
                </div>
              </div>
            </div>

            {/* API Specification Input */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">API Specification</h2>
                <button
                  onClick={loadSample}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Load Sample
                </button>
              </div>
              
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Enter your ${inputType} specification here...`}
                className="w-full h-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            {/* Generate Button */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={generating || !content}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '⚙️ Generating...' : '🚀 Generate MCP Server'}
              </button>
              
              {generating && (
                <button
                  onClick={handleStop}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Agent Visualization & Output */}
          <div className="space-y-6">
            {/* Agent Pipeline Visualization */}
            {(generating || agentUpdates.length > 0) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Agent Pipeline</h2>
                  {!generating && overallProgress === 100 && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Complete</span>
                  )}
                </div>

                {/* Overall Progress */}
                <div className="mb-5">
                  <div className="flex justify-between text-sm text-gray-600 mb-1.5">
                    <span>Overall Progress</span>
                    <span className="font-medium">{Math.round(overallProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`bg-blue-600 h-2.5 rounded-full transition-all duration-500 ${generating ? 'animate-pulse' : ''}`}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>

                {/* Agent Timeline */}
                <div className="space-y-0 divide-y divide-gray-50 max-h-72 overflow-y-auto">
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
                        <p className="text-sm font-medium text-gray-800 leading-tight">{update.agent_name}</p>
                        <p className={`text-xs mt-0.5 truncate ${
                          update.status === 'completed' ? 'text-green-600' :
                          update.status === 'error' ? 'text-red-600' :
                          'text-amber-600'
                        }`}>{update.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Code */}
            {generatedCode && (
              <>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Generated Code</h2>
                    <button
                      onClick={downloadCode}
                      className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download
                    </button>
                  </div>

                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <MonacoEditor
                      height="500px"
                      language={language === 'python' ? 'python' : 'typescript'}
                      value={generatedCode}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>

                {/* Setup & Run Instructions */}
                <GenerationInsights agentUpdates={agentUpdates} />
                <SetupInstructions language={language} />
              </>
            )}

            {/* Placeholder when not generating */}
            {!generating && !generatedCode && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Ready to Generate
                </h3>
                <p className="text-gray-500">
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

// Made with Bob
