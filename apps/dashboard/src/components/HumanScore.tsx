interface Factor {
  name: string;
  value: number;
  weight: number;
  description: string;
}

interface Props {
  score: number;
  label: string;
  factors: Factor[];
}

const LABEL_STYLE = {
  human:     'text-green-400 bg-green-950 border-green-800',
  bot:       'text-red-400 bg-red-950 border-red-800',
  uncertain: 'text-yellow-400 bg-yellow-950 border-yellow-800',
};

export function HumanScore({ score, label, factors }: Props) {
  const pct = `${score}%`;
  const color = label === 'human' ? '#4ade80' : label === 'bot' ? '#f87171' : '#facc15';
  const labelStyle = LABEL_STYLE[label as keyof typeof LABEL_STYLE] ?? LABEL_STYLE.uncertain;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-100">Human Score</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${labelStyle}`}>
          {label}
        </span>
      </div>

      {/* Gauge */}
      <div className="relative h-4 rounded-full bg-gray-800 mb-2 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: pct, background: color, boxShadow: `0 0 12px ${color}66` }}
        />
      </div>
      <div className="text-right font-mono text-2xl font-bold mb-4" style={{ color }}>
        {score}
      </div>

      {/* Factors */}
      <div className="space-y-2">
        {factors.map(f => (
          <div key={f.name} title={f.description}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{f.name}</span>
              <span className="font-mono">{Math.round(f.value * 100)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${f.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-600 italic">
        ⚠ Demo heuristic — not a validated model
      </p>
    </div>
  );
}
