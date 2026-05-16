const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProviderStatus {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  openrouter: boolean;
  watsonx: boolean;
}

export interface SaveKeyPayload {
  provider: string;
  key: string;
  project_id?: string;
  url?: string;
}

export async function saveProviderKey(payload: SaveKeyPayload): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/simple/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to save key');
  }
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  const res = await fetch(`${BACKEND_URL}/api/simple/keys/status`);
  if (!res.ok) throw new Error('Failed to fetch key status');
  return res.json();
}
