---
title: POST /api/v1/discovery/jobs
type: api-endpoint
module: m4
date: 2026-07-05
status: draft
tags: [api, discovery, jobs]
---

# 🔌 `POST /v1/discovery/jobs`

> [!abstract] Purpose
> Submit a creator discovery job. Asynchronously searches external platforms for creators matching the given criteria and returns matching results.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped |

- **Roles:** member+
- **Tenancy:** Job scoped to workspace; credits consumed from workspace balance

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
  "query": {
    "niche": "tech_reviews",
    "platforms": ["youtube"],
    "min_followers": 10000,
    "max_followers": 500000,
    "location": ["US", "CA"],
    "languages": ["en"]
  },
  "max_results": 50
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| query.niche | string | no | Valid niche code from platform.niche_vocab |
| query.platforms | string[] | no | youtube, instagram, tiktok, twitter |
| query.min_followers | integer | no | >= 0 |
| query.max_followers | integer | no | > min_followers |
| query.location | string[] | no | ISO 3166-1 alpha-2 codes |
| query.languages | string[] | no | ISO 639-1 codes |
| max_results | integer | no | 1-200, default 50 |

### Response `202 Accepted`
```json
{
  "data": {
    "job_id": "uuid",
    "status": "queued",
    "estimated_duration_seconds": 120,
    "credits_estimated": 5,
    "created_at": "2026-07-05T22:35:00Z"
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| AUTH_003 | 403 | Insufficient role |
| DISC_001 | 400 | Invalid query parameters |
| DISC_002 | 402 | Insufficient credits |
| DISC_003 | 429 | Discovery queue full |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| Free | 5 req | 1 hour |
| Pro | 50 req | 1 hour |
| Enterprise | 200 req | 1 hour |

## Tenancy Notes

- Creates [[02-Database/tables/wp/wp.discovery-job|wp.discovery_job]] in workspace
- Credits reserved via [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]] before job starts
- Processed by [[04-Functions/workers/discovery-worker|discovery-worker]] (polling interval: 10s)
- Results accessible via `GET /v1/discovery/jobs/{job_id}`
- Outbox event emitted: `discovery.job_created` via [[02-Database/tables/platform/platform.outbox|platform.outbox]]
