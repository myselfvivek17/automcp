'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { loadAgentConfigs } from '@/lib/agent-config';
import { getProviderStatus, ProviderStatus } from '@/lib/api';
import { AgentTimeline } from '@/components/AgentTimeline';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface AgentUpdate {
  agent_name: string;
  status: string;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- backend shape not yet stable
  progress: number;
  message: string;
  timestamp: string;
}

const AGENT_ORDER: Record<string, number> = {
  'Input Parser': 0, 'Schema Extractor': 1, 'Endpoint Mapper': 2, 'Auth Analyzer': 3,
  'MCP Translator': 4, 'Code Generator': 5, 'Validator': 6, 'Docs Generator': 7,
};
const TOTAL_AGENTS = 8;

const INPUT_TYPES = [
  { v: 'openapi', label: 'OpenAPI 3.0' },
  { v: 'swagger', label: 'Swagger 2.0' },
  { v: 'url',     label: 'Docs URL' },
  { v: 'github',  label: 'GitHub repo' },
  { v: 'file',    label: 'Upload' },
  { v: 'text',    label: 'Plain prose' },
  { v: 'form',    label: 'Manual entry' },
];

const SAMPLE_OPENAPI = `{
  "openapi": "3.0.0",
  "info": { "title": "Acme API", "version": "1.0.0" },
  "servers": [{ "url": "https://api.acme.dev/v1" }],
  "paths": {
    "/users": {
      "get":  { "summary": "List users" },
      "post": { "summary": "Create user" }
    },
    "/users/{id}": {
      "get":    { "summary": "Get user by ID" },
      "put":    { "summary": "Update user" },
      "delete": { "summary": "Delete user" }
    }
  }
}`;

function calcOverallProgress(agentName: string, agentProgress: number): number {
  const slot = AGENT_ORDER[agentName] ?? 0;
  return Math.round(((slot + agentProgress) / TOTAL_AGENTS) * 100);
}

