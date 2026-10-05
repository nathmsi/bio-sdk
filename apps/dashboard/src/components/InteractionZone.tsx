import { useRef } from 'react';

interface Props {
  running: boolean;
}

export function InteractionZone({ running }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`rounded-xl border-2 transition-colors duration-300 p-5 ${running ? 'border-blue-600 bg-blue-950/20' : 'border-dashed border-gray-700 bg-gray-900/50'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${running ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
        <h2 className="font-semibold text-gray-100">
          {running ? 'Interaction Zone — move, type, click!' : 'Start the SDK to begin capturing'}
        </h2>
      </div>

      <div
        className={`relative h-32 rounded-lg flex items-center justify-center cursor-crosshair select-none transition-colors ${running ? 'bg-gray-900' : 'bg-gray-900/50'}`}
        role="region"
        aria-label="Mouse interaction zone"
      >
        <span className="text-gray-600 text-sm pointer-events-none">
          {running ? 'Move your mouse · Click · Scroll' : '⏸ Paused'}
        </span>
      </div>

      <div className="mt-3">
        <label className="text-xs text-gray-500 mb-1 block">
          Type here (key timings only — content is never captured)
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder="Start typing…"
          disabled={!running}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-600 disabled:opacity-40 transition-colors"
          aria-label="Typing test field"
        />
      </div>
    </div>
  );
}
