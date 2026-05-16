'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AgentConfigs, AgentName, AgentConfig,
  AGENT_DESCRIPTIONS, MODELS_BY_PROVIDER, DEFAULT_CONFIGS,
  loadAgentConfigs, saveAgentConfigs,
} from '@/lib/agent-config';
import { saveProviderKey, getProviderStatus, ProviderStatus, SaveKeyPayload } from '@/lib/api';

const AGENT_ORDER: AgentName[] = [
  'Input Parser', 'Schema Extractor', 'Endpoint Mapper', 'Auth Analyzer',
  'MCP Translator', 'Code Generator', 'Validator', 'Docs Generator',
];

const AGENT_NUMS: Record<AgentName, string> = {
  'Input Parser': '01', 'Schema Extractor': '02', 'Endpoint Mapper': '03', 'Auth Analyzer': '04',
  'MCP Translator': '05', 'Code Generator': '06', 'Validator': '07', 'Docs Generator': '08',
};

const PROVIDERS = [
  { value: 'watsonx',    label: 'IBM watsonx.ai' },
  { value: 'openai',     label: 'OpenAI' },
  { value: 'anthropic',  label: 'Anthropic' },
  { value: 'google',     label: 'Google' },
  { value: 'openrouter', label: 'OpenRouter' },
];

