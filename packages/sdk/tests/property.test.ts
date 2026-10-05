import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { init, stop, _resetForTesting } from '../src/index.js';
import { resolveConfig, ConfigValidationError } from '../src/config.js';

describe('Property-based tests', () => {
  beforeEach(() => {
    _resetForTesting();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(true) });
    vi.stubGlobal('crypto', { randomUUID: () => '00000000-0000-0000-0000-000000000001' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    _resetForTesting();
  });

  it('init() never throws for valid configs', () => {
    fc.assert(
      fc.property(
        fc.record({
          batchSize: fc.integer({ min: 1, max: 500 }),
          flushIntervalMs: fc.integer({ min: 500, max: 60000 }),
          sampleRateMs: fc.integer({ min: 16, max: 1000 }),
          maxBufferSize: fc.integer({ min: 500, max: 5000 }),
        }),
        ({ batchSize, flushIntervalMs, sampleRateMs, maxBufferSize }) => {
          const adjustedMax = Math.max(maxBufferSize, batchSize);
          expect(() => {
            _resetForTesting();
            init({
              endpoint: 'http://localhost:9000/collect',
              batchSize,
              flushIntervalMs,
              sampleRateMs,
              maxBufferSize: adjustedMax,
            });
            stop();
          }).not.toThrow();
        },
      ),
      { numRuns: 50 },
    );
  });

  it('resolveConfig throws ConfigValidationError for any invalid endpoint', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(''), fc.constant('not-a-url'), fc.constant('ftp://example')),
        endpoint => {
          expect(() => resolveConfig({ endpoint })).toThrow(ConfigValidationError);
        },
      ),
    );
  });
});