function Panel({ title, hint, right, children }: { title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="surface" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
          <h3 className="serif" style={{ margin: 0, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--ink)', whiteSpace: 'nowrap', fontWeight: 600 }}>
            {title}
          </h3>
          {hint && <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-mute)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>· {hint}</span>}
        </div>
        {right}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        {hint && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {options.map((o, i) => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          flex: 1, padding: '8px 10px',
          background: value === o.v ? 'var(--ink)' : 'transparent',
          color: value === o.v ? 'var(--paper)' : 'var(--ink-2)',
          border: 0, borderLeft: i ? '1px solid var(--rule-strong)' : 0,
          fontSize: 12.5, fontWeight: 500, fontFamily: 'var(--sans)',
          cursor: 'pointer',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function SegmentedSmall({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', overflow: 'hidden', height: 28 }}>
      {options.map((o, i) => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          padding: '4px 12px',
          background: value === o.v ? 'var(--ink)' : 'transparent',
          color: value === o.v ? 'var(--paper)' : 'var(--ink-2)',
          border: 0, borderLeft: i ? '1px solid var(--rule-strong)' : 0,
          fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--sans)',
          cursor: 'pointer',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function SetupBlock({ language }: { language: string }) {
  const ext = language === 'python' ? 'py' : 'ts';
  const cmd = language === 'python' ? 'python' : 'npx ts-node';
  const config = `{
  "mcpServers": {
    "my-api": {
      "command": "${cmd}",
      "args": ["/abs/path/to/mcp_server.${ext}"]
    }
  }
}`;
  const steps = [
    { n: '1', title: 'Install', code: language === 'python' ? '$ pip install mcp requests' : '$ npm install @modelcontextprotocol/sdk node-fetch' },
    { n: '2', title: `Add to claude_desktop_config.json`, code: config },
    { n: '3', title: 'Restart your client', note: `Tools appear automatically. Set your API key in your environment to enable live calls.` },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {steps.map(s => (
        <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 12, alignItems: 'start' }}>
          <span className="serif" style={{ fontSize: 22, color: 'var(--accent)', lineHeight: 1.2 }}>{s.n}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>{s.title}</div>
            {s.code && (
              <pre className="mono" style={{ margin: 0, background: 'var(--ink)', color: 'var(--paper)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 11.5, lineHeight: 1.6, overflowX: 'auto' }}>
                {s.code}
              </pre>
            )}
            {s.note && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GeneratePage() {
  const [inputType, setInputType] = useState('openapi');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('python');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    openai: false, anthropic: false, google: false, openrouter: false, watsonx: false,
  });

  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [readme, setReadme] = useState('');
  const [agentUpdates, setAgentUpdates] = useState<AgentUpdate[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [outputTab, setOutputTab] = useState<'code' | 'readme' | 'tools'>('code');
  const [done, setDone] = useState(false);
  const [logLines, setLogLines] = useState<{ ts: string; agentNum: string; line: string; kind: 'run' | 'ok' | 'sub' | 'err'; id: number }[]>([]);

  // Manual form state
  const [formApiName, setFormApiName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formEndpoints, setFormEndpoints] = useState([{ id: 0, method: 'GET', path: '/items', description: 'List all items' }]);
  const endpointIdRef = useRef(1);

  const [savedSession, setSavedSession] = useState<{ code: string; readme: string; language: string; timestamp: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('automcp_last_generation');
      if (raw) setSavedSession(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    getProviderStatus().then(setProviderStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  const pushLog = (agentNum: string, line: string, kind: 'run' | 'ok' | 'sub' | 'err') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogLines(prev => [...prev, { ts, agentNum, line, kind, id: prev.length }]);
  };

  const agentNumFor = (name: string) => String(AGENT_ORDER[name] + 1).padStart(2, '0');

  const activeIndex = (() => {
    if (!generating) return -1;
    const running = agentUpdates.filter(u => u.status === 'processing' || u.status === 'started');
    if (running.length === 0) return -1;
    const last = running[running.length - 1];
    return AGENT_ORDER[last.agent_name] ?? -1;
  })();

  const completedIndices = agentUpdates
    .filter(u => u.status === 'completed' && u.agent_name !== 'Pipeline')
    .map(u => AGENT_ORDER[u.agent_name])
    .filter(i => i !== undefined);

  const endpointCount = agentUpdates.find(u => u.agent_name === 'Schema Extractor' && u.status === 'completed')?.data?.endpoints?.length ?? 0;
  const toolCount = agentUpdates.find(u => u.agent_name === 'Endpoint Mapper' && u.status === 'completed')?.data?.tool_count ?? 0;
  const tools: any[] = agentUpdates.find(u => u.agent_name === 'Endpoint Mapper' && u.status === 'completed')?.data?.mcp_tools ?? [];
  const endpoints: any[] = agentUpdates.find(u => u.agent_name === 'Schema Extractor' && u.status === 'completed')?.data?.endpoints ?? [];

  const handleGenerate = () => {
    setGenerating(true);
    setDone(false);
    setAgentUpdates([]);
    setGeneratedCode('');
    setReadme('');
    setLogLines([]);
    setOverallProgress(0);

    pushLog('--', 'pipeline starting · websocket open', 'sub');

    const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + '/api/simple/generate/stream';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      const agentConfigs = loadAgentConfigs();
      const payload: any = { input_type: inputType, content, language, agent_configs: agentConfigs };
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      let msg: AgentUpdate;
      try {
        msg = JSON.parse(event.data) as AgentUpdate;
      } catch {
        pushLog('--', 'malformed message from server', 'err');
        return;
      }

      if (msg.agent_name === 'Pipeline' && msg.status === 'completed') {
        const code = msg.data?.code ?? '';
        const generatedReadme = msg.data?.readme ?? '';
        setGeneratedCode(code);
        setReadme(generatedReadme);
        setOutputTab('code');
        setAgentUpdates(prev => [...prev, msg]);
        setGenerating(false);
        setDone(true);
        setOverallProgress(100);
        pushLog('--', 'pipeline complete · all agents done', 'ok');
        ws.close();
        try {
          localStorage.setItem('automcp_last_generation', JSON.stringify({
            code, readme: generatedReadme, language, timestamp: new Date().toLocaleTimeString(),
          }));
          setSavedSession(null);
        } catch {}
        return;
      }

      if (msg.status === 'error') {
        pushLog(agentNumFor(msg.agent_name), `${msg.agent_name} failed: ${msg.message}`, 'err');
        setAgentUpdates(prev => [...prev, msg]);
        setGenerating(false);
        ws.close();
        return;
      }

      if (msg.status === 'processing' || msg.status === 'started') {
        pushLog(agentNumFor(msg.agent_name), `${msg.agent_name} · started`, 'run');
      } else if (msg.status === 'completed') {
        pushLog(agentNumFor(msg.agent_name), `${msg.agent_name} · completed`, 'ok');
        if (msg.message) pushLog(agentNumFor(msg.agent_name), msg.message, 'sub');
      } else if (msg.message) {
        pushLog(agentNumFor(msg.agent_name), msg.message, 'sub');
      }

      setAgentUpdates(prev => [...prev, msg]);
      setOverallProgress(prev => Math.max(prev, calcOverallProgress(msg.agent_name, msg.progress)));
    };

    ws.onerror = () => {
      pushLog('--', 'websocket error — is the backend running?', 'err');
      setGenerating(false);
    };

    ws.onclose = () => setGenerating(false);
  };

  const handleStop = () => {
    if (wsRef.current) wsRef.current.close();
    setGenerating(false);
    pushLog('--', 'stopped by user', 'err');
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

  const downloadReadme = () => {
    const blob = new Blob([readme], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'README.md'; a.click();
    URL.revokeObjectURL(url);
  };

  const serializeForm = (name: string, baseUrl: string, eps: typeof formEndpoints) => {
    setContent(JSON.stringify({ api_name: name, base_url: baseUrl, endpoints: eps }));
  };

  const addEndpoint = () => {
    const updated = [...formEndpoints, { id: endpointIdRef.current++, method: 'GET', path: '/endpoint', description: '' }];
    setFormEndpoints(updated);
    serializeForm(formApiName, formBaseUrl, updated);
  };

  const removeEndpoint = (id: number) => {
    const updated = formEndpoints.filter(ep => ep.id !== id);
    setFormEndpoints(updated);
    serializeForm(formApiName, formBaseUrl, updated);
  };

  const updateEndpoint = (id: number, field: string, value: string) => {
    const updated = formEndpoints.map(ep => ep.id === id ? { ...ep, [field]: value } : ep);
    setFormEndpoints(updated);
    serializeForm(formApiName, formBaseUrl, updated);
  };

  const isFormReady = inputType === 'form'
    ? (formApiName.trim() !== '' && formBaseUrl.trim() !== '' && formEndpoints.length > 0)
    : content.trim() !== '';

  const anyProvider = Object.values(providerStatus).some(Boolean);

  return (
    <div style={{ background: 'var(--paper)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--rule)', padding: '40px 28px 28px', background: 'var(--paper-2)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 14 }}>Generator</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(36px, 4.4vw, 56px)', lineHeight: 1, letterSpacing: '-0.04em' }}>
              New MCP server <span className="serif-i" style={{ color: 'var(--ink-3)' }}>from spec.</span>
            </h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {anyProvider ? (
                (['openrouter', 'openai', 'anthropic', 'watsonx', 'google'] as const).filter(p => providerStatus[p]).map(p => (
                  <span key={p} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 999,
                    color: 'var(--ok)', border: '1px solid var(--ok)',
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', display: 'inline-block' }} />
                    {p}
                  </span>
                ))
              ) : (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
                  no keys set · <a href="/settings" style={{ color: 'var(--accent)' }}>add in Agents</a>
                </span>
              )}
              {done && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 999,
                  color: 'var(--ok)', border: '1px solid var(--ok)',
                }}>✓ ready</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '28px' }}>

        {/* Restored session banner */}
        {savedSession && !generatedCode && (
          <div style={{
            marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--paper-2)', border: '1px solid var(--rule-strong)',
            borderRadius: 'var(--radius)', padding: '10px 16px', flexWrap: 'wrap', gap: 10,
          }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
              last session · {savedSession.timestamp}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                setGeneratedCode(savedSession.code);
                setReadme(savedSession.readme);
                setLanguage(savedSession.language);
                setDone(true);
                setSavedSession(null);
              }} className="btn btn-sm" style={{ background: 'var(--warn)', color: 'var(--paper)', borderColor: 'var(--warn)' }}>Restore</button>
              <button onClick={() => setSavedSession(null)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'var(--sans)' }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Pipeline strip */}
        <div className="surface" style={{
          padding: '20px 22px 16px', marginBottom: 28,
          background: generating ? 'var(--paper)' : 'var(--paper-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="eyebrow" style={{ color: generating ? 'var(--accent)' : done ? 'var(--ok)' : 'var(--ink-3)' }}>
              {generating ? '● live · websocket open' : done ? '✓ complete' : '○ idle · waiting for input'}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
              {completedIndices.length}/{TOTAL_AGENTS} agents · {Math.round((completedIndices.length / TOTAL_AGENTS) * 100)}%
            </div>
          </div>
          <AgentTimeline activeIndex={activeIndex} completed={completedIndices} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 380px) minmax(0, 1fr)', gap: 28 }}>

          {/* LEFT — input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <Panel title="Input">
              <Field label="Source">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {INPUT_TYPES.map(t => (
                    <button key={t.v} onClick={() => setInputType(t.v)} style={{
                      textAlign: 'left', padding: '8px 10px',
                      background: inputType === t.v ? 'var(--ink)' : 'transparent',
                      color: inputType === t.v ? 'var(--paper)' : 'var(--ink-2)',
                      border: `1px solid ${inputType === t.v ? 'var(--ink)' : 'var(--rule-strong)'}`,
                      borderRadius: 'var(--radius)', fontFamily: 'var(--mono)', fontSize: 11.5,
                      cursor: 'pointer',
                    }}>{t.label}</button>
                  ))}
                </div>
              </Field>

              <Field label="Specification" hint={inputType === 'url' ? 'paste URL' : inputType === 'github' ? 'repo URL' : inputType === 'file' ? 'upload file' : 'paste / type below'}>
                {(inputType === 'openapi' || inputType === 'swagger' || inputType === 'text') && (
                  <>
                    <textarea
                      className="field"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={12}
                      spellCheck={false}
                      placeholder={
                        inputType === 'openapi' ? 'Paste OpenAPI 3.0 JSON here…' :
                        inputType === 'swagger' ? 'Paste Swagger 2.0 JSON here…' :
                        'Describe your API, e.g.:\n\nBase URL: https://api.example.com\n\nGET /users — list all users\nPOST /users — create a user'
                      }
                      style={{ minHeight: 200 }}
                    />
                    <button onClick={() => { setInputType('openapi'); setContent(SAMPLE_OPENAPI); }}
                      className="mono" style={{
                        background: 'transparent', border: 0, padding: 0,
                        color: 'var(--accent)', fontSize: 11, letterSpacing: '0.04em',
                        textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer',
                        alignSelf: 'flex-start',
                      }}>
                      load sample (acme api)
                    </button>
                  </>
                )}
                {inputType === 'url' && (
                  <input type="url" className="field" value={content} onChange={e => setContent(e.target.value)}
                    placeholder="https://api.example.com/docs" aria-label="API documentation URL" />
                )}
                {inputType === 'github' && (
                  <input type="url" className="field" value={content} onChange={e => setContent(e.target.value)}
                    placeholder="https://github.com/owner/repo" aria-label="GitHub repository URL" />
                )}
                {inputType === 'file' && (
                  <input type="file" accept=".json,.yaml,.yml" className="field"
                    aria-label="Upload API specification file"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const text = ev.target?.result as string;
                        setContent(text);
                        try {
                          setInputType(JSON.parse(text).swagger ? 'swagger' : 'openapi');
                        } catch { setInputType('openapi'); }
                      };
                      reader.readAsText(file);
                    }} />
                )}
                {inputType === 'form' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input type="text" className="field" placeholder="API Name (e.g. Petstore API)" value={formApiName}
                      onChange={e => { setFormApiName(e.target.value); serializeForm(e.target.value, formBaseUrl, formEndpoints); }}
                      aria-label="API Name" />
                    <input type="url" className="field" placeholder="Base URL (e.g. https://api.example.com)" value={formBaseUrl}
                      onChange={e => { setFormBaseUrl(e.target.value); serializeForm(formApiName, e.target.value, formEndpoints); }}
                      aria-label="API Base URL" />
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Endpoints</span>
                    {formEndpoints.map((ep, i) => (
                      <div key={ep.id} style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}>
                        <select value={ep.method} onChange={e => updateEndpoint(ep.id, 'method', e.target.value)} aria-label={`HTTP method ${i + 1}`}
                          style={{ width: 90, flexShrink: 0, padding: '8px 4px', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', fontSize: 12, fontFamily: 'var(--mono)', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box' }}>
                          {['GET','POST','PUT','DELETE','PATCH'].map(m => <option key={m}>{m}</option>)}
                        </select>
                        <input type="text" placeholder="/path/{id}" value={ep.path}
                          onChange={e => updateEndpoint(ep.id, 'path', e.target.value)} aria-label={`Path ${i + 1}`}
                          style={{ flex: '1 1 0', minWidth: 0, padding: '8px 10px', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', fontSize: 12, fontFamily: 'var(--mono)', background: 'var(--paper)', color: 'var(--ink)' }} />
                        <input type="text" placeholder="Description" value={ep.description}
                          onChange={e => updateEndpoint(ep.id, 'description', e.target.value)} aria-label={`Description ${i + 1}`}
                          style={{ flex: '1 1 0', minWidth: 0, padding: '8px 10px', border: '1px solid var(--rule-strong)', borderRadius: 'var(--radius)', fontSize: 12, fontFamily: 'var(--sans)', background: 'var(--paper)', color: 'var(--ink)' }} />
                        <button type="button" onClick={() => removeEndpoint(ep.id)}
                          style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--err)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                    <button type="button" onClick={addEndpoint} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--sans)', alignSelf: 'flex-start', padding: 0 }}>
                      + Add endpoint
                    </button>
                  </div>
                )}
              </Field>
            </Panel>

            <Panel title="Output">
              <Field label="Language">
                <Segmented value={language} onChange={setLanguage} options={[
                  { v: 'python', label: 'Python' },
                  { v: 'typescript', label: 'TypeScript' },
                ]} />
              </Field>
            </Panel>

            <div style={{ display: 'flex', gap: 10 }}>
              {!generating ? (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!isFormReady}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '14px 18px', opacity: isFormReady ? 1 : 0.5, cursor: isFormReady ? 'pointer' : 'not-allowed' }}
                >
                  {done ? 'Run again' : 'Generate MCP server'} <span style={{ marginLeft: 4 }}>→</span>
                </button>
              ) : (
                <button type="button" onClick={handleStop} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '14px 18px', borderColor: 'var(--err)', color: 'var(--err)' }}>
                  ■ Stop
                </button>
              )}
            </div>
          </div>

          {/* RIGHT — console + output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

            <Panel title="Console" hint={generating ? 'streaming' : done ? 'last run' : 'idle'}>
              <div
                ref={logRef}
                className="mono scroll-thin"
                style={{
                  background: '#1a1814', color: '#e8e6e3',
                  borderRadius: 'var(--radius)', padding: '14px 16px',
                  fontSize: 11.5, lineHeight: 1.7,
                  height: 240, overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {logLines.length === 0 && (
                  <span style={{ color: 'rgba(232,230,227,0.35)' }}>
                    $ awaiting input · click <span style={{ color: 'var(--accent)' }}>generate</span> to start
                  </span>
                )}
                {logLines.map(l => (
                  <div key={l.id} style={{
                    display: 'flex', gap: 12,
                    color: l.kind === 'ok' ? '#7be8a3' : l.kind === 'err' ? '#e26a60' : l.kind === 'sub' ? 'rgba(244,240,230,.6)' : '#e8e6e3',
                    animation: 'fade-up 220ms ease-out',
                  }}>
                    <span style={{ color: 'rgba(232,230,227,0.35)', flexShrink: 0, minWidth: 60 }}>{l.ts}</span>
                    <span style={{ color: 'var(--accent)', width: 22, flexShrink: 0 }}>{l.agentNum}</span>
                    <span style={{ minWidth: 0, wordBreak: 'break-word' }}>
                      {l.kind === 'ok' && '✓ '}
                      {l.kind === 'run' && '● '}
                      {l.kind === 'sub' && '· '}
                      {l.kind === 'err' && '✗ '}
                      {l.line}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            {done && (generatedCode || readme) && (
              <>
                <Panel
                  title="Generated server"
                  hint={`mcp_server.${language === 'python' ? 'py' : 'ts'}`}
                  right={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <SegmentedSmall value={outputTab} onChange={v => setOutputTab(v as any)} options={[
                        { v: 'code', label: 'Code' },
                        { v: 'readme', label: 'README' },
                        { v: 'tools', label: 'Tools' },
                      ]} />
                      <button className="btn btn-ghost btn-sm" onClick={outputTab === 'readme' ? downloadReadme : downloadCode}>Download</button>
                    </div>
                  }
                >
                  {outputTab === 'code' && generatedCode && (
                    <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      <MonacoEditor
                        height="420px"
                        language={language === 'python' ? 'python' : 'typescript'}
                        value={generatedCode}
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true }}
                      />
                    </div>
                  )}
                  {outputTab === 'readme' && readme && (
                    <pre className="mono scroll-thin" style={{
                      margin: 0, background: 'var(--paper-2)', color: 'var(--ink-2)',
                      padding: '18px 20px', borderRadius: 'var(--radius)',
                      fontSize: 12, lineHeight: 1.7, maxHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap',
                      border: '1px solid var(--rule)',
                    }}>{readme}</pre>
                  )}
                  {outputTab === 'tools' && (
                    <div>
                      {endpointCount > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                            Endpoints · {endpointCount}
                          </div>
                          <div style={{ borderTop: '1px solid var(--rule)' }}>
                            {endpoints.map((ep: any, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
                                <span className={`method method-${ep.method}`}>{ep.method}</span>
                                <code className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{ep.path}</code>
                                {ep.summary && <span style={{ fontSize: 11, color: 'var(--ink-mute)', flex: 1 }}>— {ep.summary}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {toolCount > 0 && (
                        <div>
                          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                            MCP Tools · {toolCount}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {tools.map((t: any, i: number) => (
                              <span key={i} style={{ padding: '3px 10px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 'var(--radius)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {endpointCount === 0 && toolCount === 0 && (
                        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-mute)', margin: 0 }}>No tool data available.</p>
                      )}
                    </div>
                  )}
                </Panel>

                <Panel title="Wire it up" hint="claude desktop · cursor">
                  <SetupBlock language={language} />
                </Panel>
              </>
            )}

            {!done && !generating && (
              <div className="surface" style={{ padding: '64px 28px', textAlign: 'center', borderStyle: 'dashed', background: 'var(--paper-2)' }}>
                <div className="serif" style={{ fontSize: 32, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '-0.035em', fontWeight: 500 }}>
                  Output appears <span className="serif-i">here</span>.
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>
                  Configure the input on the left and start a generation.
                </p>
              </div>
            )}

            {!done && generating && (
              <div className="surface" style={{ padding: '64px 28px', textAlign: 'center', borderStyle: 'dashed', background: 'var(--paper-2)' }}>
                <div className="serif" style={{ fontSize: 32, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '-0.035em', fontWeight: 500 }}>
                  Running the pipeline<span className="serif-i">…</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-mute)', fontFamily: 'var(--sans)' }}>
                  Each agent finishes in roughly 1–10 seconds depending on the model.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
