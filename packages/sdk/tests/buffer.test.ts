import { describe, it, expect } from 'vitest';
import { BoundedBuffer } from '../src/buffer.js';
import type { BioEventInternal } from '../src/types.js';

function ev(t = 1): BioEventInternal {
  return { t, type: 'click' };
}

describe('BoundedBuffer', () => {
  it('stores events and reports size', () => {
    const buf = new BoundedBuffer(10);
    buf.push(ev(1));
    buf.push(ev(2));
    expect(buf.size).toBe(2);
  });

  it('drain returns events in FIFO order', () => {
    const buf = new BoundedBuffer(10);
    buf.push(ev(1));
    buf.push(ev(2));
    buf.push(ev(3));
    const drained = buf.drain(2);
    expect(drained).toHaveLength(2);
    expect(drained[0]?.t).toBe(1);
    expect(drained[1]?.t).toBe(2);
    expect(buf.size).toBe(1);
  });

  it('drainAll empties the buffer', () => {
    const buf = new BoundedBuffer(10);
    buf.push(ev(1));
    buf.push(ev(2));
    const all = buf.drainAll();
    expect(all).toHaveLength(2);
    expect(buf.size).toBe(0);
  });

  it('evicts oldest event when full', () => {
    const buf = new BoundedBuffer(3);
    buf.push(ev(1));
    buf.push(ev(2));
    buf.push(ev(3));
    buf.push(ev(4)); // should evict ev(1)
    expect(buf.size).toBe(3);
    expect(buf.evictedCount).toBe(1);
    const all = buf.drainAll();
    expect(all[0]?.t).toBe(2); // ev(1) was dropped
  });

  it('clear resets size and eviction count', () => {
    const buf = new BoundedBuffer(3);
    buf.push(ev(1));
    buf.push(ev(2));
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.evictedCount).toBe(0);
  });

  it('handles drain count larger than size', () => {
    const buf = new BoundedBuffer(10);
    buf.push(ev(1));
    const drained = buf.drain(100);
    expect(drained).toHaveLength(1);
    expect(buf.size).toBe(0);
  });
});
