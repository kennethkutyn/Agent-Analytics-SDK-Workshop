import { useState } from 'react';
import { CapturedEvent, StepConfig } from '../types';

interface EventViewerProps {
  events: CapturedEvent[];
  config: StepConfig;
  onClear: () => void;
  amplitudeApiKey: string | null;
  onAmplitudeApiKeyChange: (key: string) => void;
}

function getEventColor(eventType: string): string {
  if (eventType.includes('User Message')) return 'text-blue-600';
  if (eventType.includes('AI Response')) return 'text-green-600';
  if (eventType.includes('Session End')) return 'text-purple-600';
  if (eventType.includes('Score')) return 'text-amber-600';
  return 'text-gray-500';
}

function getEventDataType(eventType: string): string {
  if (eventType.includes('User Message')) return 'user-message';
  if (eventType.includes('AI Response')) return 'ai-response';
  if (eventType.includes('Session End')) return 'session-end';
  if (eventType.includes('Score')) return 'score';
  return 'unknown';
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    if (String(value).includes('.') && value < 1) return `$${value.toFixed(6)}`;
    if (typeof value === 'number' && String(value).includes('.')) return value.toFixed(1);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getEvalSource(event: CapturedEvent): string | null {
  const source = event.properties['[Agent] Evaluation Source'];
  if (source === 'code' || source === 'llm_judge' || source === 'user') {
    return source as string;
  }
  return null;
}

function getEvalBadge(event: CapturedEvent): { label: string; color: string; icon: string } | null {
  const source = getEvalSource(event);
  if (!source || source === 'user') return null;
  const value = event.properties['[Agent] Score Value'];
  const passed = value === 1 || value === 1.0;

  return {
    label: passed ? 'PASS' : 'FAIL',
    color: passed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300',
    icon: passed ? '✓' : '✗',
  };
}

function EventSummary({ event }: { event: CapturedEvent }) {
  const props = event.properties;
  const source = getEvalSource(event);

  if (event.event_type.includes('Score') && source && source !== 'user') {
    const reason = props['eval_reason'] as string || '';
    const badge = getEvalBadge(event);
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-gray-400 text-[10px]">Code Eval</span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${badge.color}`}>
            {badge.icon} {badge.label}
          </span>
        )}
        {reason && <span className="text-gray-400 truncate text-[10px]">— {reason}</span>}
      </div>
    );
  }

  if (event.event_type.includes('AI Response')) {
    const model = props['[Agent] Model Name'] || '';
    const tokens = props['[Agent] Total Tokens'] || '';
    const latency = props['[Agent] Latency Ms'];
    const cost = props['[Agent] Cost USD'];
    const parts = [];
    if (model) parts.push(String(model));
    if (tokens) parts.push(`${tokens} tokens`);
    if (latency) parts.push(`${Number(latency).toFixed(0)}ms`);
    if (cost) parts.push(`$${Number(cost).toFixed(4)}`);
    return <span className="text-gray-500">{parts.join(' · ')}</span>;
  }
  if (event.event_type.includes('User Message')) {
    const content = String(props['$llm_message'] || '').slice(0, 60);
    if (!content) return null;
    return <span className="text-gray-500 truncate">"{content}"</span>;
  }
  if (event.event_type.includes('Score') && source === 'user') {
    const name = props['[Agent] Score Name'] || '';
    const value = props['[Agent] Score Value'];
    return <span className="text-gray-500">{String(name)}: {value === 1 ? '👍' : '👎'} (user)</span>;
  }
  return null;
}

export default function EventViewer({
  events,
  config,
  onClear,
  amplitudeApiKey,
  onAmplitudeApiKeyChange,
}: EventViewerProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col bg-white overflow-hidden h-full">
      {/* Optional Amplitude API key input */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <label className="text-xs text-gray-500 block mb-1">Amplitude API Key (optional)</label>
        <input
          type="text"
          value={amplitudeApiKey || ''}
          onChange={(e) => onAmplitudeApiKeyChange(e.target.value)}
          placeholder="Enter to send real events..."
          className="w-full bg-white text-gray-700 text-xs rounded border border-gray-300 px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 font-mono"
        />
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!config.step_1_ai_sdk && events.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-12 px-6">
            <div className="text-3xl mb-3">📊</div>
            <p className="font-medium text-gray-500">No AI events yet</p>
            <p className="mt-2 text-xs leading-relaxed">
              Enable <span className="text-green-600 font-mono">Step 1</span> in the code editor
              by uncommenting the AI SDK lines, then send a chat message.
            </p>
          </div>
        )}

        {config.step_1_ai_sdk && events.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-12 px-6">
            <div className="text-3xl mb-3">✅</div>
            <p className="font-medium text-gray-500">AI SDK enabled!</p>
            <p className="mt-2 text-xs leading-relaxed">
              Send a chat message to see events appear here.
            </p>
          </div>
        )}

        {[...events].reverse().map((event, ri) => {
          const i = events.length - 1 - ri;
          const isExpanded = expandedIdx === i;
          const evalBadge = getEvalBadge(event);
          const evalSource = getEvalSource(event);
          const isEvalEvent = evalSource && evalSource !== 'user';

          return (
            <div
              key={i}
              className={`event-card event-new cursor-pointer px-4 py-2.5 border-b border-gray-100 ${
                isEvalEvent ? 'bg-purple-50/50' : ''
              }`}
              data-type={getEventDataType(event.event_type)}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
            >
              {/* Collapsed view */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isEvalEvent && evalBadge ? (
                      <span className="text-xs font-mono font-medium text-orange-600">
                        ⚙ Code Eval
                      </span>
                    ) : (
                      <span className={`text-xs font-mono font-medium ${getEventColor(event.event_type)}`}>
                        {event.event_type}
                      </span>
                    )}
                    {evalBadge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${evalBadge.color}`}>
                        {evalBadge.icon} {evalBadge.label}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                  <div className="text-xs mt-0.5 truncate">
                    <EventSummary event={event} />
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>

              {/* Expanded: property table */}
              {isExpanded && (
                <div className="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
                  <div className="px-3 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 border-b border-gray-200">
                    Event Properties
                  </div>
                  {event.user_id && (
                    <div className="flex px-3 py-1 text-xs border-b border-gray-100">
                      <span className="text-gray-400 w-36 flex-shrink-0">user_id</span>
                      <span className="text-gray-700 font-mono">{event.user_id}</span>
                    </div>
                  )}
                  {Object.entries(event.properties).map(([key, value]) => (
                    <div key={key} className="flex px-3 py-1 text-xs border-b border-gray-100 last:border-0">
                      <span className="text-gray-400 w-36 flex-shrink-0 truncate" title={key}>
                        {key.replace('[Agent] ', '')}
                      </span>
                      <span className="text-gray-700 font-mono break-all">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
