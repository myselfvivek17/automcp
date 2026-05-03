/**
 * Simple API client for AutoMCP backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface Endpoint {
  method: string;
  path: string;
  description: string;
}

export interface GenerateRequest {
  name: string;
  description: string;
  endpoints: Endpoint[];
}

export interface GenerateResponse {
  success: boolean;
  code: string;
  message: string;
}

/**
 * Generate MCP server code from API specification
 */
export async function generateMCP(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/generation/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to generate MCP code');
  }

  return response.json();
}

// Made with Bob