const PROVIDER_PRESETS: Array<{ provider: string; label: string; name: string; desc: string; model: string }> = [
  { provider: 'openrouter', label: 'OpenRouter',    name: 'Free tier',       desc: 'NVIDIA Nemotron 3 Super · zero cost',       model: 'nvidia/nemotron-3-super-120b-a12b:free' },
  { provider: 'openai',     label: 'OpenAI',        name: 'GPT-4o',          desc: 'Best general reasoning',                    model: 'gpt-4o' },
  { provider: 'anthropic',  label: 'Anthropic',     name: 'Claude Sonnet',   desc: 'Balanced capability + long context',        model: 'claude-sonnet-4-6' },
  { provider: 'watsonx',    label: 'IBM Watsonx',   name: 'Granite fast',    desc: 'All Granite-4H · cheapest path',            model: 'ibm/granite-4-h-small' },
];

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AgentConfigs>(DEFAULT_CONFIGS);
  const [saved, setSaved] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    openai: false, anthropic: false, google: false, openrouter: false, watsonx: false,
  });
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});
  const [keySaved, setKeySaved] = useState<Record<string, boolean>>({});
  const [keyError, setKeyError] = useState<Record<string, string>>({});
  const [customModelMode, setCustomModelMode] = useState<Record<string, boolean>>({});
  const [keysExpanded, setKeysExpanded] = useState(true);

  useEffect(() => { setConfigs(loadAgentConfigs()); }, []);
  useEffect(() => { getProviderStatus().then(setProviderStatus).catch(() => {}); }, []);

  const updateAgent = (name: AgentName, field: keyof AgentConfig, value: string) => {
    setConfigs(prev => {
      const updated = { ...prev, [name]: { ...prev[name], [field]: value } };
      if (field === 'provider') {
        const models = MODELS_BY_PROVIDER[value] ?? [];
        updated[name] = { ...updated[name], model: models[0] ?? '' };
        setCustomModelMode(prev => ({ ...prev, [name]: false }));
      }
      return updated;
    });
    setActivePreset(null);
    setSaved(false);
  };

  const applyPreset = (provider: string, model: string) => {
    setActivePreset(provider);
    const updated = { ...configs };
    for (const name of AGENT_ORDER) {
      updated[name] = { provider, model };
    }
    setConfigs(updated);
    setSaved(false);
  };

  const handleSave = () => {
    saveAgentConfigs(configs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = { ...DEFAULT_CONFIGS };
    setConfigs(defaults);
    saveAgentConfigs(defaults);
    setActivePreset(null);
  };

  const handleSaveKey = async (provider: string) => {
    const key = keyInputs[provider] ?? '';
    if (!key) return;
    setKeySaving(prev => ({ ...prev, [provider]: true }));
    setKeyError(prev => ({ ...prev, [provider]: '' }));
    try {
      const payload: SaveKeyPayload = { provider, key };
      if (provider === 'watsonx') {
        payload.project_id = keyInputs['watsonx_project_id'] ?? '';
        payload.url = keyInputs['watsonx_url'] ?? '';
      }
      await saveProviderKey(payload);
      const status = await getProviderStatus();
      setProviderStatus(status);
      setKeySaved(prev => ({ ...prev, [provider]: true }));
      setKeyInputs(prev => {
        const next = { ...prev, [provider]: '' };
        if (provider === 'watsonx') { delete next['watsonx_project_id']; delete next['watsonx_url']; }
        return next;
      });
      setTimeout(() => setKeySaved(prev => ({ ...prev, [provider]: false })), 2000);
    } catch {
      setKeyError(prev => ({ ...prev, [provider]: `Could not save — check the key and try again.` }));
    } finally {
      setKeySaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  return (
    <div style={{ background: 'var(--paper)', minHeight: 'calc(100vh - 60px)' }}>
      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--rule)', padding: '40px 28px 28px', background: 'var(--paper-2)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 14 }}>Agent configuration</div>
          <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(36px, 4.4vw, 56px)', lineHeight: 1, letterSpacing: '-0.04em' }}>
            Per-agent <span className="serif-i" style={{ color: 'var(--ink-3)' }}>model routing.</span>
          </h1>
          <p style={{ margin: '14px 0 0', maxWidth: 620, fontSize: 15, lineHeight: 1.55, color: 'var(--ink-3)' }}>
            Each pipeline stage is independently routable. Mix providers — Granite for cheap structural work,
            Claude for codegen, anything else for QA. Settings persist in your browser.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 28px' }}>

        {/* Provider API Keys — collapsible, shown first so presets below make sense */}
        <section className="surface" style={{ padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 20, letterSpacing: '-0.03em', fontWeight: 600 }}>
                Provider API Keys
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['openrouter', 'openai', 'anthropic', 'watsonx'] as const).map(p => (
                  <span key={p} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: providerStatus[p] ? 'var(--ok)' : 'var(--rule-strong)',
                    display: 'inline-block',
                  }} title={`${p}: ${providerStatus[p] ? 'configured' : 'not set'}`} />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setKeysExpanded(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
                {keysExpanded ? 'collapse ▲' : 'expand ▼'}
              </span>
            </button>
          </div>

          {keysExpanded && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
              <p className="mono" style={{ margin: 0, fontSize: 10.5, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
                KEYS ARE STORED IN THE BACKEND .ENV FILE — NEVER IN YOUR BROWSER
              </p>
              {(['openrouter', 'openai', 'anthropic', 'watsonx'] as const).map(prov => (
                <div key={prov}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: providerStatus[prov] ? 'var(--ok)' : 'var(--ink-mute)',
                    }} />
                    <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {prov === 'openrouter' ? 'OpenRouter' : prov === 'openai' ? 'OpenAI' : prov === 'anthropic' ? 'Anthropic' : 'IBM Watsonx.ai'}
                      {providerStatus[prov] && <span style={{ color: 'var(--ok)', marginLeft: 6, fontWeight: 400 }}> configured</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="password"
                      value={keyInputs[prov] ?? ''}
                      onChange={e => setKeyInputs(prev => ({ ...prev, [prov]: e.target.value }))}
                      placeholder={prov === 'openrouter' ? 'sk-or-…' : prov === 'openai' ? 'sk-…' : prov === 'anthropic' ? 'sk-ant-…' : 'IBM API key'}
                      className="field"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveKey(prov)}
                      className="btn btn-sm"
                      disabled={keySaving[prov] || !keyInputs[prov]}
                      style={{
                        flexShrink: 0,
                        background: keySaved[prov] ? 'var(--ok)' : undefined,
                        color: keySaved[prov] ? 'var(--paper)' : undefined,
                        borderColor: keySaved[prov] ? 'var(--ok)' : undefined,
                      }}
                    >
                      {keySaved[prov] ? '✓ Saved' : keySaving[prov] ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  {keyError[prov] && (
                    <p className="mono" style={{ margin: '4px 0 0', fontSize: 10.5, color: 'var(--err)' }}>{keyError[prov]}</p>
                  )}
                  {prov === 'watsonx' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="text"
                        value={keyInputs['watsonx_project_id'] ?? ''}
                        onChange={e => setKeyInputs(prev => ({ ...prev, watsonx_project_id: e.target.value }))}
                        placeholder="Project ID (required)"
                        className="field"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={keyInputs['watsonx_url'] ?? ''}
                        onChange={e => setKeyInputs(prev => ({ ...prev, watsonx_url: e.target.value }))}
                        placeholder="URL (optional)"
                        className="field"
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick presets — below keys so "configure a key below" is spatially correct */}
        <section className="surface" style={{ padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 16, flexWrap: 'wrap' }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 20, letterSpacing: '-0.03em', whiteSpace: 'nowrap', fontWeight: 600 }}>
              Quick presets
            </h2>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
              applies to all 8 agents · only configured providers shown
            </span>
          </div>

          {PROVIDER_PRESETS.filter(p => providerStatus[p.provider as keyof ProviderStatus]).length === 0 ? (
            <p className="mono" style={{ margin: 0, fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
              No providers configured yet. Add an API key in the section above to unlock presets.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
              {PROVIDER_PRESETS.filter(p => providerStatus[p.provider as keyof ProviderStatus]).map(p => {
                const isActive = activePreset === p.provider;
                return (
                  <button type="button" key={p.provider} onClick={() => applyPreset(p.provider, p.model)} style={{
                    textAlign: 'left', padding: '14px 16px',
                    background: isActive ? 'var(--ink)' : 'transparent',
                    color: isActive ? 'var(--paper)' : 'var(--ink)',
                    border: `1px solid ${isActive ? 'var(--ink)' : 'var(--rule-strong)'}`,
                    borderRadius: 'var(--radius)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    cursor: 'pointer',
                  }}>
                    <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6 }}>{p.label}</div>
                    <div className="serif" style={{ fontSize: 17, letterSpacing: '-0.03em', fontWeight: 600 }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '0.03em', opacity: 0.65 }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Per-agent table */}
        <section style={{ background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '52px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.4fr)',
            gap: 16, padding: '10px 22px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--paper-2)',
          }}>
            {['#', 'Agent', 'Provider', 'Model'].map((h, i) => (
              <div key={i} className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {h}
              </div>
            ))}
          </div>

          {AGENT_ORDER.map((name, i) => {
            const config = configs[name];
            const models = MODELS_BY_PROVIDER[config.provider] ?? [];
            const isCustom = customModelMode[name] || (config.model !== '' && !models.includes(config.model));

            return (
              <div key={name} style={{
                display: 'grid',
                gridTemplateColumns: '52px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.4fr)',
                gap: 16, padding: '14px 22px', alignItems: 'center',
                borderBottom: i === AGENT_ORDER.length - 1 ? 0 : '1px solid var(--rule)',
              }}>
                {/* Agent number */}
                <div className="serif" style={{ fontSize: 26, color: 'var(--accent)', letterSpacing: '-0.01em', lineHeight: 1 }}>
                  {AGENT_NUMS[name]}
                </div>

                {/* Agent name + desc */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>{name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.4, fontFamily: 'var(--sans)' }}>
                    {AGENT_DESCRIPTIONS[name]}
                  </div>
                </div>

                {/* Provider select */}
                <select
                  aria-label={`Provider for ${name}`}
                  value={config.provider}
                  onChange={e => updateAgent(name, 'provider', e.target.value)}
                  className="field"
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                {/* Model select or custom input */}
                {isCustom ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={config.model}
                      onChange={e => updateAgent(name, 'model', e.target.value)}
                      placeholder="e.g. openai/gpt-4o-mini"
                      className="field"
                      style={{ flex: 1 }}
                      aria-label={`Custom model for ${name}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomModelMode(prev => ({ ...prev, [name]: false }));
                        updateAgent(name, 'model', models[0] ?? '');
                      }}
                      className="btn btn-sm btn-ghost"
                      style={{ flexShrink: 0, fontSize: 11 }}
                    >
                      Presets
                    </button>
                  </div>
                ) : (
                  <select
                    aria-label={`Model for ${name}`}
                    value={config.model}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setCustomModelMode(prev => ({ ...prev, [name]: true }));
                      } else {
                        updateAgent(name, 'model', e.target.value);
                      }
                    }}
                    className="field"
                  >
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                    <option value="__custom__">Enter custom model…</option>
                  </select>
                )}
              </div>
            );
          })}
        </section>

        {/* Save / Reset */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, alignItems: 'center' }}>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            style={{
              padding: '12px 18px',
              background: saved ? 'var(--ok)' : undefined,
              borderColor: saved ? 'var(--ok)' : undefined,
            }}
          >
            {saved ? '✓ Saved' : 'Save configuration'}
          </button>
          <button onClick={handleReset} className="btn btn-ghost">Reset to defaults</button>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
            stored locally · sent on each generation
          </span>
        </div>
      </div>
    </div>
  );
}
