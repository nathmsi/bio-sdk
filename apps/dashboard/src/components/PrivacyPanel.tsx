import { useState } from 'react';
import type { SseBatchEvent } from '../hooks/useSse.js';

interface Props {
  latest: SseBatchEvent | undefined;
}

const CAPTURED = ['Timestamps (ms)', 'Event type', 'Pointer X/Y', 'Inter-event delta (dt)'];
const NEVER = ['Key values', 'Field content', 'Passwords', 'Text input', 'Element values', 'DOM text'];

export function PrivacyPanel({ latest }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="font-semibold text-gray-100 mb-4">Privacy by Design</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">✅ Captured</p>
          <ul className="space-y-1">
            {CAPTURED.map(item => (
              <li key={item} className="text-xs text-green-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">🚫 Never captured</p>
          <ul className="space-y-1">
            {NEVER.map(item => (
              <li key={item} className="text-xs text-red-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => setShowRaw(v => !v)}
        className="text-xs text-blue-400 hover:text-blue-300 underline"
      >
        {showRaw ? 'Hide' : 'Show'} live payload
      </button>

      {showRaw && latest && (
        <pre className="mt-3 p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-300 overflow-x-auto max-h-48 leading-relaxed">
          {JSON.stringify(latest.payload, null, 2)}
        </pre>
      )}

      {showRaw && !latest && (
        <p className="mt-3 text-xs text-gray-600">No batch received yet.</p>
      )}
    </div>
  );
}
