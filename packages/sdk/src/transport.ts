import type { BioEventInternal, ResolvedConfig, SessionId } from './types.js';

// Inlined to avoid bundling @bio-sdk/protocol (and its Zod dep) in the SDK
const PROTOCOL_VERSION = '1' as const;

interface BioPayload {
  v: typeof PROTOCOL_VERSION;
  sessionId: string;
  ts: number;
  events: BioEventInternal[];
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/** Exponential backoff with full jitter: [0, base * 2^attempt) */
function jitteredDelay(attempt: number): number {
  return Math.random() * BASE_DELAY_MS * Math.pow(2, attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPayload(
  sessionId: SessionId,
  events: BioEventInternal[],
): BioPayload {
  return {
    v: PROTOCOL_VERSION,
    sessionId,
    ts: Date.now(),
    events,
  };
}

function sendBeaconAttempt(url: string, body: string): boolean {
  try {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}

async function fetchAttempt(url: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendBatch(
  sessionId: SessionId,
  events: BioEventInternal[],
  cfg: ResolvedConfig,
): Promise<void> {
  if (events.length === 0) return;

  const payload = buildPayload(sessionId, events);
  const body = JSON.stringify(payload);

  // sendBeacon is preferred for page-unload reliability
  if (sendBeaconAttempt(cfg.endpoint, body)) {
    if (cfg.debug) console.log(`[BioSDK] beacon → ${events.length} events`);
    return;
  }

  // fetch fallback with retry + exponential backoff + jitter
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(jitteredDelay(attempt));
    }
    const ok = await fetchAttempt(cfg.endpoint, body);
    if (ok) {
      if (cfg.debug) console.log(`[BioSDK] fetch(attempt=${attempt}) → ${events.length} events`);
      return;
    }
  }

  // All retries exhausted — report to caller, never throw upward
  cfg.onError(new Error(`[BioSDK] Failed to send batch of ${events.length} events after ${MAX_RETRIES} retries`));
}
