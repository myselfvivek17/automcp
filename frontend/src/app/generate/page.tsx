'use client';

import { useState, useRef, useEffect } from 'react';
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
      <pre style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        fontSize: '14px',
        fontFamily: 'var(--mono)',
        overflowX: 'auto' as any,
      }}>{code}</pre>
      <button
        onClick={copy}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: '12px',
          background: 'var(--paper-3)',
          color: 'var(--ink-3)',
          padding: '4px 8px',
          borderRadius: 'var(--radius)',
          border: 'none',
          opacity: 0,
          cursor: 'pointer',
        } as any}
        className="group-hover:opacity-100 transition-opacity"
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
    <div className="surface" style={{ padding: '20px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left' as any,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>How it was built</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
            {endpointCount} endpoints discovered → {toolCount} MCP tools · Auth: {authType}
          </p>
        </div>
        <span style={{ color: 'var(--ink-3)', fontSize: '18px', marginLeft: 16 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '20px', borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' as any, gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>Endpoints extracted ({endpointCount})</h3>
            <div style={{ display: 'flex', flexDirection: 'column' as any, gap: '6px' }}>
              {endpoints.map((ep: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px' }}>
                  <span className={`method method-${ep.method}`}>{ep.method}</span>
                  <code style={{ color: 'var(--ink-3)', fontSize: '12px', fontFamily: 'var(--mono)' }}>{ep.path}</code>
                  {ep.summary && <span style={{ color: 'var(--ink-mute)', fontSize: '12px' }}>— {ep.summary}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>MCP tools generated ({toolCount})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: 8 }}>
              {tools.map((t: any, i: number) => (
                <span key={i} style={{
                  padding: '4px 8px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                }}>{t.name}</span>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4, fontFamily: 'var(--sans)' }}>Authentication detected</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
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
    <div className="surface" style={{ padding: '24px', display: 'flex', flexDirection: 'column' as any, gap: '24px' }}>
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>Setup & Configuration</h2>

      <div>
        <h3 style={{ fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)', fontSize: '14px' }}>1. Install dependencies</h3>
        <CodeBlock code={installCmd} />
      </div>

      <div>
        <h3 style={{ fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)', fontSize: '14px' }}>2. Save the generated code</h3>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
          Download the file above and save it as <code style={{ background: 'var(--paper-2)', padding: '2px 4px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink)' }}>{filename}</code>.
        </p>
      </div>

      <div>
        <h3 style={{ fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)', fontSize: '14px' }}>3. Test the server</h3>
        <CodeBlock code={runCmd} />
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>The server communicates over stdio — it won't print anything on startup unless there's an error.</p>
      </div>

      <div>
        <h3 style={{ fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)', fontSize: '14px' }}>4. Add to Claude Desktop</h3>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
          Edit <code style={{ background: 'var(--paper-2)', padding: '2px 4px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink)' }}>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS) or <code style={{ background: 'var(--paper-2)', padding: '2px 4px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink)' }}>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows):
        </p>
        <CodeBlock code={claudeConfig} />
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>Restart Claude Desktop after saving.</p>
      </div>

      <div>
        <h3 style={{ fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)', fontSize: '14px' }}>5. Add to Cursor</h3>
        <CodeBlock code={cursorConfig} />
      </div>

      <div style={{
        background: 'var(--accent-soft)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, color: 'var(--accent)', fontFamily: 'var(--sans)' }}>Environment variables</p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--accent-deep)', fontFamily: 'var(--sans)' }}>
          If your API requires authentication, set the API key as an environment variable and update the <code style={{ background: 'rgba(41,66,255,0.1)', padding: '2px 4px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: '12px' }}>headers</code> dict in the generated code before running.
        </p>
      </div>
    </div>
  );
}

const INPUT_CLS = "field";

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

  const [savedSession, setSavedSession] = useState<{ code: string; readme: string; language: string; timestamp: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('automcp_last_generation');
      if (raw) setSavedSession(JSON.parse(raw));
    } catch {}
  }, []);

  const restoreSession = () => {
    if (!savedSession) return;
    setGeneratedCode(savedSession.code);
    setReadme(savedSession.readme);
    setLanguage(savedSession.language);
    setOutputTab('code');
    setSavedSession(null);
  };

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
        const code = msg.data?.code ?? '';
        const generatedReadme = msg.data?.readme ?? '';
        setGeneratedCode(code);
        setReadme(generatedReadme);
        setOutputTab('code');
        setOverallProgress(100);
        setCurrentAgent(msg);
        setAgentUpdates(prev => [...prev, msg]);
        setGenerating(false);
        ws.close();
        try {
          localStorage.setItem('automcp_last_generation', JSON.stringify({
            code, readme: generatedReadme, language,
            timestamp: new Date().toLocaleTimeString(),
          }));
          setSavedSession(null);
        } catch {}
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
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', padding: '40px 28px', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' as any }}>
            <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 600, letterSpacing: '-0.035em' }}>
              AutoMCP Generator
            </h1>
            <span className="eyebrow eyebrow-accent" style={{ marginBottom: 0 }}>
              Powered by IBM Granite
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
            Generate MCP server code from any API specification with real-time 8-agent AI pipeline
          </p>
        </div>

        {savedSession && !generatedCode && (
          <div style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--paper-2)',
            border: '1px solid var(--rule-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
            flexWrap: 'wrap' as any,
            gap: 12,
          }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>
              Last session from <span style={{ fontWeight: 600 }}>{savedSession.timestamp}</span> — restore your generated code?
            </p>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={restoreSession} className="btn btn-sm" style={{ background: 'var(--warn)', color: 'var(--paper)', borderColor: 'var(--warn)' }}>
                Restore
              </button>
              <button onClick={() => setSavedSession(null)} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
          {/* Left Panel */}
          <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 24 }}>
            <div className="surface" style={{ padding: 24 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>Input Configuration</h2>
              <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>Input Type</label>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>Output Language</label>
                  <select title="Output language" value={language} onChange={(e) => setLanguage(e.target.value)} className={INPUT_CLS}>
                    <option value="python">Python</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>AI Provider (Optional)</label>
                  <select title="AI provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={INPUT_CLS}>
                    <option value="watsonx">IBM Watsonx.ai</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="google">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8, fontFamily: 'var(--sans)' }}>API Key (Optional)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave empty for mock generation"
                    className={INPUT_CLS}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>Works without API key using mock responses</p>
                </div>
              </div>
            </div>

            <div className="surface" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
                  {inputType === 'url' ? 'API Docs URL' : 'API Specification'}
                </h2>
                {(inputType === 'openapi' || inputType === 'swagger' || inputType === 'text') && (
                  <button type="button" onClick={loadSample} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                    Load Sample
                  </button>
                )}
              </div>
              {inputType === 'url' && (
                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 12 }}>
                  <input type="url" value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="https://api.example.com/docs or https://petstore.swagger.io/v2/swagger.json"
                    className={INPUT_CLS} />
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>HTML docs, raw OpenAPI/Swagger JSON, or README files.</p>
                </div>
              )}
              {inputType === 'github' && (
                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 12 }}>
                  <input type="url" value={content} onChange={(e) => setContent(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className={INPUT_CLS} />
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>Auto-finds openapi.json / swagger.yaml in the repo root or /docs.</p>
                </div>
              )}
              {inputType === 'file' && (
                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 12 }}>
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
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>Upload OpenAPI 3.0 or Swagger 2.0 .json / .yaml file.</p>
                </div>
              )}
              {inputType === 'form' && (
                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 12 }}>
                  <input type="text" placeholder="API Name (e.g. Petstore API)" value={formApiName}
                    onChange={(e) => { setFormApiName(e.target.value); serializeForm(e.target.value, formBaseUrl, formEndpoints); }}
                    className={INPUT_CLS} />
                  <input type="url" placeholder="Base URL (e.g. https://api.example.com)" value={formBaseUrl}
                    onChange={(e) => { setFormBaseUrl(e.target.value); serializeForm(formApiName, e.target.value, formEndpoints); }}
                    className={INPUT_CLS} />
                  <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 8 }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 500, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>Endpoints</p>
                    {formEndpoints.map((ep, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select value={ep.method} onChange={(e) => updateEndpoint(i, 'method', e.target.value)}
                          style={{ width: 96, padding: '8px 12px', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', fontSize: '13px', fontFamily: 'var(--mono)', background: 'var(--paper)', color: 'var(--ink)' }}>
                          {['GET','POST','PUT','DELETE','PATCH'].map(m => <option key={m}>{m}</option>)}
                        </select>
                        <input type="text" placeholder="/path/{id}" value={ep.path}
                          onChange={(e) => updateEndpoint(i, 'path', e.target.value)}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', fontSize: '13px', fontFamily: 'var(--mono)', background: 'var(--paper)', color: 'var(--ink)' }} />
                        <input type="text" placeholder="Description" value={ep.description}
                          onChange={(e) => updateEndpoint(i, 'description', e.target.value)}
                          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', fontSize: '13px', fontFamily: 'var(--sans)', background: 'var(--paper)', color: 'var(--ink)' }} />
                        <button onClick={() => removeEndpoint(i)}
                          style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--err)', cursor: 'pointer', fontWeight: 'bold', padding: 4 }}>×</button>
                      </div>
                    ))}
                    <button onClick={addEndpoint} style={{ background: 'none', border: 'none', fontSize: '13px', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                      + Add Endpoint
                    </button>
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
                  style={{
                    width: '100%',
                    background: 'var(--paper)',
                    border: '1px solid var(--rule-strong)',
                    padding: '10px 12px',
                    fontFamily: 'var(--mono)',
                    fontSize: '12.5px',
                    color: 'var(--ink)',
                    borderRadius: 'var(--radius)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                    minHeight: 256,
                    lineHeight: 1.6,
                    resize: 'vertical' as any,
                  } as any}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button
                onClick={handleGenerate}
                disabled={generating || (inputType === 'form' ? (!formApiName || !formBaseUrl || formEndpoints.length === 0) : !content)}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  textAlign: 'center' as any,
                  opacity: (generating || (inputType === 'form' ? (!formApiName || !formBaseUrl || formEndpoints.length === 0) : !content)) ? 0.5 : 1,
                  cursor: (generating || (inputType === 'form' ? (!formApiName || !formBaseUrl || formEndpoints.length === 0) : !content)) ? 'not-allowed' : 'pointer',
                }}
              >
                {generating ? 'Generating...' : 'Generate MCP Server'}
              </button>
              {generating && (
                <button onClick={handleStop} className="btn" style={{ background: 'var(--err)', color: 'var(--paper)', borderColor: 'var(--err)' }}>
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 24 }}>
            {(generating || agentUpdates.length > 0) && (
              <div className="surface" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>Agent Pipeline</h2>
                  {!generating && overallProgress === 100 && (
                    <span className="eyebrow" style={{ background: 'rgba(31,122,77,0.1)', color: 'var(--ok)', padding: '4px 8px', borderRadius: 'var(--radius)', marginBottom: 0 }}>Complete</span>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                    <span>Overall Progress</span>
                    <span style={{ fontWeight: 500 }}>{Math.round(overallProgress)}%</span>
                  </div>
                  <div style={{ width: '100%', background: 'var(--paper-2)', borderRadius: 12, height: 8 }}>
                    <div
                      style={{
                        background: 'var(--accent)',
                        height: 8,
                        borderRadius: 12,
                        transition: 'width 0.5s ease',
                        width: `${overallProgress}%`,
                        animation: generating ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 0, maxHeight: 288, overflowY: 'auto' as any }} className="scroll-thin">
                  {agentUpdates.filter(u => u.agent_name !== 'Pipeline').map((update, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: index === 0 ? 'none' : '1px solid var(--rule)' }}>
                      <div style={{
                        flexShrink: 0,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold' as any,
                        marginTop: 2,
                        background: update.status === 'completed' ? 'var(--ok)' : update.status === 'error' ? 'var(--err)' : update.status === 'processing' ? 'var(--warn)' : 'var(--accent)',
                        color: 'var(--paper)',
                      }}>
                        {update.status === 'completed' ? '✓' : update.status === 'error' ? '✗' : '·'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.3, fontFamily: 'var(--sans)' }}>{update.agent_name}</p>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: '11px',
                          fontFamily: 'var(--sans)',
                          color: update.status === 'completed' ? 'var(--ok)' : update.status === 'error' ? 'var(--err)' : 'var(--warn)',
                        }}>{update.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(generatedCode || readme) && (
              <>
                <div className="surface" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)' }}>
                    <button onClick={() => setOutputTab('code')}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: 'var(--sans)',
                        background: outputTab === 'code' ? 'var(--accent-soft)' : 'none',
                        color: outputTab === 'code' ? 'var(--accent)' : 'var(--ink-3)',
                        border: 'none',
                        borderBottom: outputTab === 'code' ? '2px solid var(--accent)' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}>
                      Generated Code
                    </button>
                    <button onClick={() => setOutputTab('readme')} disabled={!readme}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        fontFamily: 'var(--sans)',
                        background: outputTab === 'readme' ? 'var(--accent-soft)' : 'none',
                        color: outputTab === 'readme' ? 'var(--accent)' : 'var(--ink-3)',
                        border: 'none',
                        borderBottom: outputTab === 'readme' ? '2px solid var(--accent)' : '2px solid transparent',
                        cursor: readme ? 'pointer' : 'not-allowed',
                        opacity: readme ? 1 : 0.4,
                        transition: 'all 0.15s ease',
                      }}>
                      README {readme && <span style={{ marginLeft: 4, fontSize: '10px', background: 'rgba(31,122,77,0.1)', color: 'var(--ok)', padding: '2px 6px', borderRadius: 3 }}>new</span>}
                    </button>
                  </div>

                  {outputTab === 'code' && generatedCode && (
                    <div style={{ padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button onClick={downloadCode} className="btn btn-sm" style={{ background: 'var(--ok)', color: 'var(--paper)', borderColor: 'var(--ok)' }}>Download</button>
                      </div>
                      <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <MonacoEditor height="500px" language={language === 'python' ? 'python' : 'typescript'}
                          value={generatedCode} theme="vs-dark"
                          options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true }} />
                      </div>
                    </div>
                  )}

                  {outputTab === 'readme' && readme && (
                    <div style={{ padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button onClick={() => {
                          const blob = new Blob([readme], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = 'README.md'; a.click();
                          URL.revokeObjectURL(url);
                        }} className="btn btn-sm" style={{ background: 'var(--ok)', color: 'var(--paper)', borderColor: 'var(--ok)' }}>Download README</button>
                      </div>
                      <pre style={{
                        whiteSpace: 'pre-wrap' as any,
                        fontSize: '13px',
                        fontFamily: 'var(--mono)',
                        background: 'var(--paper-2)',
                        padding: 16,
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'auto',
                        maxHeight: 500,
                        color: 'var(--ink-2)',
                      }}>{readme}</pre>
                    </div>
                  )}
                </div>

                <GenerationInsights agentUpdates={agentUpdates} />
                <SetupInstructions language={language} />
              </>
            )}

            {!generating && !generatedCode && (
              <div className="surface" style={{ padding: 48, textAlign: 'center' as any }}>
                <div style={{ fontSize: '48px', marginBottom: 16 }}>🤖</div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>Ready to Generate</h3>
                <p style={{ margin: 0, color: 'var(--ink-3)', fontFamily: 'var(--sans)', fontSize: '14px' }}>
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
