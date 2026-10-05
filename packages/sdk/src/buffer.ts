import type { BioEventInternal } from './types.js';

/**
 * Bounded in-memory event buffer.
 * When full, oldest events are evicted (FIFO drop) to protect memory.
 */
export class BoundedBuffer {
  private readonly _buf: BioEventInternal[] = [];
  private _evicted = 0;

  constructor(private readonly _maxSize: number) {}

  push(event: BioEventInternal): void {
    if (this._buf.length >= this._maxSize) {
      this._buf.shift();
      this._evicted++;
    }
    this._buf.push(event);
  }

  /** Drain and return up to `count` events. Modifies the buffer in place. */
  drain(count: number): BioEventInternal[] {
    return this._buf.splice(0, count);
  }

  /** Drain all events at once. */
  drainAll(): BioEventInternal[] {
    return this._buf.splice(0);
  }

  get size(): number {
    return this._buf.length;
  }

  get evictedCount(): number {
    return this._evicted;
  }

  clear(): void {
    this._buf.length = 0;
    this._evicted = 0;
  }
}
