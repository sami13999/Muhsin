---
title: "ADR-027: Synchronous Index Projection for New Creators"
status: Accepted
date: 2026-07-06
tags: [adr, search, meilisearch, projection, adr-027]
---

# ADR-027: Synchronous Index Projection for New Creators

**Status:** Accepted
**Date:** 2026-07-06
**Decision Makers:** Principal Architect (Software), Principal Architect (AI/Search)

---

## Context

When a new creator is discovered and persisted to the GCP (Global Creator Plane), Brain 1 (Meilisearch) must be able to serve that creator in search results immediately. If projection to the search index were asynchronous, there would be a window where:
- A user triggers a Live Discovery job
- The job discovers and persists a new creator to GCP
- The user searches for that creator immediately after
- Brain 1 returns no results because the index hasn't been updated yet

This creates a confusing UX where the user just saw a creator discovered but can't find them in search.

## Decision

**New creators are projected to Meilisearch synchronously at ingestion time**, within the same request flow as GCP persistence (M5 Standardize & Ingestion).

The projection function `projectCreatorToIndex(creatorId)` is called by M5 immediately after the creator row is committed to GCP. It:
1. Reads the creator + primary profile from GCP tables
2. Reads current enrichment snapshots (authenticity, quality, audience, summary)
3. Reads current niche classification
4. Flattens into the Meilisearch document schema (Doc 15 B1)
5. Upserts to Meilisearch via the adapter
6. On failure: sets `index_pending = TRUE` on the creator row (ADR-027 flag)

The `index_pending` flag is a safety net: if the synchronous projection fails (Meilisearch unavailable, circuit breaker open), the creator exists in GCP but is marked as pending. A background re-projection job sweeps `WHERE index_pending = TRUE` and retries.

## Consequences

### Positive
- **Immediate searchability:** New creators appear in Brain 1 results within seconds of discovery
- **Consistent UX:** No "creator just discovered but not searchable" confusion
- **Simple mental model:** Write = indexed (usually), with a clear fallback path

### Negative
- **Latency added to ingestion path:** The Meilisearch upsert adds ~50-200ms to the M5 pipeline
- **Coupling:** M5 now depends on Meilisearch availability (mitigated by circuit breaker + `index_pending` fallback)
- **Cost:** Meilisearch Cloud has near-zero marginal cost per document, but the write path is no longer free

### Risks
- **R-TEC-010 (Index/GCP projection drift):** If the background re-projection job fails silently, creators remain invisible in search. Mitigated by M12 alerting on `index_pending` count > 100 for > 10 minutes.

## Alternatives Considered

1. **Async projection (queue-based):** Creator persists to GCP, event emitted, worker projects to index. Rejected: introduces 5-30 second delay, creates the UX confusion described above.

2. **Lazy projection (on first search):** Project to index when first queried. Rejected: first search is slow, and the "discovered but not searchable" window still exists for non-queried creators.

3. **Hybrid (sync for high-value, async for rest):** Project synchronously for creators added via add-by-URL (user-waiting), async for bulk discovery. Rejected: adds complexity for marginal benefit; the synchronous path is fast enough for all cases.

## Related

- Doc 15 Part B1 (Index technology & schema strategy)
- Doc 19 Part C (GCP schema — `index_pending` flag)
- ADR-018 (Write-path intelligence)
- ADR-020 (Transactional outbox)
- PATCH-009 (Index pending flag)

---

*This ADR was generated as part of Sprint 4 Phase 4.1 implementation.*
