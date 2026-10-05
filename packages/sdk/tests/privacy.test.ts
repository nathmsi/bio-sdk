import { describe, it, expect } from 'vitest';
import { findPrivacyLeak } from '@bio-sdk/protocol';
import type { BioPayload } from '@bio-sdk/protocol';

describe('Privacy invariants', () => {
  const clean: BioPayload = {
    v: '1',
    sessionId: '00000000-0000-0000-0000-000000000001',
    ts: Date.now(),
    events: [
      { t: Date.now(), type: 'keydown', dt: 50 },
      { t: Date.now(), type: 'keyup',   dt: 80 },
      { t: Date.now(), type: 'click', x: 100, y: 200 },
      { t: Date.now(), type: 'mousemove', x: 300, y: 400, dt: 50 },
    ],
  };

  it('clean payload has no privacy leak', () => {
    expect(findPrivacyLeak(clean)).toBeUndefined();
  });

  it('detects "key" field leak', () => {
    const dirty = {
      ...clean,
      events: [{ t: Date.now(), type: 'keydown', key: 'p' }],
    };
    expect(findPrivacyLeak(dirty)).toBe('key');
  });

  it('detects "code" field leak', () => {
    const dirty = {
      ...clean,
      events: [{ t: Date.now(), type: 'keydown', code: 'KeyP' }],
    };
    expect(findPrivacyLeak(dirty)).toBe('code');
  });

  it('detects "value" field leak', () => {
    const dirty = {
      ...clean,
      events: [{ t: Date.now(), type: 'click', value: 'password123' }],
    };
    expect(findPrivacyLeak(dirty)).toBe('value');
  });
});
