---
type: adr
status: Proposed
date: 2026-07-09
module: Billing
related_docs: ["DOC-003", "DOC-023"]
tags: [adr, cost-circuit-breaker, abuse-prevention]
---

# ADR-037: Cost Circuit Breaker

## Context

Two failure modes that a dashboard can't catch fast enough: per-workspace abuse and per-provider retry storms.

## Decision

**Two independent breakers:**

1. **Per-workspace:** If trailing 24h AI+scraping cost exceeds 5x plan tier's expected cost, pause new job submissions. In-flight jobs complete normally (consistent with ADR-030).

2. **Per-provider (global):** If total spend against a single provider spikes abnormally, trip breaker that falls back to next routing ladder rung or pauses provider entirely.

**Relationship to existing margin-guardrail dashboard:** Dashboard remains for trend/forecasting. These breakers are automatic backstops for spikes between dashboard checks.

## Implementation

- Counter storage: Upstash Redis or Postgres
- Per-workspace: check on job submission, release on completion
- Per-provider: aggregate cost events from adapters, alert on threshold
- Fallback: route to next tier (T-A → T-B → T-C) or pause

## Related

- [[08-Decisions/ADR-030-credit-reservation-subscription|ADR-030]] (in-flight work preservation)
- [[03-API/_API-MOC|API]]
- [[05-Security-Legal/DOC-021-Security-Privacy-Compliance|Security]]
