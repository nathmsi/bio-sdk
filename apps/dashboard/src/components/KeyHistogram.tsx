import type { BioEvent } from '@bio-sdk/protocol';

interface Props {
  events: BioEvent[];
}

export function KeyHistogram({ events }: Props) {
  const keydowns = events.filter(e => e.type === 'keydown' && e.dt !== undefined);
  const dts = keydowns.map(e => e.dt as number);

  if (dts.length < 2) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="font-semibold text-gray-100 mb-3">Keystroke Rhythm</h2>
        <p className="text-gray-600 text-sm text-center py-8">Type to see your keystroke intervals</p>
      </div>
    );
  }

  const max = Math.max(...dts, 1);
  const recent = dts.slice(-30);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-100">Keystroke Rhythm</h2>
        <span className="text-xs text-gray-500 font-mono">
          avg {Math.round(dts.reduce((a, b) => a + b, 0) / dts.length)}ms
        </span>
      </div>
      <div className="flex items-end gap-1 h-16">
        {recent.map((dt, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-300"
            style={{
              height: `${Math.max((dt / max) * 100, 5)}%`,
              background: `hsl(${220 + (1 - dt / max) * 100}, 70%, 60%)`,
              opacity: 0.5 + 0.5 * (i / recent.length),
            }}
            title={`${dt}ms`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>0</span>
        <span>{max}ms</span>
      </div>
    </div>
  );
}
