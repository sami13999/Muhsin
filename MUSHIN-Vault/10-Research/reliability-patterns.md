---
type: research
section: reliability
sources: [layers.txt, layers2.txt, layers3.txt]
---

# Reliability Patterns

Distilled from multi-model research. Each pattern mapped to MUSHIN implementation status.

## 1. Retries with Exponential Backoff

**Pattern:** Retry only idempotent operations. Max 3 attempts. Exponential backoff with jitter: `delay = min(cap, base * 2^attempt) * (0.5 + random()*0.5)`.

**MUSHIN Status:** ✅ Implemented in all 6 adapters (Paddle, Meilisearch, LLM, Serper, Apify, Resend).
**Code:** `packages/adapters/src/*/adapter.ts` — `withRetry()` function.
**ADR:** ADR-022 (Uniform Adapter Contract).

## 2. Circuit Breakers

**Pattern:** Three states — Closed (normal), Open (fail fast), Half-Open (probe). Open after N consecutive failures or error rate > threshold. Per-dependency breakers, not global.

**MUSHIN Status:** ✅ Implemented on all 6 adapters.
**Code:** `packages/adapters/src/*/adapter.ts` — `CircuitState`, `recordFailure()`, `isCircuitOpen()`.
**ADR:** ADR-022.

## 3. Dead Letter Queues

**Pattern:** Every queue has a DLQ. DLQ monitored as P1 alert when growth exceeds threshold. DLQ messages have full context. Weekly review. Replay tooling.

**MUSHIN Status:** ⚠️ Partial — DLQ queue exists per ADR-031, but no DLQ monitoring alerting or replay tooling.
**Code:** `apps/workers/src/worker.ts` — visibility timeout handles failed messages.
**Gap:** No DLQ depth alerting, no replay tooling.

## 4. Graceful Degradation

**Pattern:** Every feature has a documented degradation path. Customers see banner, not silent failures.

**MUSHIN Status:** ⚠️ Partial — circuit breakers fail fast, but no cached fallbacks or degradation banners.
**Gap:** No cached fallback for Meilisearch/Serper/Paddle. No UI degradation indicators.

## 5. Idempotency

**Pattern:** Every mutating API accepts Idempotency-Key. Server stores (key, tenant_id, request_hash, response, expires_at). Replays return cached response.

**MUSHIN Status:** ✅ Implemented — `IDEMPOTENCY_TTL_HOURS` env var, `processed_event_ledger` for event idempotency.
**Code:** `apps/workers/src/worker.ts` — `isEventProcessed()`, `markEventProcessed()`.

## 6. Transactional Outbox

**Pattern:** Events written in same transaction as state change. Relay publishes async. Exactly-once via FOR UPDATE SKIP LOCKED.

**MUSHIN Status:** ✅ Implemented.
**Code:** `packages/events/src/relay.ts`, `packages/events/src/emit.ts`.
**ADR:** ADR-020.

## 7. SELECT FOR UPDATE

**Pattern:** Row-level locking for concurrent credit operations. Prevents race conditions.

**MUSHIN Status:** ✅ Implemented.
**Code:** `packages/database/src/repositories/credit.repository.ts`.
**ADR:** ADR-026.

## 8. Rollback Strategy

**Pattern:** Blue-green or canary with automated rollback on SLO breach. Database migrations backward-compatible (expand-contract).

**MUSHIN Status:** ⚠️ Partial — expand-contract migrations documented, but no canary deployment or automated rollback.
**Gap:** CI deploy is placeholder. No canary analysis.

## Related

- [[10-Research/Research-Insights-MOC|Research Insights MOC]]
- [[08-Decisions/ADR-022-uniform-adapter-contract|ADR-022]]
- [[08-Decisions/ADR-020-transactional-outbox|ADR-020]]
- [[08-Decisions/ADR-026-select-for-update-credit|ADR-026]]
