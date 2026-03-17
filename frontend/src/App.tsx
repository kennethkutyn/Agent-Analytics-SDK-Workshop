import { useState, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import CodeEditor from './components/CodeEditor';
import EventViewer from './components/EventViewer';
import { CODE_TEMPLATE } from './lib/codeTemplate';
import { parseStepConfig } from './lib/parseSteps';
import { CapturedEvent, StepConfig } from './types';

export default function App() {
  const [code, setCode] = useState(CODE_TEMPLATE);
  const [events, setEvents] = useState<CapturedEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [amplitudeApiKey, setAmplitudeApiKey] = useState<string | null>(null);

  const config: StepConfig = parseStepConfig(code);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handleReset = useCallback(() => {
    setCode(CODE_TEMPLATE);
  }, []);

  const handleNewEvents = useCallback((newEvents: CapturedEvent[]) => {
    setEvents((prev) => [...prev, ...newEvents]);
  }, []);

  const handleClearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Amplitude AI SDK Playground</h1>
            <p className="text-[10px] text-gray-400">Uncomment code to enable SDK features, then chat to see events</p>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          amplimoney.amplitude.com
        </div>
      </header>

      {/* Three columns */}
      <div className="flex-1 grid grid-cols-[360px_minmax(0,1fr)_500px] min-h-0 overflow-hidden">
        <ChatPanel
          config={config}
          sessionId={sessionId}
          onSessionId={setSessionId}
          onEvents={handleNewEvents}
          amplitudeApiKey={amplitudeApiKey}
        />
        <CodeEditor
          code={code}
          onChange={handleCodeChange}
          config={config}
          onReset={handleReset}
        />
        <EventViewer
          events={events}
          config={config}
          onClear={handleClearEvents}
          amplitudeApiKey={amplitudeApiKey}
          onAmplitudeApiKeyChange={setAmplitudeApiKey}
        />
      </div>
    </div>
  );
}
