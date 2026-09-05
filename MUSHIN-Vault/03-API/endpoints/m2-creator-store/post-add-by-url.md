---
title: POST /api/v1/creators/add-by-url
type: api-endpoint
module: m2
date: 2026-07-05
status: draft
tags: [api, creator-store, creators]
---

# 🔌 `POST /v1/creators/add-by-url`

> [!abstract] Purpose
> Add a creator to the workspace by providing their platform URL. Triggers async enrichment if creator doesn't exist in global registry.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped |

- **Roles:** member+
- **Tenancy:** Adds creator to workspace via `wp.workspace_creator_link`

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
  "url": "https://youtube.com/@creator",
  "list_id": "uuid" (optional)
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| url | string | Yes | Valid YouTube/Instagram/TikTok URL |
| list_id | uuid | no | Optional list to add creator to |

### Response `202 Accepted`
```json
{
  "data": {
    "creator_id": "uuid",
    "status": "enriching",
    "workspace_link_id": "uuid",
    "estimated_enrichment_seconds": 30
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| AUTH_003 | 403 | Insufficient role (viewer cannot add) |
| CREATOR_003 | 400 | Invalid platform URL |
| CREATOR_004 | 409 | Creator already in workspace |
| CREATOR_005 | 429 | Enrichment queue full |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| Free | 10 req | 1 hour |
| Pro | 100 req | 1 hour |
| Enterprise | 500 req | 1 hour |

## Tenancy Notes

- If creator exists in [[02-Database/tables/gcp/gcp.creator|gcp.creator]], link immediately via [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
- If new, create [[02-Database/tables/gcp/gcp.creator|gcp.creator]] (status=enriching) and queue [[04-Functions/workers/discovery-worker|discovery-worker]]
- Inflight URL lock ([[02-Database/tables/gcp/gcp.inflight-url-lock|gcp.inflight_url_lock]]) prevents duplicate processing
- Outbox event emitted: `creator.added_to_workspace` via [[02-Database/tables/platform/platform.outbox|platform.outbox]]
