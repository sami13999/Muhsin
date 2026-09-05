---
title: "ADR-018: Write-Path Intelligence"
type: adr
status: accepted
date: 2026-07-05
tags: [adr, architecture, llm, write-path]
---

# ADR-018: Write-Path Intelligence

## Status

Accepted

## Context

LLM calls are expensive and slow. If LLM reasoning happens at query time, search becomes non-deterministic, expensive, and slow. Users expect instant, consistent results.

## Decision

**All LLM reasoning happens at ingestion time (write path), not query time (read path).**

- Classification, authenticity reasoning, audience estimation, and summarization execute once at ingestion (Brain 2)
- Results are persisted as structured attributes in GCP
- Query time uses only fast index retrieval + one cheap translation call (NL → filters)
- Read path is deterministic: identical query + index state → identical results (FS-02.03)

## Consequences

### Positive

- Query time is fast (sub-second) and cheap (zero LLM tokens for filtered search)
- Results are deterministic and explainable (CC-001)
- LLM cost scales with ingestion volume (metered, credit-funded), not query volume (free-tier-abusable)
- The economically dangerous surface (query-time LLM) is structurally absent

### Negative

- Stale data requires re-ingestion (not re-query)
- Prompt improvements require batch re-scoring (ADR-028)
- Ingestion pipeline is more complex (M4 → M5 → M6 chain)

## Related

- ADR-016 (Two Brains)
- Doc 15 Part B (Brain 1 architecture)
- Doc 15 Part D (Cost architecture)
