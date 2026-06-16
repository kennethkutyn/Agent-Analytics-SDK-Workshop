import { useState, useCallback } from 'react';
import { ChatMessage, EvalPromptState, EvalResult } from '../types';
import { SessionTranscript, SAMPLE_SESSIONS } from '../lib/sampleSessions';
import { runEvalBatch } from '../lib/api';

const DEFAULT_JUDGE_PROMPT =
  'Read this conversation between a user and the AmpliMoney assistant. ' +
  'Did the assistant successfully help the user with their request? ' +
  'Answer PASS or FAIL and explain in one sentence.\n\n' +
  'Conversation:\n{transcript}';

let evalIdCounter = 1;

function makeEvalPrompt(name?: string, prompt?: string): EvalPromptState {
  return {
    id: `eval-${evalIdCounter++}`,
    name: name || 'task_completion',
    prompt: prompt || DEFAULT_JUDGE_PROMPT,
    labels: {},
    results: null,
    running: false,
    error: null,
  };
}

interface EvalBuilderProps {
  chatMessages: ChatMessage[];
}

export default function EvalBuilder({ chatMessages }: EvalBuilderProps) {
  const [evalPrompts, setEvalPrompts] = useState<EvalPromptState[]>([makeEvalPrompt()]);

  const allSessions: SessionTranscript[] = [
    ...SAMPLE_SESSIONS,
    {
      id: 'live',
      title: 'Your session',
      source: 'live',
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
    },
  ];

  const updatePrompt = useCallback((id: string, patch: Partial<EvalPromptState>) => {
    setEvalPrompts((prev) =>
      prev.map((ep) => (ep.id === id ? { ...ep, ...patch } : ep)),
    );
  }, []);

  const setLabel = useCallback((evalId: string, sessionId: string, label: 'pass' | 'fail') => {
    setEvalPrompts((prev) =>
      prev.map((ep) => {
        if (ep.id !== evalId) return ep;
        const labels = { ...ep.labels };
        if (labels[sessionId] === label) {
          delete labels[sessionId];
        } else {
          labels[sessionId] = label;
        }
        return { ...ep, labels, results: null, error: null };
      }),
    );
  }, []);

  const handleRunEval = useCallback(async (evalId: string) => {
    const ep = evalPrompts.find((e) => e.id === evalId);
    if (!ep) return;

    const labeledSessionIds = Object.keys(ep.labels);
    const labeledSessions = allSessions.filter((s) => labeledSessionIds.includes(s.id));
    if (labeledSessions.length === 0) return;

    updatePrompt(evalId, { running: true, error: null });

    try {
      const response = await runEvalBatch(
        ep.prompt,
        labeledSessions.map((s) => ({ messages: s.messages })),
      );
      const orderedResults: EvalResult[] = [];
      labeledSessions.forEach((s, i) => {
        orderedResults.push(response.results[i]);
      });

      setEvalPrompts((prev) =>
        prev.map((e) => {
          if (e.id !== evalId) return e;
          const resultsMap: Record<string, EvalResult> = {};
          labeledSessions.forEach((s, i) => {
            resultsMap[s.id] = orderedResults[i];
          });
          return { ...e, results: orderedResults, running: false, _resultsMap: resultsMap } as EvalPromptState & { _resultsMap: Record<string, EvalResult> };
        }),
      );
    } catch (err) {
      updatePrompt(evalId, {
        running: false,
        error: err instanceof Error ? err.message : 'Eval request failed',
      });
    }
  }, [evalPrompts, allSessions, updatePrompt]);

  const addEvalPrompt = useCallback(() => {
    setEvalPrompts((prev) => {
      const last = prev[prev.length - 1];
      const ep = makeEvalPrompt();
      ep.name = '';
      ep.prompt = '';
      if (last) ep.labels = { ...last.labels };
      return [...prev, ep];
    });
  }, []);

  const removeEvalPrompt = useCallback((id: string) => {
    setEvalPrompts((prev) => prev.length > 1 ? prev.filter((ep) => ep.id !== id) : prev);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50 p-4 space-y-4">
      {evalPrompts.map((ep, epIdx) => (
        <PromptCard
          key={ep.id}
          evalPrompt={ep}
          sessions={allSessions}
          index={epIdx}
          onUpdatePrompt={updatePrompt}
          onSetLabel={setLabel}
          onRunEval={handleRunEval}
          onRemove={evalPrompts.length > 1 ? removeEvalPrompt : undefined}
        />
      ))}

      <button
        onClick={addEvalPrompt}
        className="border border-dashed border-purple-300 text-purple-500 text-xs font-medium py-2.5 rounded-md hover:bg-purple-50 hover:border-purple-400 transition-colors w-full"
      >
        + Add Evaluator
      </button>
    </div>
  );
}

// ─── Prompt Card ──────────────────────────────────────────────

interface PromptCardProps {
  evalPrompt: EvalPromptState;
  sessions: SessionTranscript[];
  index: number;
  onUpdatePrompt: (id: string, patch: Partial<EvalPromptState>) => void;
  onSetLabel: (evalId: string, sessionId: string, label: 'pass' | 'fail') => void;
  onRunEval: (evalId: string) => void;
  onRemove?: (id: string) => void;
}

function PromptCard({
  evalPrompt,
  sessions,
  index,
  onUpdatePrompt,
  onSetLabel,
  onRunEval,
  onRemove,
}: PromptCardProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const labeledIds = Object.keys(evalPrompt.labels);
  const labeledCount = labeledIds.length;
  const totalSessions = sessions.length;

  // Build results map from the ordered results array
  const resultsMap: Record<string, EvalResult> = {};
  if (evalPrompt.results) {
    const labeledSessions = sessions.filter((s) => labeledIds.includes(s.id));
    labeledSessions.forEach((s, i) => {
      if (evalPrompt.results && evalPrompt.results[i]) {
        resultsMap[s.id] = evalPrompt.results[i];
      }
    });
  }

  // Compute confusion matrix
  const matrix = { tp: 0, fp: 0, fn: 0, tn: 0 };
  if (evalPrompt.results) {
    for (const sessionId of labeledIds) {
      const humanLabel = evalPrompt.labels[sessionId];
      const evalResult = resultsMap[sessionId];
      if (!evalResult) continue;

      const humanPass = humanLabel === 'pass';
      const evalPass = evalResult.passed;

      if (humanPass && evalPass) matrix.tp++;
      else if (humanPass && !evalPass) matrix.fn++;
      else if (!humanPass && evalPass) matrix.fp++;
      else matrix.tn++;
    }
  }

  const total = matrix.tp + matrix.fp + matrix.fn + matrix.tn;
  const tpr = matrix.tp + matrix.fn > 0 ? (matrix.tp / (matrix.tp + matrix.fn)) * 100 : null;
  const tnr = matrix.tn + matrix.fp > 0 ? (matrix.tn / (matrix.tn + matrix.fp)) * 100 : null;

  function metricColor(value: number | null): string {
    if (value === null) return 'text-gray-400';
    if (value >= 70) return 'text-emerald-600';
    if (value >= 50) return 'text-amber-600';
    return 'text-red-600';
  }

  return (
    <div className="bg-white rounded-lg border border-purple-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={evalPrompt.name}
            onChange={(e) => onUpdatePrompt(evalPrompt.id, { name: e.target.value })}
            placeholder="evaluator name"
            className="text-sm font-medium text-gray-700 border-none bg-transparent focus:bg-purple-50 focus:ring-1 focus:ring-purple-300 rounded px-1 py-0.5 outline-none w-40"
          />
          <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
            #{index + 1}
          </span>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(evalPrompt.id)}
            className="text-gray-300 hover:text-red-400 text-xs transition-colors"
            title="Remove evaluator"
          >
            ✕
          </button>
        )}
      </div>

      {/* Prompt */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Prompt</span>
          <span className="text-[10px] text-gray-400">Use {'{'} transcript {'}'} as placeholder</span>
        </div>
        <textarea
          value={evalPrompt.prompt}
          onChange={(e) => onUpdatePrompt(evalPrompt.id, { prompt: e.target.value, results: null })}
          rows={4}
          className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-md p-3 w-full resize-y min-h-[80px] focus:border-purple-300 focus:ring-1 focus:ring-purple-200 outline-none"
          placeholder="Write your judge prompt here..."
        />
      </div>

      {/* Sessions */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sessions</span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">
              <span className={labeledCount > 0 ? 'text-purple-600 font-semibold' : ''}>{labeledCount}</span>
              {' '}of {totalSessions} labeled
            </span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Your label</span>
          </div>
        </div>

        <div className="space-y-1.5">
          {sessions.map((session, sIdx) => {
            const label = evalPrompt.labels[session.id];
            const isLive = session.source === 'live';
            const hasMessages = session.messages.length > 0;
            const isExpanded = expandedSession === session.id;
            const evalResult = resultsMap[session.id];

            return (
              <div
                key={session.id}
                className={`rounded-md p-2 transition-colors ${
                  label === 'pass'
                    ? 'border border-gray-100 border-l-2 border-l-emerald-500'
                    : label === 'fail'
                    ? 'border border-gray-100 border-l-2 border-l-red-400'
                    : isLive && !hasMessages
                    ? 'border border-dashed border-gray-200 bg-gray-50'
                    : 'border border-gray-100'
                } ${label ? 'label-selected' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-gray-400">#{sIdx + 1}</span>
                    <span className="text-xs font-medium text-gray-700 truncate">{session.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      isLive ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isLive ? 'live' : 'sample'}
                    </span>
                    {evalResult && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm border border-dashed font-medium flex-shrink-0 ${
                        evalResult.passed
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                          : 'bg-orange-50 text-orange-700 border-orange-300'
                      }`}>
                        LLM: {evalResult.passed ? 'PASS' : 'FAIL'}
                      </span>
                    )}
                  </div>

                  {/* Pass / Fail buttons */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => hasMessages && onSetLabel(evalPrompt.id, session.id, 'pass')}
                      disabled={isLive && !hasMessages}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded border transition-all duration-150 ${
                        label === 'pass'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700 ring-1 ring-emerald-200'
                          : isLive && !hasMessages
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed opacity-30'
                          : 'border-gray-200 text-gray-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                      } ${label === 'fail' ? 'opacity-30' : ''}`}
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => hasMessages && onSetLabel(evalPrompt.id, session.id, 'fail')}
                      disabled={isLive && !hasMessages}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded border transition-all duration-150 ${
                        label === 'fail'
                          ? 'bg-red-100 border-red-300 text-red-700 ring-1 ring-red-200'
                          : isLive && !hasMessages
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed opacity-30'
                          : 'border-gray-200 text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                      } ${label === 'pass' ? 'opacity-30' : ''}`}
                    >
                      Fail
                    </button>
                  </div>
                </div>

                {/* Message preview / expanded transcript */}
                {isLive && !hasMessages ? (
                  <p className="text-[10px] text-gray-400 italic mt-1">
                    Chat with AmpliMoney first to create your session
                  </p>
                ) : (
                  <div className="mt-1">
                    {!isExpanded && (
                      <div className="text-[10px] text-gray-500">
                        <span className="font-semibold">U:</span>{' '}
                        {session.messages[0]?.content.slice(0, 60)}
                        {(session.messages[0]?.content.length ?? 0) > 60 ? '...' : ''}
                        {session.messages[1] && (
                          <>
                            <br />
                            <span className="font-semibold">A:</span>{' '}
                            {session.messages[1].content.slice(0, 60)}
                            {session.messages[1].content.length > 60 ? '...' : ''}
                          </>
                        )}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-1 space-y-1">
                        {session.messages.map((msg, mi) => (
                          <div
                            key={mi}
                            className={`text-[10px] rounded px-2 py-1 ${
                              msg.role === 'user' ? 'bg-gray-50 text-gray-600' : 'bg-white text-gray-600'
                            }`}
                          >
                            <span className="font-semibold text-gray-500">
                              {msg.role === 'user' ? 'User' : 'Assistant'}:
                            </span>{' '}
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                      className="text-[10px] text-purple-500 hover:text-purple-700 mt-0.5"
                    >
                      {isExpanded ? 'show less' : 'show more'}
                    </button>
                    {evalResult && (
                      <p className="text-[10px] text-gray-400 mt-0.5 italic">
                        {evalResult.rationale}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Run Eval button */}
      <button
        onClick={() => onRunEval(evalPrompt.id)}
        disabled={labeledCount === 0 || evalPrompt.running}
        className={`w-full text-xs font-medium px-4 py-2 rounded-md transition-colors ${
          evalPrompt.running
            ? 'bg-purple-400 text-white cursor-wait'
            : labeledCount === 0
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {evalPrompt.running ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Evaluating...
          </span>
        ) : (
          `Run Eval on ${labeledCount} session${labeledCount !== 1 ? 's' : ''}`
        )}
      </button>

      {/* Error */}
      {evalPrompt.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-md p-2 mt-2">
          {evalPrompt.error}
        </div>
      )}

      {/* Results */}
      {evalPrompt.results && total > 0 && (
        <div className="bg-purple-50/50 rounded-md p-3 mt-3 border border-purple-100 eval-results-enter">
          {/* TPR / TNR */}
          <div className="flex items-start gap-6 mb-3">
            <div>
              <div className={`text-2xl font-bold ${metricColor(tpr)}`}>
                {tpr !== null ? `${tpr.toFixed(0)}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-400 uppercase">True Positive Rate</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${metricColor(tnr)}`}>
                {tnr !== null ? `${tnr.toFixed(0)}%` : '—'}
              </div>
              <div className="text-[10px] text-gray-400 uppercase">True Negative Rate</div>
            </div>
            <div className="text-[10px] text-gray-400 mt-2">
              {total} session{total !== 1 ? 's' : ''} evaluated
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="grid grid-cols-[auto_1fr_1fr] gap-px text-[10px]">
            <div />
            <div className="text-center text-gray-500 font-medium py-1 bg-gray-100 rounded-tl">LLM: Pass</div>
            <div className="text-center text-gray-500 font-medium py-1 bg-gray-100 rounded-tr">LLM: Fail</div>

            <div className="text-gray-500 font-medium pr-2 py-1.5 flex items-center">You: Pass</div>
            <div className={`text-center py-1.5 rounded font-semibold text-sm ${
              matrix.tp > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
            }`}>
              {matrix.tp} <span className="text-[9px] font-normal">TP</span>
            </div>
            <div className={`text-center py-1.5 rounded font-semibold text-sm ${
              matrix.fn > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
            }`}>
              {matrix.fn} <span className="text-[9px] font-normal">FN</span>
            </div>

            <div className="text-gray-500 font-medium pr-2 py-1.5 flex items-center">You: Fail</div>
            <div className={`text-center py-1.5 rounded font-semibold text-sm ${
              matrix.fp > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
            }`}>
              {matrix.fp} <span className="text-[9px] font-normal">FP</span>
            </div>
            <div className={`text-center py-1.5 rounded font-semibold text-sm ${
              matrix.tn > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
            }`}>
              {matrix.tn} <span className="text-[9px] font-normal">TN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
