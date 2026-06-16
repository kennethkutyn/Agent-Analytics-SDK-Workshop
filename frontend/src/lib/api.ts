import { StepConfig, ChatMessage, ChatResponse, CapturedEvent, EvalBatchResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function sendChat(
  message: string,
  history: ChatMessage[],
  config: StepConfig,
  sessionId: string | null,
  amplitudeApiKey: string | null,
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      config,
      session_id: sessionId,
      amplitude_api_key: amplitudeApiKey,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    const detail = typeof err.detail === 'string'
      ? err.detail
      : Array.isArray(err.detail)
        ? err.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
        : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return res.json();
}

export async function runEvalBatch(
  prompt: string,
  sessions: { messages: { role: string; content: string }[] }[],
): Promise<EvalBatchResponse> {
  const res = await fetch(`${API_BASE}/api/eval/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, sessions }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Eval request failed' }));
    const detail = typeof err.detail === 'string'
      ? err.detail
      : Array.isArray(err.detail)
        ? err.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
        : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return res.json();
}

export async function sendScore(
  sessionId: string,
  messageId: string,
  thumbsUp: boolean,
  config: StepConfig,
  amplitudeApiKey: string | null,
): Promise<CapturedEvent[]> {
  const res = await fetch(`${API_BASE}/api/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message_id: messageId,
      thumbs_up: thumbsUp,
      config,
      amplitude_api_key: amplitudeApiKey,
    }),
  });

  if (!res.ok) {
    throw new Error(`Score request failed: ${res.status}`);
  }

  return res.json();
}
