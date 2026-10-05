import type { BioConfig, BioEvent, BioPayload, EventType } from './types.js';

export type { BioConfig, BioEvent, BioPayload, EventType };

const VERSION = '1.0.0';

// ─── State (module-level singleton) ──────────────────────────────────────────

let _initialized = false;
let _sessionId = '';
let _cfg: Required<BioConfig>;
let _buffer: BioEvent[] = [];
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _lastMouseTime = 0;
const _lastEventTime: Partial<Record<EventType, number>> = {};

type ListenerRecord = {
  target: EventTarget;
  type: string;
  fn: EventListener;
  opts?: AddEventListenerOptions;
};
const _listeners: ListenerRecord[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _log(...args: unknown[]): void {
  if (_cfg?.debug) console.log('[BioSDK]', ...args);
}

function _uid(): string {
  // crypto.randomUUID with Date fallback
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ─── Buffer & transport ───────────────────────────────────────────────────────

function _push(ev: BioEvent): void {
  _buffer.push(ev);
  if (_buffer.length >= _cfg.batchSize) _flush();
}

function _flush(): void {
  if (!_buffer.length) return;
  const events = _buffer.splice(0);
  const payload: BioPayload = { sessionId: _sessionId, ts: Date.now(), events };
  _send(payload);
}

function _send(payload: BioPayload): void {
  const url = _cfg.endpoint;
  const body = JSON.stringify(payload);
  _log(`→ ${payload.events.length} events`);

  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon(url, blob)) _fetchFallback(url, body);
  } catch {
    _fetchFallback(url, body);
  }
}

function _fetchFallback(url: string, body: string): void {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => { /* silent */ });
}

// ─── Event registration helper ────────────────────────────────────────────────

function _on<E extends Event>(
  target: EventTarget,
  type: string,
  fn: (e: E) => void,
  opts?: AddEventListenerOptions,
): void {
  const handler = fn as EventListener;
  target.addEventListener(type, handler, opts);
  _listeners.push({ target, type, fn: handler, opts });
}

// ─── Collectors ───────────────────────────────────────────────────────────────

function _delta(type: EventType, now: number): number | undefined {
  const last = _lastEventTime[type];
  _lastEventTime[type] = now;
  return last !== undefined ? now - last : undefined;
}

function _onMouseMove(e: MouseEvent): void {
  const now = Date.now();
  if (now - _lastMouseTime < _cfg.sampleRateMs) return;
  _lastMouseTime = now;
  _push({ t: now, type: 'mousemove', x: e.clientX, y: e.clientY, dt: _delta('mousemove', now) });
}

function _onPointer(type: 'click' | 'pointerdown' | 'pointerup') {
  return (e: MouseEvent): void => {
    const now = Date.now();
    _push({ t: now, type, x: e.clientX, y: e.clientY, dt: _delta(type, now) });
  };
}

function _onScroll(): void {
  const now = Date.now();
  _push({ t: now, type: 'scroll', dt: _delta('scroll', now) });
}

function _onKey(type: 'keydown' | 'keyup') {
  // PRIVACY: we never capture which key was pressed
  return (_e: KeyboardEvent): void => {
    const now = Date.now();
    _push({ t: now, type, dt: _delta(type, now) });
  };
}

function _onTouch(type: 'touchstart' | 'touchend') {
  return (e: TouchEvent): void => {
    const now = Date.now();
    const touch = e.touches[0] ?? e.changedTouches[0];
    _push({ t: now, type, x: touch?.clientX, y: touch?.clientY, dt: _delta(type, now) });
  };
}

function _onPageHide(): void {
  _flush();
}

function _onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') _flush();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise le SDK. Idempotent — les appels suivants sont ignorés silencieusement.
 */
export function init(cfg: BioConfig): void {
  try {
    if (_initialized) {
      _log('Already initialized — skipping');
      return;
    }

    _cfg = {
      endpoint:       cfg.endpoint,
      batchSize:      cfg.batchSize      ?? 50,
      flushIntervalMs: cfg.flushIntervalMs ?? 5000,
      sampleRateMs:   cfg.sampleRateMs   ?? 50,
      debug:          cfg.debug          ?? false,
    };

    _sessionId   = _uid();
    _initialized = true;

    const P = { passive: true } satisfies AddEventListenerOptions;

    _on(document, 'mousemove',       _onMouseMove,          P);
    _on(document, 'click',           _onPointer('click'),   P);
    _on(document, 'scroll',          _onScroll,             { ...P, capture: true });
    _on(document, 'keydown',         _onKey('keydown'),     P);
    _on(document, 'keyup',           _onKey('keyup'),       P);
    _on(document, 'pointerdown',     _onPointer('pointerdown'), P);
    _on(document, 'pointerup',       _onPointer('pointerup'),   P);
    _on(document, 'touchstart',      _onTouch('touchstart'),    P);
    _on(document, 'touchend',        _onTouch('touchend'),      P);
    _on(document, 'visibilitychange', _onVisibilityChange);
    _on(window,   'pagehide',         _onPageHide);

    _flushTimer = setInterval(_flush, _cfg.flushIntervalMs);

    _log(`Init — session=${_sessionId} endpoint=${_cfg.endpoint}`);
  } catch {
    /* never throw to host page */
  }
}

/**
 * Retire tous les listeners, vide le buffer et libère la mémoire.
 */
export function stop(): void {
  try {
    if (!_initialized) return;

    _flush();

    for (const { target, type, fn, opts } of _listeners) {
      target.removeEventListener(type, fn, opts);
    }
    _listeners.length = 0;
    _buffer.length    = 0;

    if (_flushTimer !== null) {
      clearInterval(_flushTimer);
      _flushTimer = null;
    }

    _initialized = false;
    _log('Stopped');
  } catch {
    /* never throw to host page */
  }
}

export function getVersion(): string {
  return VERSION;
}
