---
type: architecture
status: accepted
created: "2026-07-05"
updated: "2026-07-06"
---

# Two-Brains Model (ADR-016 / ADR-018)

## Overview

The "Two-Brains" architecture splits MUSHIN into two distinct operational and economic planes:

1. **Brain 1: Indexed Search & Read Path (Deterministic & Free)** — Instant, sub-second query execution using a managed search index (Meilisearch/Typesense-class) over GCP projections.
2. **Brain 2: Live Discovery & Intelligence / Write Path (AI-Driven & Metered)** — Asynchronous candidate discovery, ingestion, and scoring pipeline (`Serper → Apify / YouTube Data API v3 → LLM M6 Scoring → GCP`).

## Why Two Brains?

- **Economic Protection (ADR-018):** Intelligence costs scale strictly with *ingestion volume* (metered and credit-funded), never with *query volume* (free-tier abusable).
- **Performance & Determinism:** Brain 1 guarantees p95 < 1s filtered search (NFR-P01) and identical query results for identical index states (FS-02.03), avoiding the latency and non-determinism of query-time LLM execution.

## Data-Gap Ladder Tiers (Doc 8 A2)

Every creator profile in MUSHIN is classified into one of four resolution tiers based on data completeness:

1. **Rich:** Full multi-platform profile, verified metrics, complete A4 authenticity evidence breakdown, audience demographics and geo-shares (sourced via YouTube Data API v3 or complete Apify profile/post/comment scrapes).
2. **Standard:** Verified profile and recent engagement metrics, basic authenticity scoring, partial audience geo.
3. **Sparse:** Basic profile bio, follower count, unverified engagement estimate, missing audience geo or comment sentiment.
4. **Minimal:** Stub record (name/handle/URL only) from candidate discovery or add-by-URL before enrichment.

## Pipeline Flow

1. **Discovery (Brain 2):** Serper candidate query → Apify actor run / YouTube API lookup → Raw payload extract.
2. **Scoring (Brain 2):** Groq/Anthropic LLM routing ladder (T-A / T-B / T-C) scores authenticity, niche, and audience → Grounding validator verifies claims against raw metrics.
3. **Projection (Brain 1):** Structured attributes persisted in GCP DB and projected to Meilisearch/Typesense index for instant retrieval.

## References

- [[01-Architecture/Doc-14-High-Level-Software-Architecture|Doc 14: Service Boundaries & Architecture]]
- [[01-Architecture/Doc-15-AI-Intelligence-Layer|Doc 15: AI Intelligence & Search Architecture]]
- [[08-Decisions/ADR-016-two-brains-architecture|ADR-016: Two-Brains Architecture]]
- [[08-Decisions/ADR-028-batch-rescoring-cost-gate|ADR-028: Batch Re-Scoring Cost Gate]]
