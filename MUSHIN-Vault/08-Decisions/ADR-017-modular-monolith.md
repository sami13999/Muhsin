---
title: "ADR-017: Modular Monolith + Worker Fleet"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, architecture, monolith, workers]
---

# ADR-017: Modular Monolith + Worker Fleet

## Status

Accepted

## Context

MUSHIN needs to balance development speed (small team) with scalability (async processing for scraping, LLM scoring, outreach). Microservices are premature; a single process can't handle async workloads.

## Decision

Adopt a **modular monolith + worker fleet:**

- **Monolith:** Next.js (web) + Hono (API) in a single Turborepo. Modules M1-M13 share a process but communicate through defined interfaces.
- **Workers:** Separate worker processes for async workloads (M4 discovery, M5 standardization, M6 scoring, M7 timeline, M9 outreach).
- **Communication:** Queue-only async (SQS FIFO). No direct module-to-module async calls.
- **Adapter exclusivity:** Every external service call goes through an adapter (ADR-022).

## Consequences

### Positive

- Fast development iteration (single deploy)
- Clear module boundaries (Doc 14)
- Async workloads don't block API responses
- Module extraction is cheap (M4 first candidate) when triggers fire

### Negative

- Shared process means shared failure domain
- Module extraction requires queue-based communication (already in place)

## Extraction Triggers (Pre-agreed)

Extract a module when ANY of:
1. Queue class requires sustained concurrency degrading co-tenant workloads (>20% latency SLO erosion, 2 weeks)
2. Deploy cadence blocks others (>2 hotfixes/month delayed)
3. Resource profile diverges (M6 GPU-adjacent vs web-serving)
4. Team structure splits ownership (≥2 teams)

## Related

- Doc 14 (Module map)
- Doc 16 (Event architecture)
- Doc 22 (Infrastructure)
