interface Props {
  connected: boolean;
  running: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function Header({ connected, running, onStart, onStop }: Props) {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧬</span>
          <div>
            <h1 className="font-bold text-lg leading-none">BioSDK</h1>
            <p className="text-xs text-gray-500 leading-none mt-0.5">Behavioral Biometrics</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-mono">
            v1.0.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* SSE connection status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-gray-600'}`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>

          {running ? (
            <button
              onClick={onStop}
              className="px-3 py-1.5 rounded-lg bg-red-950 text-red-400 border border-red-800 text-sm font-medium hover:bg-red-900 transition-colors"
            >
              ■ Stop SDK
            </button>
          ) : (
            <button
              onClick={onStart}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              ▶ Start SDK
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
