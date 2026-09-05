---
title: "Search Endpoints — API Contracts"
status: Active
last_updated: 2026-07-06
tags: [api, search, m3, endpoints, doc-20]
---

# Search Endpoints — API Contracts

**Module:** M3 Search Coordinator | **Source:** Doc 20

---

## GET /api/v1/creators/search

Deterministic filtered search (Brain 1, FS-02.01, NFR-P01).

**Headers:** `Authorization: Bearer <jwt>`, `X-Workspace-ID: <uuid>`

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `platform` | enum | — | instagram, tiktok, youtube, twitter, facebook |
| `follower_min` | int | — | Minimum follower count |
| `follower_max` | int | — | Maximum follower count |
| `engagement_rate_min` | float | — | Min engagement rate (0-1) |
| `engagement_rate_max` | float | — | Max engagement rate (0-1) |
| `geo` | string | — | Country code (PK, AE, SA) |
| `language` | string | — | Language code (ur, en, ar) |
| `niche` | string | — | Niche slug (pk_fashion_textile, etc.) |
| `authenticity_band` | enum | — | high, moderate, low |
| `audience_pk_share_min` | float | — | Min PK audience share (0-1) |
| `audience_gcc_share_min` | float | — | Min GCC audience share (0-1) |
| `completeness_tier` | enum | — | rich, standard, sparse, minimal |
| `limit` | int | 20 | Results per page (1-100) |
| `offset` | int | 0 | Pagination offset |
| `sort_by` | enum | relevance | relevance, follower_count, engagement_rate, quality_score, freshness |

**Response (200):**
```json
{
  "data": [
    {
      "creatorId": "...",
      "displayName": "...",
      "platform": "instagram",
      "followerCount": 45000,
      "engagementRate": 0.0345,
      "authenticityScore": 74,
      "qualityScore": 81,
      "_rankingScore": 0.78,
      "_explanation": {
        "authenticity": { "score": 74, "weight": 0.25 },
        "quality": { "score": 81, "weight": 0.20 },
        "freshness": { "score": 0.85, "weight": 0.15 },
        "fairness": { "score": 0.9, "weight": 0.15 },
        "relevance": { "score": 1.0, "weight": 0.25 }
      }
    }
  ],
  "pagination": { "cursor": null, "has_more": true, "total_count": null },
  "meta": { "request_id": "req_..." }
}
```

**Errors:** 400 VALIDATION_ERROR, 401 AUTH_TOKEN_INVALID, 403 WORKSPACE_ACCESS_DENIED, 503 ADAPTER_DEGRADED

---

## POST /api/v1/creators/search/nl

Natural language search (Brain 1 with LLM translation, FS-02.02, NFR-P02).

**Headers:** `Authorization: Bearer <jwt>`, `X-Workspace-ID: <uuid>`, `Content-Type: application/json`

**Body:**
```json
{ "query": "Pakistani fashion influencers with 50k+ followers and high authenticity" }
```

**Response (200):**
```json
{
  "data": [ ... ],
  "interpretation": {
    "filters": {
      "platform": "instagram",
      "niche": "pk_fashion_textile",
      "follower_min": 50000,
      "authenticity_band": "high"
    },
    "chips": [
      { "label": "Pakistani Fashion", "value": "pk_fashion_textile", "field": "niche" },
      { "label": "50k+ followers", "value": "50000", "field": "follower_min" },
      { "label": "High authenticity", "value": "high", "field": "authenticity_band" }
    ],
    "confidence": 0.85,
    "cached": false
  },
  "meta": { "request_id": "req_..." }
}
```

**Fallback (LLM failure):**
```json
{
  "data": [ ... ],
  "interpretation": {
    "filters": {},
    "chips": [{ "label": "Searched as keywords", "value": "...", "field": "keyword" }],
    "confidence": 0,
    "cached": false,
    "fallback": true
  }
}
```

---

## POST /api/v1/search/quote

Credit quote for Brain 2 Live Discovery (Doc 8 A5).

**Headers:** `Authorization: Bearer <jwt>`, `X-Workspace-ID: <uuid>`, `Content-Type: application/json`

**Body:**
```json
{
  "query": "food bloggers in Lahore",
  "filters": { "geo": "PK", "niche": "food_cooking" },
  "candidate_count": 20
}
```

**Response (200):**
```json
{
  "data": {
    "query": "food bloggers in Lahore",
    "filters": { "geo": "PK", "niche": "food_cooking" },
    "candidate_count": 20,
    "estimate": {
      "credits": 45,
      "cost_usd": 0.45,
      "breakdown": {
        "serper": 0.005,
        "apify": 0.2,
        "llm": 0.1,
        "youtube_api": 0.02,
        "meilisearch": 0.002,
        "overhead": 0.05
      },
      "currency": "credits"
    },
    "disclaimer": "Estimate only. Actual cost depends on provider rates and candidate success rate."
  },
  "meta": { "request_id": "req_..." }
}
```

**Note:** This endpoint does NOT reserve credits. Reservation happens on user confirmation.
