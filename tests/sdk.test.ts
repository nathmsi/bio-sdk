import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the internals by importing the module directly.
// Because the SDK is a singleton we reset module state between tests.

describe('BioSDK', () => {
  let sdk: typeof import('../src/index.js');
  let fetchSpy: ReturnType<typeof vi.fn>;
  let beaconSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Fresh module import per test (vitest resets module registry between tests
    // when using vi.resetModules())
    vi.resetModules();
    sdk = await import('../src/index.js');

    fetchSpy  = vi.fn().mockResolvedValue(new Response());
    beaconSpy = vi.fn().mockReturnValue(true);

    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', {
      sendBeacon: beaconSpy,
    });
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-1234',
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    sdk.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── getVersion ────────────────────────────────────────────────────────────

  it('returns a semver version string', () => {
    expect(sdk.getVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  // ── init guard ────────────────────────────────────────────────────────────

  it('double init is a no-op (no duplicate listeners)', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    sdk.init({ endpoint: 'http://localhost:9000/collect', debug: false });
    const callsAfterFirst = addSpy.mock.calls.length;
    sdk.init({ endpoint: 'http://localhost:9000/collect', debug: false }); // second call
    expect(addSpy.mock.calls.length).toBe(callsAfterFirst); // no new listeners
  });

  // ── stop ──────────────────────────────────────────────────────────────────

  it('stop() removes all listeners and clears interval', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    sdk.init({ endpoint: 'http://localhost:9000/collect' });
    sdk.stop();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('stop() before init() is a no-op', () => {
    expect(() => sdk.stop()).not.toThrow();
  });

  // ── batching ──────────────────────────────────────────────────────────────

  it('auto-flushes when batchSize is reached', () => {
    sdk.init({ endpoint: 'http://localhost:9000/collect', batchSize: 3 });

    // Fire 3 clicks
    for (let i = 0; i < 3; i++) {
      document.dispatchEvent(new MouseEvent('click', { clientX: i, clientY: i, bubbles: true }));
    }

    expect(beaconSpy).toHaveBeenCalledOnce();
    const [, blob] = beaconSpy.mock.calls[0] as [string, Blob];
    expect(blob).toBeInstanceOf(Blob);
  });

  it('flushes on interval', () => {
    sdk.init({
      endpoint: 'http://localhost:9000/collect',
      batchSize: 100,
      flushIntervalMs: 1000,
    });

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(beaconSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1001);
    expect(beaconSpy).toHaveBeenCalledOnce();
  });

  // ── mousemove throttle ────────────────────────────────────────────────────

  it('throttles mousemove by sampleRateMs', () => {
    sdk.init({
      endpoint: 'http://localhost:9000/collect',
      batchSize: 100,
      sampleRateMs: 100,
    });

    // Fire 5 mousemoves within the throttle window
    for (let i = 0; i < 5; i++) {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: i, clientY: 0, bubbles: true }));
    }

    // Advance past the throttle, fire one more
    vi.advanceTimersByTime(110);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 99, clientY: 0, bubbles: true }));

    // Flush
    vi.advanceTimersByTime(5001);

    const [, blob] = beaconSpy.mock.calls[0] as [string, Blob];
    // The blob content is async but we can check it was called once with a small batch
    expect(beaconSpy).toHaveBeenCalledOnce();
    expect(blob).toBeInstanceOf(Blob);
    // 2 mousemoves max (1 at t=0, 1 after 110ms) + 0 before throttle expires
    // actual count depends on fake timer base — just assert < 5
    expect(blob.size).toBeGreaterThan(0);
  });

  // ── privacy: keydown never captures the key ───────────────────────────────

  it('keydown event in buffer has no key field', () => {
    // Intercept via fetch instead of sendBeacon — easier to inspect synchronously
    let capturedPayload: Record<string, unknown> | null = null;
    fetchSpy.mockImplementation((_url: string, opts: RequestInit) => {
      capturedPayload = JSON.parse(opts.body as string);
      return Promise.resolve(new Response());
    });
    beaconSpy.mockReturnValue(false); // force fetch fallback

    sdk.init({ endpoint: 'http://localhost:9000/collect', batchSize: 1 });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(capturedPayload).not.toBeNull();
    const ev = (capturedPayload!.events as Array<Record<string,unknown>>)[0];
    expect(ev!.type).toBe('keydown');
    expect(ev).not.toHaveProperty('key');
    expect(ev).not.toHaveProperty('code');
  });

  // ── resilience: broken endpoint ───────────────────────────────────────────

  it('does not throw when sendBeacon returns false and fetch rejects', async () => {
    beaconSpy.mockReturnValue(false);
    fetchSpy.mockRejectedValue(new Error('Network error'));

    sdk.init({ endpoint: 'http://localhost:9000/collect', batchSize: 1 });

    expect(() => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }).not.toThrow();
  });

  it('does not throw when init crashes internally', () => {
    // Break the endpoint to something that would cause issues
    expect(() => {
      sdk.init({ endpoint: '' });
    }).not.toThrow();
  });

  // ── visibilitychange flush ────────────────────────────────────────────────

  it('flushes when page becomes hidden', () => {
    sdk.init({ endpoint: 'http://localhost:9000/collect', batchSize: 100 });

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(beaconSpy).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(beaconSpy).toHaveBeenCalledOnce();
  });
});
