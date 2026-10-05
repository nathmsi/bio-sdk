# BioSDK — Behavioral Biometrics Monorepo

> Production-quality TypeScript SDK that captures behavioral signals (mouse dynamics, typing rhythm, scroll patterns) and sends them in batches to your backend — without ever reading key values or field content.

[![CI](https://img.shields.io/github/actions/workflow/status/nathmsi/bio-sdk/ci.yml?label=CI&style=flat-square)](https://github.com/nathmsi/bio-sdk/actions)
[![Bundle](https://img.shields.io/badge/SDK-2.8%20kB%20gzip-60a5fa?style=flat-square)]()
[![Zero deps](https://img.shields.io/badge/runtime%20deps-0-4ade80?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%20max-3178c6?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-a78bfa?style=flat-square)]()

---

## What's inside

```
bio-sdk/
├── packages/
│   ├── protocol/        # Shared types + Zod schemas (the source of truth)
│   └── sdk/             # Zero-dependency SDK — 2.8 kB gzip
├── apps/
│   ├── server/          # Fastify + pino + SSE + human-score analytics
│   └── dashboard/       # Vite + React + Tailwind live dashboard
├── docs/
│   ├── adr/             # Architecture Decision Records
│   └── INTERVIEW.md     # 10 interview Q&A + design tradeoffs
└── .github/workflows/   # CI (Node 20 + 22), CodeQL, release
```

---

## Quick start

```bash
pnpm install
pnpm build
```

**Run the demo (server + dashboard):**

```bash
# Terminal 1 — API server (port 9000)
pnpm --filter @bio-sdk/server dev

# Terminal 2 — Dashboard (port 5173)
pnpm --filter @bio-sdk/dashboard dev
```

Or with Docker:

```bash
docker compose up
```

Then open **http://localhost:5173** — click **▶ Start SDK**, interact with the page, and watch events arrive live.

---

## SDK — 5-line integration

### Via `<script>` tag (UMD)

```html
<script src="packages/sdk/dist/bio-sdk.umd.js"></script>
<script>
  BioSDK.init({
    endpoint: 'https://your-api.example.com/collect',
    batchSize: 50,
    flushIntervalMs: 5000,
  });
</script>
```

### Via npm (ESM)

```ts
import { init, stop, flush, getVersion } from '@bio-sdk/sdk';

init({ endpoint: 'https://your-api.example.com/collect' });

// When done:
stop();
```

---

## SDK API

| Method | Description |
|--------|-------------|
| `init(config)` | Start the SDK. Idempotent — safe to call multiple times. Throws `ConfigValidationError` for invalid config. |
| `stop()` | Flush remaining events, remove all listeners, free memory. Safe to call before `init()`. |
| `flush()` | Send the current buffer without stopping. |
| `getVersion()` | Returns the SDK version string (semver). |

### Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | **required** | `http://` or `https://` URL |
| `batchSize` | `number` | `50` | Auto-flush when N events accumulate (max 500) |
| `flushIntervalMs` | `number` | `5000` | Periodic flush in ms (min 500) |
| `sampleRateMs` | `number` | `50` | Mousemove throttle in ms (min 16) |
| `maxBufferSize` | `number` | `1000` | Max in-memory events before FIFO eviction |
| `useWorker` | `boolean` | `false` | Offload to Web Worker (falls back gracefully) |
| `debug` | `boolean` | `false` | Log self-measurement to console |
| `onError` | `(err: Error) => void` | noop | Internal error callback |

---

## Privacy policy

- **No key values.** `keydown`/`keyup` handlers never read `e.key`, `e.code`, or `e.which`.
- **No field content.** The SDK never reads `input.value` or any DOM text.
- **Coordinates only.** Mouse events capture `clientX`/`clientY` — not the element under the cursor.
- **No PII.** Session IDs are random UUIDs with no link to user identity.
- **Passive listeners.** `{ passive: true }` on all listeners — the SDK cannot block scroll or input.
- **Automated test.** `findPrivacyLeak()` in `@bio-sdk/protocol` scans every batch in CI to prove no sensitive key appears.

---

## Architecture

```mermaid
graph TD
    A[Host page] -->|loads| B[bio-sdk.umd.js<br/>2.8 kB gzip]
    B -->|sendBeacon / fetch| C[Fastify server<br/>POST /collect]
    C -->|SSE| D[React dashboard<br/>live updates]
    C -->|validates with| E[@bio-sdk/protocol<br/>Zod schemas]
    B -->|shares types only| E
```

---

## Verification

```bash
pnpm verify   # format + lint + typecheck + test + build
```

All checks run on Node 20 and 22 in CI.

---

## Design decisions

See [`docs/INTERVIEW.md`](docs/INTERVIEW.md) for the full decision log, 10 interview Q&A, and acknowledged tradeoffs.

Key choices at a glance:
- **Zero runtime deps** in the SDK — no supply chain risk, bundle stays < 3 kB forever
- **`sendBeacon` first** — survives page unload; `fetch keepalive` fallback with exponential backoff + jitter
- **Bounded buffer** — FIFO eviction protects memory on low-end devices (32 MB tab limit)
- **Module singleton** — one instance per page, idempotent `init()`, no duplicate listeners
- **`exactOptionalPropertyTypes` + strict max** — TypeScript catches optional-vs-undefined bugs at compile time

---

## License

MIT — see [LICENSE](LICENSE)
