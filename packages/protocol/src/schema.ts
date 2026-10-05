import { z } from 'zod';

/** Protocol version — bump when the shape changes. */
export const PROTOCOL_VERSION = '1' as const;

export const EventTypeSchema = z.enum([
  'mousemove',
  'click',
  'scroll',
  'keydown',
  'keyup',
  'pointerdown',
  'pointerup',
  'touchstart',
  'touchend',
]);

export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * A single captured behavioral signal.
 * Coordinates are always clientX/Y — never element-relative.
 * Key values are NEVER included (privacy by design).
 */
export const BioEventSchema = z.object({
  /** Unix timestamp in ms */
  t: z.number().int().positive(),
  type: EventTypeSchema,
  /** clientX — absent for keyboard and scroll events */
  x: z.number().optional(),
  /** clientY — absent for keyboard and scroll events */
  y: z.number().optional(),
  /** Delta ms since the previous event of the same type */
  dt: z.number().nonnegative().optional(),
});

export type BioEvent = z.infer<typeof BioEventSchema>;

/** Batch of events sent by the SDK to the collection endpoint. */
export const BioPayloadSchema = z.object({
  /** Protocol version for forward compatibility */
  v: z.literal(PROTOCOL_VERSION),
  /** Opaque session UUID, generated at init() */
  sessionId: z.string().uuid(),
  /** Batch creation timestamp */
  ts: z.number().int().positive(),
  events: z.array(BioEventSchema).min(1).max(500),
});

export type BioPayload = z.infer<typeof BioPayloadSchema>;

/**
 * Privacy invariant — use in tests to prove no sensitive data leaks.
 * Returns the offending value if found, undefined if clean.
 */
export function findPrivacyLeak(
  payload: unknown,
  sensitiveKeys = ['key', 'code', 'which', 'char', 'value', 'data'],
): string | undefined {
  const str = JSON.stringify(payload);
  for (const k of sensitiveKeys) {
    // Match `"key":` or `"code":` as JSON object keys
    const pattern = new RegExp(`"${k}"\\s*:`);
    if (pattern.test(str)) return k;
  }
  return undefined;
}
