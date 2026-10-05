import type { EventType } from '@bio-sdk/protocol';
import type { BioEventInternal, ResolvedConfig } from './types.js';

type PushFn = (event: BioEventInternal) => void;

type ListenerRecord = {
  target: EventTarget;
  type: string;
  fn: EventListener;
  opts?: AddEventListenerOptions | undefined;
};

export class Collectors {
  private readonly _records: ListenerRecord[] = [];
  private readonly _lastTime: Partial<Record<EventType, number>> = {};
  private _lastMouseTime = 0;

  constructor(
    private readonly _push: PushFn,
    private readonly _cfg: ResolvedConfig,
  ) {}

  attach(): void {
    const P = { passive: true } satisfies AddEventListenerOptions;
    this._on(document, 'mousemove', this._onMouseMove.bind(this), P);
    this._on(document, 'click', this._onPointer('click').bind(this), P);
    this._on(document, 'scroll', this._onScroll.bind(this), { ...P, capture: true });
    this._on(document, 'keydown', this._onKey('keydown').bind(this), P);
    this._on(document, 'keyup', this._onKey('keyup').bind(this), P);
    this._on(document, 'pointerdown', this._onPointer('pointerdown').bind(this), P);
    this._on(document, 'pointerup', this._onPointer('pointerup').bind(this), P);
    this._on(document, 'touchstart', this._onTouch('touchstart').bind(this), P);
    this._on(document, 'touchend', this._onTouch('touchend').bind(this), P);
  }

  detach(): void {
    for (const { target, type, fn, opts } of this._records) {
      target.removeEventListener(type, fn, opts);
    }
    this._records.length = 0;
  }

  private _on(
    target: EventTarget,
    type: string,
    fn: (e: Event) => void,
    opts?: AddEventListenerOptions,
  ): void {
    const handler = fn as EventListener;
    target.addEventListener(type, handler, opts);
    this._records.push({ target, type, fn: handler, opts });
  }

  private _delta(type: EventType, now: number): number | undefined {
    const last = this._lastTime[type];
    this._lastTime[type] = now;
    return last !== undefined ? now - last : undefined;
  }

  private _onMouseMove(e: Event): void {
    const now = Date.now();
    if (now - this._lastMouseTime < this._cfg.sampleRateMs) return;
    this._lastMouseTime = now;
    const me = e as MouseEvent;
    this._push({ t: now, type: 'mousemove', x: me.clientX, y: me.clientY, dt: this._delta('mousemove', now) });
  }

  private _onPointer(type: 'click' | 'pointerdown' | 'pointerup') {
    return (e: Event): void => {
      const now = Date.now();
      const me = e as MouseEvent;
      this._push({ t: now, type, x: me.clientX, y: me.clientY, dt: this._delta(type, now) });
    };
  }

  private _onScroll(): void {
    const now = Date.now();
    this._push({ t: now, type: 'scroll', dt: this._delta('scroll', now) });
  }

  private _onKey(type: 'keydown' | 'keyup') {
    // PRIVACY: handler receives KeyboardEvent but intentionally reads NO key-identifying properties
    return (_e: Event): void => {
      const now = Date.now();
      this._push({ t: now, type, dt: this._delta(type, now) });
    };
  }

  private _onTouch(type: 'touchstart' | 'touchend') {
    return (e: Event): void => {
      const now = Date.now();
      const te = e as TouchEvent;
      const touch = te.touches[0] ?? te.changedTouches[0];
      this._push({ t: now, type, x: touch?.clientX, y: touch?.clientY, dt: this._delta(type, now) });
    };
  }
}
