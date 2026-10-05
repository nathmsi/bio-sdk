import type { SseBatchEvent } from '../hooks/useSse.js';

const TYPE_COLOR: Record<string, string> = {
  mousemove:  'text-blue-400',
  click:      'text-green-400',
  keydown:    'text-purple-400',
  keyup:      'text-purple-300',
  scroll:     'text-orange-400',
  pointerdown:'text-cyan-400',
  pointerup:  'text-cyan-300',
  touchstart: 'text-pink-400',
  touchend:   'text-pink-300',
};

interface Props {
  events: SseBatchEvent[];
}

export function EventFeed({ events }: Props) {
  const allEvents = events.flatMap(e => e.payload.events).slice(0, 80);
  const counts = allEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h2 className="font-semibold text-gray-100 mb-3">Live Event Feed</h2>

      {/* Type counters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(counts).map(([type, count]) => (
          <span
            key={type}
            className={`text-xs font-mono px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 ${TYPE_COLOR[type] ?? 'text-gray-400'}`}
          >
            {type} ×{count}
          </span>
        ))}
      </div>

      {/* Scrollable log */}
      <div className="h-48 overflow-y-auto font-mono text-xs space-y-0.5 pr-1">
        {allEvents.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No events yet — start the SDK and interact</p>
        ) : (
          allEvents.map((e, i) => (
            <div key={i} className="flex gap-2 animate-slide-in">
              <span className="text-gray-600 w-24 shrink-0">
                {new Date(e.t).toLocaleTimeString('en', { hour12: false })}
              </span>
              <span className={`w-20 shrink-0 ${TYPE_COLOR[e.type] ?? 'text-gray-400'}`}>{e.type}</span>
              {e.x !== undefined && (
                <span className="text-gray-500">({e.x},{e.y})</span>
              )}
              {e.dt !== undefined && (
                <span className="text-gray-700">Δ{e.dt}ms</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
