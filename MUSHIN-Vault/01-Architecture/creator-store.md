---
title: "Creator Store — M2 Architecture"
status: Active
last_updated: 2026-07-06
tags: [architecture, m2, creator-store, gcp, doc-14]
---

# Creator Store — M2 Architecture

**Source:** Doc 14 (M2 Module Frame) | **Module:** M2

## Overview

M2 is the Creator Store — the data-access layer for the Global Creator Plane (GCP). It is the **ONLY module authorized to read/write GCP tables directly** (Doc 14 boundary rule). All other modules access creator data through M2's interfaces.

## Repository Layer

**File:** `packages/database/src/repositories/creator.repository.ts`

Every method takes a Drizzle instance as the first parameter so it can participate in callers' transactions (ADR-020 outbox writes in the same transaction).

| Method | Description |
|---|---|
| `findById(db, id)` | Creator + profiles + current enrichment snapshots + current niche classifications |
| `findByHandle(db, handle, platform)` | Find by profile handle + platform (dedup / add-by-URL) |
| `list(db, filters, page, limit)` | Paginated list with filters (platform, follower range, engagement range, niche, authenticity, completeness) |
| `create(db, input)` | Insert creator + profile in one transaction |
| `updateProfile(db, profileId, data)` | Update profile fields (used by M5 after standardization) |
| `upsertEnrichmentSnapshot(db, creatorId, data)` | Insert new snapshot, mark previous as not current |
| `classifyNiche(db, creatorId, nicheId, confidence, source)` | Insert niche classification, mark previous as not current |
| `acquireInflightUrlLock(db, url, jobId)` | INSERT with ON CONFLICT DO NOTHING (PATCH-007) |
| `releaseInflightUrlLock(db, url)` | DELETE from inflight_url_lock |

## Meilisearch Projection (ADR-027)

**File:** `packages/database/src/projections/creator-index-projection.ts`

New creators are projected to Meilisearch **synchronously** at ingestion time. The projection:

1. Reads creator + all relations via the repository
2. Maps to `CreatorIndexDocument` (Doc 15 B1)
3. Upserts to Meilisearch via the adapter
4. On failure: returns `{ success: false, reason: 'projection_deferred' }` — creator exists in GCP but not in search index

The projection is called **after** the GCP write, but **NOT** in the same Postgres transaction (Meilisearch is external). If Meilisearch is down, the creator still gets created in GCP.

## API Endpoints

**File:** `packages/api/src/routes/m2-creator/creator.routes.ts`

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/creators/:id` | GET | Single creator detail (FS-01.01, SCR-02). Returns creator + profiles + enrichment + niches. |
| `/api/v1/creators` | GET | List creators (DB-backed, not Meilisearch). For admin views and detail pages. |
| `/api/v1/creators` | POST | Create creator. Validates input, checks for duplicate handle+platform, creates in GCP, projects to Meilisearch (ADR-027). |

### POST /api/v1/creators — Request Body

```json
{
  "name": "string",
  "handle": "string",
  "platform": "instagram|tiktok|youtube|twitter|facebook",
  "canonicalUrl": "https://...",
  "bio": "string (optional)",
  "followerCount": 0,
  "postCount": 0,
  "location": "string (optional)",
  "languages": ["en", "ur"],
  "completenessTier": "minimal|sparse|standard|rich"
}
```

### POST /api/v1/creators — Response (201)

```json
{
  "data": {
    "creator": { ... },
    "profiles": [ ... ],
    "enrichment": [ ... ],
    "niches": [ ... ]
  },
  "projection": {
    "status": "indexed|deferred",
    "reason": "string (if deferred)"
  },
  "meta": { "request_id": "req_..." }
}
```

## Data Flow

```
M5 Ingestion → creatorRepository.create(db, input)
             → creatorRepository.upsertEnrichmentSnapshot(db, ...)
             → creatorRepository.classifyNiche(db, ...)
             → projectCreatorToIndex(creatorId, db, meilisearch)
             → Meilisearch upsert (external, not in PG transaction)
```

## Implementation Files

- Repository: `packages/database/src/repositories/creator.repository.ts`
- Projection: `packages/database/src/projections/creator-index-projection.ts`
- API routes: `packages/api/src/routes/m2-creator/creator.routes.ts`
