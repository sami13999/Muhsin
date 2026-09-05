---
title: POST /api/v1/search
type: api-endpoint
module: m3
date: 2026-07-05
status: draft
tags: [api, search]
---

# 🔌 `POST /v1/search`

> [!abstract] Purpose
> Full-text and faceted search across creators in the workspace. Supports filtering by niche, follower count, engagement rate, platform, and location.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped |

- **Roles:** Any authenticated user with workspace access
- **Tenancy:** Returns only creators linked to the workspace

## Request

### Headers
```
Authorization: Bearer <jwt>
X-Workspace-Id: <uuid>
Content-Type: application/json
```

### Body
```json
{
  "query": "tech reviewer",
  "filters": {
    "platforms": ["youtube", "instagram"],
    "niches": ["tech_reviews", "tech_tutorials"],
    "follower_count": {"min": 10000, "max": 1000000},
    "engagement_rate": {"min": 0.03},
    "location_country": ["US", "GB"],
    "payload_completeness_tier": ["standard", "full"]
  },
  "sort": {
    "field": "engagement_rate",
    "order": "desc"
  },
  "limit": 20,
  "cursor": null
}
```

### Response `200 OK`
```json
{
  "data": [
    {
      "creator_id": "uuid",
      "handle": "@techreviewer",
      "platform": "youtube",
      "display_name": "Tech Reviewer",
      "follower_count": 50000,
      "engagement_rate": 0.065,
      "niche_primary": "tech_reviews",
      "relevance_score": 0.92
    }
  ],
  "pagination": {
    "next_cursor": "eyJzY29yZSI6...",
    "has_more": true,
    "total_estimate": 150
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| SEARCH_001 | 400 | Invalid query (too short, < 2 chars) |
| SEARCH_002 | 400 | Invalid filter value |
| SEARCH_003 | 400 | Invalid sort field |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| Free | 30 req | 1 minute |
| Pro | 200 req | 1 minute |
| Enterprise | 1000 req | 1 minute |

## Tenancy Notes

- Search scoped to creators with active [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] in workspace
- Uses full-text search index (updated async via [[02-Database/tables/gcp/gcp.creator|gcp.creator]].index_pending)
- Results ranked by relevance score (BM25 + engagement boost)
- Faceted counts returned for niche and platform breakdowns
