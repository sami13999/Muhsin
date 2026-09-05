---
type: adr
status: Proposed
date: 2026-07-09
module: Infrastructure
related_docs: ["DOC-020", "DOC-022"]
tags: [adr, rate-limiting, redis, upstash]
---

# ADR-034: Rate Limiting Strategy

## Context

Per-workspace submission limits are needed at the API layer *before* jobs reach queues — not just queue depth or consumer-side throttling, which only limits damage after the fact.

## Decision

**Per-workspace concurrent job cap:**
- Discovery jobs: max 3 concurrent jobs per workspace (flagged for product sign-off)
- Enforced via a counter keyed on `workspace_id`, checked at submission time, released on job completion/failure
- Backed by Upstash Redis (per ADR-033) or Postgres counter table

**General API rate limiting:**
- Token-bucket limiting per DOC-020 catalog
- Discovery-specific concurrent-job cap is separate from general request-rate limits

## Consequence

Discovery-storm protection becomes a submission-time check, not a queue-capacity problem discovered under load.

## Implementation

- Counter storage: Upstash Redis (if token permissions fixed) or Postgres table
- Check location: API handler before job creation
- Release: on job completion/failure event
- Monitoring: alert on counter approaching limit

## Related

- [[08-Decisions/ADR-033-stack-pivot|ADR-033]] (Redis scope)
- [[03-API/_API-MOC|API]]
- [[06-Operations/DOC-022-Infrastructure-Deployment|Infrastructure]]
