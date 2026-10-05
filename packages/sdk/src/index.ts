import { resolveConfig } from './config.js';
import { BoundedBuffer } from './buffer.js';
import { Collectors } from './collectors.js';
import { sendBatch } from './transport.js';
import { SdkAnalytics } from './analytics.js';
import { makeSessionId } from './types.js';
import type { BioConfig, BioSDKInstance, BioEventInternal, ResolvedConfig, SessionId } from './types.js';

export type { BioConfig, BioSDKInstance } from './types.js';
export { ConfigValidationError } from './config.js';

const VERSION = '1.0.0' as const;

// ─── Singleton state ──────────────────────────────────────────────────────────

let _instance: InternalInstance | null = null;

class InternalInstance implements BioSDKInstance {
  private readonly _cfg: ResolvedConfig;
  private readonly _sessionId: SessionId;
  private readonly _buffer: BoundedBuffer;
  private readonly _collectors: Collectors;
  private readonly _analytics: SdkAnalytics;
  private _flushTimer: ReturnType<typeof setInterval> | null = null;
  private _destroyed = false;

  constructor(cfg: ResolvedConfig) {
    this._cfg = cfg;
    this._sessionId = makeSessionId(crypto.randomUUID());
    this._buffer = new BoundedBuffer(cfg.maxBufferSize);
    this._analytics = new SdkAnalytics();

    this._collectors = new Collectors(event => this._push(event), cfg);
    this._collectors.attach();

    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('pagehide', this._onPageHide);

    this._flushTimer = setInterval(() => { void this._flush(); }, cfg.flushIntervalMs);

    if (cfg.debug) {
      console.log(`[BioSDK] v${VERSION} — session=${this._sessionId} endpoint=${cfg.endpoint}`);
    }
  }

  private _push(event: BioEventInternal): void {
    const t0 = this._cfg.debug ? performance.now() : 0;
    const prevEvicted = this._buffer.evictedCount;

    this._buffer.push(event);

    if (this._cfg.debug) {
      const dt = performance.now() - t0;
      this._analytics.recordEvent(dt);
      const newEvictions = this._buffer.evictedCount - prevEvicted;
      if (newEvictions > 0) this._analytics.recordEviction(newEvictions);
    }

    if (this._buffer.size >= this._cfg.batchSize) {
      void this._flush();
    }
  }

  private async _flush(): Promise<void> {
    if (this._destroyed) return;
    const events = this._buffer.drain(this._cfg.batchSize * 2);
    if (events.length === 0) return;

    if (this._cfg.debug) this._analytics.recordBatch(events.length);

    try {
      await sendBatch(this._sessionId, events, this._cfg);
    } catch (err) {
      // sendBatch never throws — this is a safety net
      this._cfg.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private readonly _onVisibility = (): void => {
    if (document.visibilityState === 'hidden') void this._flushAll();
  };

  private readonly _onPageHide = (): void => {
    void this._flushAll();
  };

  private _flushAll(): Promise<void> {
    const events = this._buffer.drainAll();
    if (events.length === 0) return Promise.resolve();
    return sendBatch(this._sessionId, events, this._cfg).catch(() => undefined);
  }

  /** Public API */
  flush(): void {
    void this._flush();
  }

  stop(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    void this._flushAll();

    if (this._flushTimer !== null) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }

    this._collectors.detach();
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('pagehide', this._onPageHide);
    this._buffer.clear();

    if (this._cfg.debug) {
      console.log('[BioSDK] stopped.', this._analytics.report);
    }
    _instance = null;
  }

  getVersion(): string {
    return VERSION;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the SDK. Idempotent — subsequent calls are silently ignored.
 * Throws ConfigValidationError synchronously if the config is invalid.
 */
export function init(cfg: BioConfig): BioSDKInstance {
  if (_instance !== null) {
    if (cfg.debug) console.warn('[BioSDK] Already initialized — call stop() first.');
    return _instance;
  }
  // resolveConfig throws ConfigValidationError on invalid config (intentional)
  const resolved = resolveConfig(cfg);
  _instance = new InternalInstance(resolved);
  return _instance;
}

/**
 * Flush remaining events and tear down the SDK.
 * Safe to call even if init() was never called.
 */
export function stop(): void {
  _instance?.stop();
}

/** Flush the current buffer without stopping. */
export function flush(): void {
  _instance?.flush();
}

export function getVersion(): string {
  return VERSION;
}

/** @internal — exposed for testing only */
export function _resetForTesting(): void {
  _instance = null;
}
