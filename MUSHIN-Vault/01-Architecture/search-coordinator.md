---
title: "Search Coordinator — M3 Architecture"
status: Active
last_updated: 2026-07-06
tags: [architecture, m3, search, brain-1, doc-15]
---

# Search Coordinator — M3 Architecture

**Source:** Doc 15 (AI Intelligence Layer) | **Module:** M3

## Overview

M3 is the Search Coordinator — the entry point for all creator search operations. It implements the "Two Brains" model:

- **Brain 1 (Fast):** Meilisearch query → deterministic ranking → sub-second, zero LLM cost
- **Brain 2 (Live):** Serper → Apify → LLM → M5 Standardize → GCP persist → Meilisearch (credit-quoted, user-confirmed, async)

Brain 1 always executes first. Brain 2 is offered only when results are insufficient.

---

## Brain 1 Query Flow

```
User query (filters or NL)
  ↓
[NL path] T-A LLM (Groq llama-3.1-8b-instant) → structured filters
  ↓ (cached 24h, normalized query key)
Meilisearch query with filterable attributes
  ↓
Deterministic ranking (5 weighted factors)
  ↓
Ranked results with CC-001 explanation badges
```

### Filtered Search (FS-02.01)
- **Endpoint:** `GET /api/v1/creators/search`
- **NFR:** p95 < 1s (NFR-P01)
- **Zero LLM tokens** — pure Meilisearch query

### NL Search (FS-02.02)
- **Endpoint:** `POST /api/v1/creators/search/nl`
- **NFR:** p95 < 3s (NFR-P02)
- **1 cheap-model call** (T-A) for translation, cached 24h
- **Fallback:** keyword mode with honest chip on LLM failure

---

## Ranking Formula (Doc 15 B3)

Ranking is **computed, not generated** — identical query + index state = identical results (FS-02.03).

| Factor | Weight | Source |
|---|---|---|
| Relevance | 0.25 | Meilisearch built-in text relevance |
| Criteria Match | 0.20 | How well creator attributes match explicit filter criteria |
| Authenticity | 0.20 | Stored authenticity band weight (strong=1.0, moderate=0.7, weak=0.4) |
| Quality | 0.15 | Stored quality score (0-1, from M6) |
| Freshness | 0.10 | Exponential decay from last enrichment date (half-life 30 days) |
| Fairness (T5) | 0.10 | Size-band normalization (creators compete within their band) |

**Weights are configuration (flag-tunable), not per-query LLM output.** Defined in `packages/api/src/ranks/m3-search/ranking.ts` as `DEFAULT_RANKING_WEIGHTS`.

### T5 Long-Tail Fairness Bands

| Band | Follower Range | Description |
|---|---|---|
| nano | 0 – 10,000 | Nano-influencers |
| micro | 10,000 – 100,000 | Micro-influencers |
| mid | 100,000 – 500,000 | Mid-tier |
| macro | 500,000 – 1,000,000 | Macro-influencers |
| mega | 1,000,000+ | Mega-influencers |

Creators compete within their follower band, not against all sizes. A 15k-follower creator can rank #1 for a micro-band query. The fairness score is normalized within the band (0.5 at bottom, 1.0 at top).

Each factor is a **stored value** → CC-001 explanation badges are computational, never LLM narrative.

---

## NL Translation Pipeline (Doc 15 B2)

1. User submits NL query
2. Check interpretation cache (normalized query → interpretation, 24h TTL)
3. Cache miss → call T-A LLM (Groq `llama-3.1-8b-instant`)
4. Validate LLM output against filter vocabulary schema
5. On validation failure: one retry → fallback to keyword mode with honest chip
6. Cache the interpretation
7. Render as editable chips (FS-02.02) before retrieval

**Chip edit rate** is a quality signal: >40% = interpretation failure (Doc 15 Part E).

---

## Implementation Files

- Filtered search: `packages/api/src/routes/m3-search/filtered-search.ts`
- NL search: `packages/api/src/routes/m3-search/nl-search.ts`
- Credit quote: `packages/api/src/routes/m3-search/quote.ts`
- Meilisearch adapter: `packages/adapters/src/meilisearch/adapter.ts`
- Index projection: `packages/database/src/projections/creator-index-projection.ts`
