'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AgentConfigs,
  AgentName,
  AgentConfig,
  AGENT_DESCRIPTIONS,
  MODELS_BY_PROVIDER,
  DEFAULT_CONFIGS,
  PRESETS,
  loadAgentConfigs,
  saveAgentConfigs,
} from '@/lib/agent-config';

const AGENT_ORDER: AgentName[] = [
  'Input Parser',
  'Schema Extractor',
  'Endpoint Mapper',
  'Auth Analyzer',
  'Code Generator',
];

const PROVIDERS = [
  { value: 'watsonx', label: 'IBM Watsonx.ai' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'google', label: 'Google Gemini' },
];

const PRESET_ICONS: Record<string, string> = {
  'Cost-Optimized': '💰',
  'Balanced': '⚖️',
  'Performance': '🚀',
};

const SELECT_CLS = "field";

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AgentConfigs>(DEFAULT_CONFIGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfigs(loadAgentConfigs());
  }, []);

  const updateAgent = (name: AgentName, field: keyof AgentConfig, value: string) => {
    setConfigs(prev => {
      const updated = { ...prev, [name]: { ...prev[name], [field]: value } };
      if (field === 'provider') {
        const models = MODELS_BY_PROVIDER[value] ?? [];
        updated[name] = { ...updated[name], model: models[0] ?? '' };
      }
      return updated;
    });
    setSaved(false);
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    const models = MODELS_BY_PROVIDER[preset.provider] ?? [];
    const model = models[Math.min(preset.modelIndex, models.length - 1)] ?? models[0];
    const updated = { ...configs };
    for (const name of AGENT_ORDER) {
      updated[name] = { ...updated[name], provider: preset.provider, model };
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
  };

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)', padding: '40px 28px', minHeight: '100vh' }}>
      <div style={{ maxWidth: 896, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap' as any, gap: 16 }}>
          <div>
            <h1 className="serif" style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 600, letterSpacing: '-0.035em' }}>
              Agent Configuration
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>
              Assign an AI model to each pipeline agent independently
            </p>
          </div>
          <Link
            href="/generate"
            style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'var(--sans)', fontWeight: 500, transition: 'color 0.15s ease', textDecoration: 'none' }}
            className="hover:text-accent-deep"
          >
            ← Back to Generator
          </Link>
        </div>

        <div className="surface" style={{ padding: 20, marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', fontFamily: 'var(--sans)' }}>Quick Presets</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as any }}>
            {Object.keys(PRESETS).map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="btn btn-sm"
                style={{ fontWeight: 500, color: 'var(--ink-2)', borderColor: 'var(--rule-strong)' }}
              >
                {PRESET_ICONS[preset]} {preset}
              </button>
            ))}
            <span style={{ fontSize: '11px', color: 'var(--ink-mute)', alignSelf: 'center', marginLeft: 8 }}>All Watsonx.ai Granite models</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as any, gap: 16, marginBottom: 24 }}>
          {AGENT_ORDER.map((name, idx) => {
            const config = configs[name];
            const models = MODELS_BY_PROVIDER[config.provider] ?? [];
            return (
              <div key={name} className="surface" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <span style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    background: 'var(--accent)',
                    color: 'var(--paper)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold' as any,
                  }}>{idx + 1}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>{name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--sans)' }}>{AGENT_DESCRIPTIONS[name]}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--sans)' }}>Provider</label>
                    <select
                      value={config.provider}
                      onChange={e => updateAgent(name, 'provider', e.target.value)}
                      className={SELECT_CLS}
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--sans)' }}>Model</label>
                    <select
                      value={config.model}
                      onChange={e => updateAgent(name, 'model', e.target.value)}
                      className={SELECT_CLS}
                    >
                      {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--ink-3)', marginBottom: 6, fontFamily: 'var(--sans)' }}>
                      API Key Override{' '}
                      <span style={{ fontWeight: 'normal', color: 'var(--ink-mute)' }}>(optional — falls back to global key)</span>
                    </label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={e => updateAgent(name, 'apiKey', e.target.value)}
                      placeholder="Leave empty to use the global API key"
                      className={SELECT_CLS}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSave}
            className="btn"
            style={{
              flex: 1,
              textAlign: 'center' as any,
              background: saved ? 'var(--ok)' : 'var(--accent)',
              color: 'var(--paper)',
              borderColor: saved ? 'var(--ok)' : 'var(--accent)',
            }}
          >
            {saved ? '✓ Configuration saved!' : 'Save Configuration'}
          </button>
          <button
            onClick={handleReset}
            className="btn btn-ghost"
          >
            Reset to Defaults
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--ink-mute)', textAlign: 'center' as any, marginTop: 16, fontFamily: 'var(--sans)' }}>
          Configuration is saved locally in your browser and sent to the pipeline on each generation.
        </p>
      </div>
    </div>
  );
}
