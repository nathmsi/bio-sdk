import { describe, it, expect } from 'vitest';
import { resolveConfig, ConfigValidationError } from '../src/config.js';

describe('resolveConfig', () => {
  const valid = { endpoint: 'http://localhost:9000/collect' };

  it('accepts a minimal valid config', () => {
    const cfg = resolveConfig(valid);
    expect(cfg.endpoint).toBe(valid.endpoint);
    expect(cfg.batchSize).toBe(50);
    expect(cfg.flushIntervalMs).toBe(5000);
    expect(cfg.sampleRateMs).toBe(50);
  });

  it('throws on missing endpoint', () => {
    expect(() => resolveConfig({ endpoint: '' })).toThrow(ConfigValidationError);
  });

  it('throws on invalid URL', () => {
    expect(() => resolveConfig({ endpoint: 'not-a-url' })).toThrow(ConfigValidationError);
    expect(() => resolveConfig({ endpoint: 'ftp://example.com' })).toThrow(ConfigValidationError);
    expect(() => resolveConfig({ endpoint: 'ws://example.com' })).toThrow(ConfigValidationError);
  });

  it('throws on out-of-range batchSize', () => {
    expect(() => resolveConfig({ ...valid, batchSize: 0 })).toThrow(ConfigValidationError);
    expect(() => resolveConfig({ ...valid, batchSize: 501 })).toThrow(ConfigValidationError);
  });

  it('throws on flushIntervalMs < 500', () => {
    expect(() => resolveConfig({ ...valid, flushIntervalMs: 499 })).toThrow(ConfigValidationError);
  });

  it('throws on sampleRateMs < 16', () => {
    expect(() => resolveConfig({ ...valid, sampleRateMs: 15 })).toThrow(ConfigValidationError);
  });

  it('throws on maxBufferSize < batchSize', () => {
    expect(() => resolveConfig({ ...valid, batchSize: 50, maxBufferSize: 49 })).toThrow(ConfigValidationError);
  });
});
