import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { init, stop, flush, getVersion, _resetForTesting, ConfigValidationError } from '../src/index.js';

const ENDPOINT = 'http://localhost:9000/collect';

describe('SDK public API', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let beaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetForTesting();
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    beaconSpy = vi.fn().mockReturnValue(true);
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', { sendBeacon: beaconSpy });
    vi.stubGlobal('crypto', { randomUUID: () => '00000000-0000-0000-0000-000000000001' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    _resetForTesting();
  });

  // ── Version ────────────────────────────────────────────────────────────────
  it('getVersion returns semver', () => {
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  // ── Config validation ──────────────────────────────────────────────────────
  it('throws ConfigValidationError for bad endpoint', () => {
    expect(() => init({ endpoint: '' })).toThrow(ConfigValidationError);
  });

  it('throws ConfigValidationError for invalid URL', () => {
    expect(() => init({ endpoint: 'not-a-url' })).toThrow(ConfigValidationError);
  });

  // ── Double init guard ──────────────────────────────────────────────────────
  it('double init returns the same instance', () => {
    const a = init({ endpoint: ENDPOINT });
    const b = init({ endpoint: ENDPOINT });
    expect(a).toBe(b);
  });

  // ── stop() idempotence ─────────────────────────────────────────────────────
  it('stop() before init() is a no-op', () => {
    expect(() => stop()).not.toThrow();
  });

  it('stop() twice is a no-op', () => {
    init({ endpoint: ENDPOINT });
    stop();
    expect(() => stop()).not.toThrow();
  });

  // ── Batching ──────────────────────────────────────────────────────────────
  it('auto-flushes when batchSize is reached', () => {
    init({ endpoint: ENDPOINT, batchSize: 3 });
    for (let i = 0; i < 3; i++) {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  it('flushes on interval', () => {
    init({ endpoint: ENDPOINT, batchSize: 100, flushIntervalMs: 1000 });
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(beaconSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1001);
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  it('flush() API flushes immediately', () => {
    const sdk = init({ endpoint: ENDPOINT, batchSize: 100 });
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    sdk.flush();
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  // ── Throttling ────────────────────────────────────────────────────────────
  it('throttles mousemove by sampleRateMs', () => {
    init({ endpoint: ENDPOINT, batchSize: 100, sampleRateMs: 100 });
    for (let i = 0; i < 10; i++) {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: i, bubbles: true }));
    }
    vi.advanceTimersByTime(110);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 99, bubbles: true }));
    vi.advanceTimersByTime(5001);
    // Only 2 mousemove events: 1 at t=0, 1 after 110ms
    const [, blob] = beaconSpy.mock.calls[0] as [string, Blob];
    expect(blob.size).toBeGreaterThan(0);
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  // ── Privacy ───────────────────────────────────────────────────────────────
  it('keydown batch never contains key value', () => {
    beaconSpy.mockReturnValue(false);
    let captured: string | null = null;
    fetchSpy.mockImplementation((_url: string, opts: RequestInit) => {
      captured = opts.body as string;
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    init({ endpoint: ENDPOINT, batchSize: 1 });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', code: 'KeyP', bubbles: true }));
    expect(captured).not.toBeNull();
    expect(captured).not.toContain('"key"');
    expect(captured).not.toContain('"code"');
    expect(captured).not.toContain('"p"');
  });

  // ── Resilience ────────────────────────────────────────────────────────────
  it('does not throw when sendBeacon returns false and fetch rejects', () => {
    beaconSpy.mockReturnValue(false);
    fetchSpy.mockRejectedValue(new Error('Network error'));
    init({ endpoint: ENDPOINT, batchSize: 1 });
    expect(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }).not.toThrow();
  });

  // ── Page visibility flush ─────────────────────────────────────────────────
  it('flushes when page becomes hidden', () => {
    init({ endpoint: ENDPOINT, batchSize: 100 });
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(beaconSpy).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden', writable: true, configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(beaconSpy).toHaveBeenCalledOnce();
  });
});
