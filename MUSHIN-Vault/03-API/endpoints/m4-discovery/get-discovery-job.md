---
title: GET /api/v1/discovery/jobs/{job_id}
type: api-endpoint
module: m4
date: 2026-07-05
status: draft
tags: [api, discovery, jobs]
---

# 🔌 `GET /v1/discovery/jobs/{job_id}`

> [!abstract] Purpose
> Poll discovery job status and retrieve results. Returns job progress, result count, and paginated creator matches.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped |

- **Roles:** Any authenticated user with workspace access
- **Tenancy:** Job must belong to the user's workspace

## Request

### Headers
```
Authorization: Bearer <jwt>
X-Workspace-Id: <uuid>
```

### Path Parameters
| Param | Type | Description |
|---|---|---|
| job_id | uuid | Discovery job identifier |

### Query Parameters
| Param | Type | Default | Description |
|---|---|---|---|
| limit | integer | 20 | Results per page (1-100) |
| cursor | string | null | Pagination cursor |

### Response `200 OK` (Running)
```json
{
  "data": {
    "job_id": "uuid",
    "status": "running",
    "progress": {
      "platforms_completed": ["youtube"],
      "platforms_pending": ["instagram", "tiktok"],
      "percent_complete": 33
    },
    "result_count": 0,
    "started_at": "2026-07-05T22:35:05Z"
  }
}
```

### Response `200 OK` (Completed)
```json
{
  "data": {
    "job_id": "uuid",
    "status": "completed",
    "result_count": 42,
    "credits_consumed": 5,
    "results": [
      {
        "creator_id": "uuid",
        "handle": "@techreviewer",
        "platform": "youtube",
        "follower_count": 50000,
        "engagement_rate": 0.065,
        "match_score": 0.94
      }
    ],
    "completed_at": "2026-07-05T22:37:00Z"
  },
  "pagination": {
    "next_cursor": "eyJtYXRjaF9zY29yZSI6...",
    "has_more": true
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| DISC_004 | 404 | Job not found |
| DISC_005 | 403 | Job belongs to different workspace |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| All | 60 req | 1 minute |

## Tenancy Notes

- Job must belong to the workspace specified in `X-Workspace-Id`
- Results streamable via cursor for large result sets
- Completed jobs retained for 7 days
- Failed jobs include error details in response
- Reads from [[02-Database/tables/wp/wp.discovery-job|wp.discovery_job]]
