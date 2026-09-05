---
title: "ADR-016: Two Brains Pipeline"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, architecture, search, two-brains]
---

# ADR-016: Two Brains Pipeline

## Status

Accepted

## Context

MUSHIN needs to provide creator search with two competing requirements: instant results for common queries (sub-second), and deep intelligence for new/specific queries (LLM-powered scoring). A single-brain approach can't satisfy both.

## Decision

Adopt a **Two Brains architecture:**

- **Brain 1 (Fast):** Meilisearch query → deterministic ranking → sub-second, zero LLM cost. Always executes first.
- **Brain 2 (Live):** Serper → Apify → LLM → M5 Standardize → GCP persist → Meilisearch. Credit-quoted, user-confirmed, async (3-10 min).

Brain 1 always executes first. Brain 2 is offered only when results are insufficient. Brain 2 is NEVER implicit — user must confirm credit quote.

**Write-path intelligence (ADR-018):** All LLM reasoning happens at ingestion time, not query time. Read path is deterministic.

## Consequences

### Positive

- Sub-second search for common queries (zero LLM cost)
- Deep intelligence available when needed (credit-funded)
- Write-once-read-many: LLM cost scales with ingestion, not query volume
- Deterministic ranking (FS-02.03)

### Negative

- Brain 2 adds latency (3-10 min) and cost (credits)
- Requires credit system (M10) before Brain 2 can be used
- Two code paths to maintain

## Related

- ADR-018 (Write-path intelligence)
- Doc 15 (AI Intelligence Layer)
- Doc 8 (Constraint funnel)
