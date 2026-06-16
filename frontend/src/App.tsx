import { useState, useCallback, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import CodeEditor from './components/CodeEditor';
import EventViewer from './components/EventViewer';
import EvalBuilder from './components/EvalBuilder';
import { CODE_TEMPLATE } from './lib/codeTemplate';
import { parseStepConfig } from './lib/parseSteps';
import { CapturedEvent, ChatMessage, StepConfig } from './types';

export default function App() {
  const [code, setCode] = useState(CODE_TEMPLATE);
  const [events, setEvents] = useState<CapturedEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [amplitudeApiKey, setAmplitudeApiKey] = useState<string | null>('3a86fb958f9731bcf8c070b7ea1bd87f');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [rightTab, setRightTab] = useState<'events' | 'eval-builder'>('events');

  const config: StepConfig = parseStepConfig(code);

  // Auto-switch to Eval Builder when Step 6 is enabled
  useEffect(() => {
    if (config.step_6_llm_judge) {
      setRightTab('eval-builder');
    } else {
      setRightTab('events');
    }
  }, [config.step_6_llm_judge]);

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

  const handleMessagesChange = useCallback((messages: ChatMessage[]) => {
    setChatMessages(messages);
  }, []);

  const showTabs = config.step_6_llm_judge;

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
          onMessagesChange={handleMessagesChange}
        />
        <CodeEditor
          code={code}
          onChange={handleCodeChange}
          config={config}
          onReset={handleReset}
        />

        {/* Right panel with optional tabs */}
        <div className="flex flex-col bg-white overflow-hidden">
          {/* Tab bar / header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-4">
              {showTabs ? (
                <>
                  <button
                    onClick={() => setRightTab('events')}
                    className={`text-sm font-medium pb-0.5 transition-colors ${
                      rightTab === 'events'
                        ? 'text-blue-700 border-b-2 border-blue-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Event Stream
                    {events.length > 0 && (
                      <span className="ml-1.5 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                        {events.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setRightTab('eval-builder')}
                    className={`text-sm font-medium pb-0.5 transition-colors ${
                      rightTab === 'eval-builder'
                        ? 'text-purple-700 border-b-2 border-purple-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Eval Builder
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Event Stream</span>
                  {events.length > 0 && (
                    <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                      {events.length}
                    </span>
                  )}
                </div>
              )}
            </div>
            {rightTab === 'events' && events.length > 0 && (
              <button
                onClick={handleClearEvents}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded hover:border-gray-400 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tab content */}
          {rightTab === 'events' ? (
            <EventViewer
              events={events}
              config={config}
              onClear={handleClearEvents}
              amplitudeApiKey={amplitudeApiKey}
              onAmplitudeApiKeyChange={setAmplitudeApiKey}
            />
          ) : (
            <EvalBuilder chatMessages={chatMessages} />
          )}
        </div>
      </div>
    </div>
  );
}
