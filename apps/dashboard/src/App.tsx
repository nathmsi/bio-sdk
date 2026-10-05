import { useSse } from './hooks/useSse.js';
import { useSdk } from './hooks/useSdk.js';
import { Header } from './components/Header.js';
import { StatsBar } from './components/StatsBar.js';
import { InteractionZone } from './components/InteractionZone.js';
import { EventFeed } from './components/EventFeed.js';
import { MouseCanvas } from './components/MouseCanvas.js';
import { HumanScore } from './components/HumanScore.js';
import { KeyHistogram } from './components/KeyHistogram.js';
import { PrivacyPanel } from './components/PrivacyPanel.js';

const SERVER = 'http://localhost:9000';

export function App() {
  const { events, connected } = useSse(`${SERVER}/events`);
  const { running, start, pause } = useSdk(`${SERVER}/collect`);

  const allBioEvents = events.flatMap(e => e.payload.events);
  const latestScore = events[0]?.score;
  const latestBatch = events[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header connected={connected} running={running} onStart={start} onStop={pause} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Stats bar */}
        <StatsBar events={events} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left — interaction + canvas */}
          <div className="lg:col-span-2 space-y-5">
            <InteractionZone running={running} />

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <h2 className="font-semibold text-gray-100 mb-3">Mouse Trajectory</h2>
              <MouseCanvas events={allBioEvents} width={600} height={240} />
              <p className="text-xs text-gray-600 mt-2">
                Color = speed — <span className="text-blue-400">blue slow</span> → <span className="text-red-400">red fast</span> · <span className="text-green-400">● = click</span>
              </p>
            </div>

            <KeyHistogram events={allBioEvents} />
          </div>

          {/* Right — score + feed + privacy */}
          <div className="space-y-5">
            {latestScore ? (
              <HumanScore
                score={latestScore.score}
                label={latestScore.label}
                factors={latestScore.factors}
              />
            ) : (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 text-center text-gray-600 text-sm py-12">
                Start the SDK to see your human score
              </div>
            )}

            <EventFeed events={events} />
            <PrivacyPanel latest={latestBatch} />
          </div>
        </div>

        {/* Integration snippet */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="font-semibold text-gray-100 mb-3">Integrate in 30 seconds</h2>
          <pre className="text-xs text-gray-300 bg-gray-950 rounded-lg p-4 overflow-x-auto leading-relaxed border border-gray-800">
{`<!-- 1. Load the bundle -->
<script src="https://cdn.example.com/bio-sdk.umd.js"></script>

<!-- 2. Init (5 lines) -->
<script>
  BioSDK.init({
    endpoint: 'https://your-api.com/collect',
    batchSize: 50,
    flushIntervalMs: 5000,
  });
</script>`}
          </pre>
        </div>
      </main>
    </div>
  );
}
