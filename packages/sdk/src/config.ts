import type { BioConfig, ResolvedConfig } from './types.js';

export const DEFAULTS = {
  batchSize: 50,
  flushIntervalMs: 5000,
  sampleRateMs: 50,
  maxBufferSize: 1000,
  useWorker: false,
  debug: false,
} as const;

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`[BioSDK] Config error: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

/** Validates and resolves a user config into a ResolvedConfig with safe defaults. */
export function resolveConfig(cfg: BioConfig): ResolvedConfig {
  if (!cfg.endpoint || typeof cfg.endpoint !== 'string') {
    throw new ConfigValidationError('`endpoint` is required and must be a non-empty string.');
  }
  try {
    const u = new URL(cfg.endpoint);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      throw new Error('bad protocol');
    }
  } catch {
    throw new ConfigValidationError(
      `\`endpoint\` must be a valid http:// or https:// URL. Got: "${cfg.endpoint}"`,
    );
  }

  const batchSize = cfg.batchSize ?? DEFAULTS.batchSize;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new ConfigValidationError('`batchSize` must be an integer between 1 and 500.');
  }

  const flushIntervalMs = cfg.flushIntervalMs ?? DEFAULTS.flushIntervalMs;
  if (!Number.isInteger(flushIntervalMs) || flushIntervalMs < 500) {
    throw new ConfigValidationError('`flushIntervalMs` must be an integer ≥ 500.');
  }

  const sampleRateMs = cfg.sampleRateMs ?? DEFAULTS.sampleRateMs;
  if (!Number.isInteger(sampleRateMs) || sampleRateMs < 16) {
    throw new ConfigValidationError('`sampleRateMs` must be an integer ≥ 16 (one frame).');
  }

  const maxBufferSize = cfg.maxBufferSize ?? DEFAULTS.maxBufferSize;
  if (!Number.isInteger(maxBufferSize) || maxBufferSize < batchSize) {
    throw new ConfigValidationError(
      '`maxBufferSize` must be an integer ≥ `batchSize`.',
    );
  }

  return {
    endpoint: cfg.endpoint,
    batchSize,
    flushIntervalMs,
    sampleRateMs,
    maxBufferSize,
    useWorker: cfg.useWorker ?? DEFAULTS.useWorker,
    debug: cfg.debug ?? DEFAULTS.debug,
    onError: cfg.onError ?? (() => undefined),
  };
}
