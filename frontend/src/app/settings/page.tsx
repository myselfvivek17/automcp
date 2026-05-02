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

const SELECT_CLS = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100";

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50">Agent Configuration</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">
              Assign an AI model to each pipeline agent independently
            </p>
          </div>
          <Link
            href="/generate"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            ← Back to Generator
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 mb-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Quick Presets</p>
          <div className="flex gap-3 flex-wrap">
            {Object.keys(PRESETS).map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors font-medium text-gray-700 dark:text-slate-300"
              >
                {PRESET_ICONS[preset]} {preset}
              </button>
            ))}
            <span className="text-xs text-gray-400 dark:text-slate-500 self-center ml-2">
              All Watsonx.ai Granite models
            </span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {AGENT_ORDER.map((name, idx) => {
            const config = configs[name];
            const models = MODELS_BY_PROVIDER[config.provider] ?? [];
            return (
              <div key={name} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{name}</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{AGENT_DESCRIPTIONS[name]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Provider</label>
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
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Model</label>
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
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                      API Key Override{' '}
                      <span className="text-gray-400 dark:text-slate-500 font-normal">(optional — falls back to global key)</span>
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

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saved ? '✓ Configuration saved!' : 'Save Configuration'}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-slate-500 text-center mt-4">
          Configuration is saved locally in your browser and sent to the pipeline on each generation.
        </p>
      </div>
    </div>
  );
}
