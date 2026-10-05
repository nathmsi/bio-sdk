# ADR 002 — Zero runtime dependencies in the SDK

**Status:** Accepted  
**Date:** 2024-10

## Context

The SDK is embedded as a third-party script in host pages. Every byte and every dependency is a risk.

## Decision

The `@bio-sdk/sdk` package declares zero `dependencies` (only `devDependencies`). All logic is implemented in vanilla TypeScript. Types from `@bio-sdk/protocol` are erased at build time — only values (the Zod schemas) would add weight, so the SDK does its config validation manually.

## Consequences

- **+** Bundle size stays under 2 kB gzip regardless of upstream library changes.
- **+** No supply chain attack surface via transitive dependencies.
- **+** No version conflicts with host page's own libraries.
- **−** Manual config validation is more verbose than Zod — mitigated by clear error messages in `ConfigValidationError`.
- **−** No automatic schema sync between SDK validation and server validation — mitigated by the shared `@bio-sdk/protocol` types and contract tests.
