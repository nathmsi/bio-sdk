# ADR 001 — Transport: sendBeacon first, fetch fallback

**Status:** Accepted  
**Date:** 2024-10

## Context

The SDK must reliably deliver event batches even when the user closes the tab immediately after interacting.

## Decision

Use `navigator.sendBeacon()` as the primary transport. Fall back to `fetch({ keepalive: true })` when `sendBeacon` returns `false` (quota exhausted). Add exponential backoff with jitter for the fetch path.

## Consequences

- **+** `sendBeacon` is fire-and-forget at the OS level — the browser queues it even after the JS context is destroyed.
- **+** No CORS preflight for `sendBeacon` with `Blob` payloads typed as `application/json` (treated as a simple request).
- **−** `sendBeacon` has a per-origin quota (~64 kB queued); overflow silently drops — mitigated by the fetch fallback.
- **−** `fetch` with `keepalive: true` is not supported in Firefox for cross-origin requests with bodies > 64 kB.
- **−** No ordering guarantee across retries — acceptable for behavioral signals which are analyzed as statistical distributions.
