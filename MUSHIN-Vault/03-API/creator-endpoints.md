---
title: "Creator Endpoints — M2 API"
status: Active
last_updated: 2026-07-07
tags: [api, m2, creator, endpoints, doc-20]
---

# Creator Endpoints — M2 API

**Module:** M2 Creator Store | **Source:** Doc 20

---

## GET /api/v1/creators/:id

Single creator detail (FS-01.01, SCR-02).

**Headers:** `Authorization: Bearer <jwt>`, `X-Workspace-ID: <uuid>`

**Response (200):**
```json
{
  "data": {
    "creator": { "creatorId": "...", "displayName": "...", ... },
    "profiles": [ { "profileId": "...", "platform": "instagram", ... } ],
    "enrichment": [ { "snapshotId": "...", "snapshotType": "authenticity", ... } ],
    "niches": [ { "classificationId": "...", "primaryNiche": "pk_fashion_textile", ... } ]
  },
  "meta": { "request_id": "req_..." }
}
```

**Errors:** 400 `INVALID_UUID`, 404 `RESOURCE_NOT_FOUND`

---

## GET /api/v1/creators

List creators (direct DB, not Meilisearch).

This is the DB-backed list endpoint for admin views, detail pages, and internal tools. The search endpoint (`/api/v1/creators/search`) is M3's responsibility and uses Meilisearch.

**Headers:** `Authorization: Bearer <jwt>`, `X-Workspace-ID: <uuid>`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `platform` | enum | instagram, tiktok, youtube, twitter, facebook |
| `follower_min` | int | Minimum follower count |
| `follower_max` | int | Maximum follower count |
| `engagement_rate_min` | float | Min engagement rate (0-1) |
| `engagement_rate_max` | float | Max engagement rate (0-1) |
| `niche` | string | Niche slug |
| `authenticity_band` | enum | strong, moderate, weak |
| `completeness_tier` | enum | rich, standard, sparse, minimal |
| `audience_pk_share_min` | float | Min PK audience share (0-1) — CC-003 |
| `audience_gcc_share_min` | float | Min GCC audience share (0-1) — CC-003 |
| `page` | int | Page number (default: 1) |
| `limit` | int | Results per page (default: 20, max: 100) |

**Response (200):**
```json
{
  "data": [
    {
      "creator": { ... },
      "profiles": [ ... ],
      "enrichment": [ ... ],
      "niches": [ ... ]
    }
  ],
  "total": 1450,
  "page": 1,
  "limit": 20,
  "meta": { "request_id": "req_..." }
}
```

**Errors:** 400 `VALIDATION_ERROR`

---

## POST /api/v1/creators

Create a creator (used by M5 after ingestion, and by UF-06 add-by-URL).

**Headers:** `Authorization: Bearer <jwt>`, `X-Workspace-ID: <uuid>`, `Content-Type: application/json`

**Body:**
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

**Response (201):**
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

**Errors:** 400 `VALIDATION_ERROR`, 409 `CONFLICT` (duplicate handle+platform)

**Note:** On 409 CONFLICT, the response includes `details.existingCreatorId` so the caller can reference the existing creator.

---

## Duplicate Detection

POST /api/v1/creators checks for duplicate handle+platform before insert. If a creator with the same handle on the same platform already exists, returns 409 CONFLICT.

## Projection (ADR-027)

After successful create, the endpoint synchronously projects the creator to Meilisearch. If Meilisearch is unavailable, the creator still gets created in GCP — projection is deferred, not failed.

## Implementation Files

- Routes: `packages/api/src/routes/m2-creator/creator.routes.ts`
- Repository: `packages/database/src/repositories/creator.repository.ts`
- Projection: `packages/database/src/projections/creator-index-projection.ts`
