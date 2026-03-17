export interface StepConfig {
  step_1_ai_sdk: boolean;
  step_2_user_identity: boolean;
  step_3_sessions: boolean;
  step_4_scoring: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export interface CapturedEvent {
  event_type: string;
  user_id: string | null;
  timestamp: number | null;
  properties: Record<string, unknown>;
}

export interface ChatResponse {
  response: string;
  events: CapturedEvent[];
  session_id: string | null;
  message_id: string | null;
}
