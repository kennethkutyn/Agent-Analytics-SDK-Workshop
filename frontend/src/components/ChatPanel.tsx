import { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, StepConfig, CapturedEvent } from '../types';
import { sendChat, sendScore } from '../lib/api';

interface ChatPanelProps {
  config: StepConfig;
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onEvents: (events: CapturedEvent[]) => void;
  amplitudeApiKey: string | null;
  judgePrompt: string | null;
}

export default function ChatPanel({
  config,
  sessionId,
  onSessionId,
  onEvents,
  amplitudeApiKey,
  judgePrompt,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessageType = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChat(text, messages, config, sessionId, amplitudeApiKey, judgePrompt);
      const aiMsg: ChatMessageType = {
        role: 'assistant',
        content: res.response,
        id: res.message_id || undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (res.session_id) onSessionId(res.session_id);
      if (res.events.length > 0) onEvents(res.events);
    } catch (err) {
      const errMsg: ChatMessageType = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async (messageId: string, thumbsUp: boolean) => {
    if (!sessionId) return;
    try {
      const events = await sendScore(sessionId, messageId, thumbsUp, config, amplitudeApiKey);
      if (events.length > 0) onEvents(events);
    } catch {
      // Silently fail for scoring
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 border-r border-gray-200 overflow-hidden">
      {/* Phone frame */}
      <div className="phone-frame">
        {/* Status bar */}
        <div className="phone-status-bar">
          <span>9:41</span>
          <span className="font-semibold text-gray-800 text-xs">AmpliMoney</span>
          <span>100%</span>
        </div>

        {/* Chat header */}
        <div className="bg-white px-4 py-2 border-b border-gray-200 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            AM
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">AmpliMoney Assistant</div>
            <div className="text-xs text-green-500">Online</div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-xs mt-8 px-4">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-gray-600">Hi! I'm AmpliMoney's AI assistant.</p>
              <p className="mt-1 text-gray-400">Ask me about savings, budgeting, or investments!</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="flex flex-col">
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  {msg.content}
                </div>
                {/* Thumbs up/down for AI messages when step 4 is active */}
                {msg.role === 'assistant' && msg.id && config.step_4_scoring && (
                  <div className="flex gap-1 mt-1 ml-1">
                    <button
                      onClick={() => handleScore(msg.id!, true)}
                      className="text-xs text-gray-400 hover:text-green-500 transition-colors px-1"
                      title="Helpful"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleScore(msg.id!, false)}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                      title="Not helpful"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-ai flex gap-1 items-center">
                <span className="typing-dot w-2 h-2 bg-gray-300 rounded-full inline-block" />
                <span className="typing-dot w-2 h-2 bg-gray-300 rounded-full inline-block" />
                <span className="typing-dot w-2 h-2 bg-gray-300 rounded-full inline-block" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask AmpliMoney..."
              className="flex-1 bg-white text-gray-800 text-sm rounded-full px-4 py-2 outline-none border border-gray-300 focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
              disabled={loading}
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm disabled:opacity-30 hover:bg-blue-500 transition-colors"
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
