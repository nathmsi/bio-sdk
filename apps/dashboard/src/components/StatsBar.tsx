import type { SseBatchEvent } from '../hooks/useSse.js';

interface Props {
  events: SseBatchEvent[];
}

export function StatsBar({ events }: Props) {
  const all = events.flatMap(e => e.payload.events);
  const counts: Record<string, number> = {};
  for (const e of all) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }

  const stats = [
    { label: 'Batches', value: events.length, color: 'text-green-400' },
    { label: 'Events', value: all.length, color: 'text-blue-400' },
    { label: 'Clicks', value: counts['click'] ?? 0, color: 'text-green-400' },
    { label: 'Keystrokes', value: counts['keydown'] ?? 0, color: 'text-purple-400' },
    { label: 'Scroll', value: counts['scroll'] ?? 0, color: 'text-orange-400' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
          <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
