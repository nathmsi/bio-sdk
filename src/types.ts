export interface BioConfig {
  /** URL to POST event batches to */
  endpoint: string;
  /** Max events per batch before auto-flush (default: 50) */
  batchSize?: number;
  /** Auto-flush interval in ms (default: 5000) */
  flushIntervalMs?: number;
  /** Mousemove throttle interval in ms (default: 50) */
  sampleRateMs?: number;
  /** Log debug info to console (default: false) */
  debug?: boolean;
}

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

export interface BioEvent {
  /** Unix timestamp ms */
  t: number;
  type: EventType;
  /** clientX — absent for keyboard/scroll events */
  x?: number;
  /** clientY — absent for keyboard/scroll events */
  y?: number;
  /** Delta ms since last event of the same type */
  dt?: number;
}

export interface BioPayload {
  sessionId: string;
  /** Batch creation timestamp */
  ts: number;
  events: BioEvent[];
}
