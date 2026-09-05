---
title: "Adapter Contracts — ADR-022"
status: Active
last_updated: 2026-07-07
tags: [architecture, adapters, adr-022, doc-17]
---

# Adapter Contracts — ADR-022

## 7 Obligations (ADR-022)

Every external service call goes through an adapter. Each adapter provides:

1. **Credential management** — from secret store only (env vars via `@mushin/config`)
2. **Retry discipline** — idempotent-safe, exponential backoff + jitter
3. **Circuit breaker** — error rate threshold → open → degrade to named state
4. **Cost emission** — `cost.recorded` event per call (NFR-C01)
5. **Health reporting** — rolling success rate, latency percentiles
6. **Degraded-mode contract** — named states consumed by feature fallback ladders
7. **Sandbox parity** — test double + provider sandbox configuration

## Implemented Adapters

### Meilisearch Adapter

**File:** `packages/adapters/src/meilisearch/adapter.ts`

| Obligation | Implementation |
|---|---|
| Credentials | `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY` from env |
| Retry | Exponential backoff on 5xx, max 3 retries. No retry on 4xx (except 429) |
| Circuit breaker | 10% error rate in 5min window → open. 30s recovery probe (half-open) |
| Cost emission | `recordCost()` method, provider: 'meilisearch', unitCost: 0 |
| Health | `ping()` → boolean, `getIndexStats()` → document count + indexing status |
| Degraded mode | Three states: `available`, `degraded` (high latency >2s), `unavailable` (circuit open) |
| Sandbox | Constructor accepts host/apiKey params, overridable for tests |

**Circuit breaker thresholds:**
- Failure threshold: 10 failures in 5-minute window
- Recovery probe: 30 seconds after circuit opens
- Half-open: allows one probe request

### LLM Adapter

**File:** `packages/adapters/src/llm/adapter.ts`

| Obligation | Implementation |
|---|---|
| Credentials | `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` from env |
| Retry | Exponential backoff, max 2 retries. No retry on 4xx |
| Circuit breaker | Tier-dependent: 5 failures in 5min → open, 30s recovery |
| Cost emission | `cost.recorded` with provider, model, tokens, unitCost |
| Health | Circuit status per tier |
| Degraded mode | Per-tier circuit states: T-A, T-B, T-C independent |
| Sandbox | API key override for tests |

**Model routing ladder (Doc 15 Part C1):**

| Tier | Model | Provider | Tasks |
|---|---|---|---|
| T-A | `llama-3.1-8b-instant` | Groq | Classification, extraction, query translation |
| T-B | `llama-3.3-70b-versatile` | Groq | Summaries, audience estimation, standard scoring |
| T-C | `claude-sonnet-4-5` | Anthropic | Ambiguous authenticity, dispute re-eval |

**Circuit breaker thresholds:**
- T-A: 5 failures in 5min → open
- T-B: 5 failures in 5min → open
- T-C: 5 failures in 5min → open
- Each tier has independent circuit state
- Recovery probe: 30 seconds

**Runtime downward substitution is PROHIBITED on T-B/T-C.** Honest failure > silent quality degradation.

## Degraded-Mode States

| State | Description | Consumer behavior |
|---|---|---|
| `available` | Normal operation | Proceed normally |
| `degraded` | High latency (>2s) or partial failure | Proceed with timeout warning |
| `unavailable` | Circuit open, no requests accepted | Return fallback/default, log warning |

## Implementation Files

- Meilisearch: `packages/adapters/src/meilisearch/adapter.ts`
- LLM: `packages/adapters/src/llm/adapter.ts`
