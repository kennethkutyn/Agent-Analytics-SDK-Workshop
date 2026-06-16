import Editor from '@monaco-editor/react';
import { StepConfig } from '../types';
import { CODE_TEMPLATE } from '../lib/codeTemplate';
import { toggleStepBlock } from '../lib/toggleStep';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  config: StepConfig;
  onReset: () => void;
}

const stepLabels: { key: keyof StepConfig; label: string; num: number; group?: string }[] = [
  { key: 'step_1_ai_sdk', label: 'AI SDK', num: 1, group: 'sdk' },
  { key: 'step_2_user_identity', label: 'User Identity', num: 2, group: 'sdk' },
  { key: 'step_3_sessions', label: 'Sessions', num: 3, group: 'sdk' },
  { key: 'step_4_scoring', label: 'Scoring', num: 4, group: 'sdk' },
  { key: 'step_5_code_eval', label: 'Code Eval', num: 5, group: 'eval' },
  { key: 'step_6_llm_judge', label: 'LLM Judge', num: 6, group: 'eval' },
];

export default function CodeEditor({ code, onChange, config, onReset }: CodeEditorProps) {
  return (
    <div className="flex flex-col bg-gray-950 border-r border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-200 font-semibold">app.py</span>
          <span className="text-xs text-gray-400">— Edit to enable SDK features</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-gray-300 hover:text-white px-2 py-1 border border-gray-500 rounded hover:border-gray-400 transition-colors"
        >
          Reset Code
        </button>
      </div>

      {/* Step toggle badges */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 border-b border-gray-700 flex-shrink-0">
        {stepLabels.map(({ key, label, num, group }, idx) => (
          <div key={key} className="flex items-center gap-2">
            {idx > 0 && group !== stepLabels[idx - 1].group && (
              <div className="w-px h-5 bg-gray-600" />
            )}
            <button
              onClick={() => onChange(toggleStepBlock(code, num))}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                config[key]
                  ? group === 'eval'
                    ? 'bg-purple-800 text-purple-200 border border-purple-600 hover:bg-purple-700'
                    : 'bg-green-800 text-green-200 border border-green-600 hover:bg-green-700'
                  : 'bg-gray-700 text-gray-300 border border-gray-500 hover:bg-gray-600'
              }`}
              title={config[key] ? `Disable ${label}` : `Enable ${label}`}
            >
              {num}. {label} {config[key] ? '✓' : '—'}
            </button>
          </div>
        ))}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 12 },
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            guides: { indentation: false },
          }}
        />
      </div>
    </div>
  );
}
