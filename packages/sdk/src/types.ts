// Mirror of @bio-sdk/protocol EventType — inlined to keep the SDK zero-dependency at runtime
export type EventType =
  | 'mousemove'
  | 'click'
  | 'scroll'
  | 'keydown'
  | 'keyup'
  | 'pointerdown'
  | 'pointerup'
  | 'touchstart'
  | 'touchend';

/** Branded type — prevents passing a plain string where a SessionId is expected. */
export type SessionId = string & { readonly __brand: 'SessionId' };

export function makeSessionId(raw: string): SessionId {
  return raw as SessionId;
}

export interface BioConfig {
  /** URL to POST event batches to (required) */
  endpoint: string;
  /** Max events per batch before auto-flush (default: 50, max: 500) */
  batchSize?: number;
  /** Auto-flush interval in ms (default: 5000, min: 500) */
  flushIntervalMs?: number;
  /** Mousemove throttle in ms (default: 50, min: 16) */
  sampleRateMs?: number;
  /** Max events held in memory before old ones are evicted (default: 1000) */
  maxBufferSize?: number;
  /** Enable Web Worker offloading (default: false) */
  useWorker?: boolean;
  /** Log debug info + self-measurement to console (default: false) */
  debug?: boolean;
  /** Called with internal non-fatal errors (default: noop) */
  onError?: (err: Error) => void;
}

export interface ResolvedConfig {
  endpoint: string;
  batchSize: number;
  flushIntervalMs: number;
  sampleRateMs: number;
  maxBufferSize: number;
  useWorker: boolean;
  debug: boolean;
  onError: (err: Error) => void;
}

export interface BioEventInternal {
  t: number;
  type: EventType;
  x?: number | undefined;
  y?: number | undefined;
  dt?: number | undefined;
}

/** Public SDK interface returned by init() for chaining */
export interface BioSDKInstance {
  stop: () => void;
  flush: () => void;
  getVersion: () => string;
}
