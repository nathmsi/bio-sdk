# BioSDK — Behavioral Biometrics SDK

> A lightweight TypeScript SDK that captures mouse, keyboard, and scroll **timings** to detect behavioral patterns — without ever reading key values or field content.

[![Tests](https://img.shields.io/badge/tests-11%20passing-4ade80?style=flat-square)](./tests/sdk.test.ts)
[![Bundle](https://img.shields.io/badge/bundle-1.4%20kB%20gzip-60a5fa?style=flat-square)](./dist)
[![Zero deps](https://img.shields.io/badge/deps-zero-a78bfa?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)]()

---

## What it does

BioSDK collects behavioral signals (typing rhythm, mouse dynamics, scroll patterns) and sends them in batches to your backend. Use cases include fraud detection, bot detection, and continuous authentication.

**What it captures:** timestamps, event types, coordinates, inter-event deltas.  
**What it never captures:** key values, field content, text input, passwords.

---

## Quick start

### Via `<script>` tag (UMD)

```html
<script src="dist/bio-sdk.umd.js"></script>
<script>
  BioSDK.init({
    endpoint: 'https://your-api.example.com/collect',
    batchSize: 50,
    flushIntervalMs: 5000,
    debug: true,
  });
</script>
```

### Via npm (ESM)

```bash
npm install bio-sdk
```

```ts
import { init, stop, getVersion } from 'bio-sdk';

init({
  endpoint: 'https://your-api.example.com/collect',
  batchSize: 50,
  flushIntervalMs: 5000,
});

// Later, to clean up:
stop();
```

---

## API

### `init(config)`

Starts the SDK. Calling `init()` more than once is a no-op — safe to call idempotently.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | **required** | URL that receives POST batches |
| `batchSize` | `number` | `50` | Auto-flush when this many events accumulate |
| `flushIntervalMs` | `number` | `5000` | Periodic flush interval in milliseconds |
| `sampleRateMs` | `number` | `50` | Mousemove throttle — one event per N ms |
| `debug` | `boolean` | `false` | Log debug info to the browser console |

### `stop()`

Flushes remaining events, removes all listeners, clears the buffer, and resets the SDK. Safe to call even if `init()` was never called.

### `getVersion()`

Returns the current SDK version string (semver).

---

## Batch payload format

Each POST to your endpoint has this shape:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "ts": 1712345678901,
  "events": [
    { "t": 1712345678800, "type": "click",     "x": 320, "y": 240, "dt": 1200 },
    { "t": 1712345678850, "type": "keydown",                        "dt": 50   },
    { "t": 1712345678900, "type": "mousemove", "x": 318, "y": 235, "dt": 50   }
  ]
}
```

| Field | Description |
|-------|-------------|
| `sessionId` | UUID generated at `init()`, persists until `stop()` |
| `ts` | Batch creation timestamp (ms since epoch) |
| `t` | Event timestamp |
| `type` | Event type (see below) |
| `x` / `y` | Pointer coordinates — absent for keyboard/scroll events |
| `dt` | Delta ms since the previous event of the same type |

**Captured event types:** `mousemove`, `click`, `pointerdown`, `pointerup`, `scroll`, `keydown`, `keyup`, `touchstart`, `touchend`.

---

## Privacy policy

- **No key values.** `keydown`/`keyup` handlers never read `e.key`, `e.code`, or `e.which`.
- **No field content.** The SDK does not read `input.value` or any DOM text.
- **Coordinates only.** Mouse/touch events capture `clientX` / `clientY` — not the element under the cursor.
- **No PII.** Session IDs are random UUIDs with no link to user identity.
- All listeners use `passive: true` — the SDK cannot block page interactions.

---

## Running the demo

```bash
npm install
npm run build      # produces dist/bio-sdk.esm.js + dist/bio-sdk.umd.js
node demo/server.js
```

Then open **http://localhost:9000** in your browser.

The demo page lets you:
- Click `▶ init()` to start the SDK
- Move the mouse, click, type, and scroll in the interaction zone
- Watch the live counters and event log update in real time
- See batches arrive in your terminal as the server prints them

**Terminal output example:**
```
📦 Batch #1 — session=550e8400…  events=20
   click          ×4
   keydown        ×11
   keyup          ×11
   mousemove      ×3
   scroll         ×1
```

---

## Running tests

```bash
npm test
```

11 Vitest tests covering:
- Version string format
- Double-`init()` guard (no duplicate listeners)
- `stop()` removes all listeners
- Auto-flush when `batchSize` is reached
- Periodic flush via `setInterval`
- Mousemove throttling
- Privacy: `keydown` events have no `key` field
- Resilience: no throw when `sendBeacon` fails + `fetch` rejects
- Resilience: no throw when `init()` receives a broken config
- `visibilitychange` flush when tab is hidden

---

## Build

```bash
npm run build
```

Produces two bundles in `dist/`:

| File | Format | Size | Gzip |
|------|--------|------|------|
| `bio-sdk.esm.js` | ESM | 2.9 kB | **1.4 kB** |
| `bio-sdk.umd.js` | IIFE/UMD | 3.3 kB | **1.5 kB** |

Both bundles include source maps. Built with [esbuild](https://esbuild.github.io/).

---

## Design decisions

1. **Module singleton** — an embedded SDK has one instance per page. A singleton makes `init()` naturally idempotent without exposing a class.
2. **`sendBeacon` first, `fetch` fallback** — `sendBeacon` survives page unload; `fetch` with `keepalive: true` handles payloads > 64 kB or quota exhaustion.
3. **Passive listeners everywhere** — `{ passive: true }` means the SDK can never delay scrolling or input on the host page.
4. **Throttled mousemove** — raw mousemove fires 60× per second; throttling to 20 Hz (50 ms) cuts event volume by 3× with negligible signal loss.
5. **Zero global pollution** — ESM export or single `window.BioSDK` object; no prototype mutation, no monkey-patching (except the demo's beacon spy).
6. **Silent failure** — every public method is wrapped in `try/catch`. The SDK's contract to the host page: it will never throw.
7. **Privacy by design** — key handlers are typed as `(_e: KeyboardEvent) => void`; the underscore prefix signals intentionally unused. TypeScript makes it hard to accidentally read `e.key`.
8. **No framework, no runtime deps** — the entire SDK is ~120 lines of vanilla TypeScript. Bundle size stays under 2 kB gzip forever.

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **Patch** (`1.0.x`): bug fixes, no API change
- **Minor** (`1.x.0`): new optional config options, backwards-compatible
- **Major** (`x.0.0`): breaking API changes (e.g. renamed exports, removed options)

---

## Project structure

```
bio-sdk/
├── src/
│   ├── index.ts        # SDK implementation + public API
│   └── types.ts        # Exported TypeScript types
├── tests/
│   └── sdk.test.ts     # 11 Vitest unit tests
├── demo/
│   ├── index.html      # Interactive demo page
│   └── server.js       # Local Node server (serves demo + receives batches)
├── dist/               # Built bundles (git-ignored in production)
├── build.mjs           # esbuild build script
├── tsconfig.json
└── package.json
```

---

## License

MIT
