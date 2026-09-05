---
title: "ADR-022: Uniform Adapter Contract"
type: adr
status: accepted
date: 2026-07-06
tags: [adr, architecture, adapters, doc-17]
---

# ADR-022: Uniform Adapter Contract

## Status

Accepted

## Context

MUSHIN calls many external services (Meilisearch, Groq, Anthropic, Apify, Serper, Paddle, YouTube API). Without a uniform contract, each integration is ad-hoc, with inconsistent error handling, retry logic, and observability.

## Decision

**Every external service call goes through an adapter.** No module may call an external service except through its adapter. Each adapter provides 7 obligations:

1. **Credential management** — from secret store only
2. **Retry discipline** — idempotent-safe, exponential backoff + jitter
3. **Circuit breaker** — error rate threshold → open → degrade to named state
4. **Cost emission** — `cost.recorded` event per call (NFR-C01)
5. **Health reporting** — rolling success rate, latency percentiles
6. **Degraded-mode contract** — named states consumed by feature fallback ladders
7. **Sandbox parity** — test double + provider sandbox configuration

## Consequences

### Positive

- Consistent error handling across all external calls
- Per-call cost telemetry (NFR-C01, FS-10.03)
- Circuit breakers prevent cascading failures
- Sandbox parity enables testing without hitting real APIs

### Negative

- More code per integration (adapter boilerplate)
- Adapter layer adds indirection

## Related

- Doc 17 (Adapter contracts)
- `packages/adapters/src/` (implementation)
