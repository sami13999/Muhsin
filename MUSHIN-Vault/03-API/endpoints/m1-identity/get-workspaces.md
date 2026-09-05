---
title: GET /api/v1/workspaces
type: api-endpoint
module: m1
date: 2026-07-05
status: draft
tags: [api, identity, workspaces]
---

# 🔌 `GET /v1/workspaces`

> [!abstract] Purpose
> List all workspaces the authenticated user has access to. Returns workspace metadata and the user's role in each.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| API Key | Yes | Workspace-scoped API key |

- **Roles:** Any authenticated user
- **Tenancy:** Returns only workspaces where user has an active `wp.workspace_creator_link`

## Request

### Headers
```
Authorization: Bearer <jwt>
X-Workspace-Id: <uuid> (optional, for API key auth)
```

### Query Parameters
| Param | Type | Default | Description |
|---|---|---|---|
| status | string | active | Filter by status: active, suspended, deleted |
| limit | integer | 20 | Max results (1-100) |
| cursor | string | null | Pagination cursor from previous response |

### Response `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Workspace",
      "url": "https://example.com",
      "status": "active",
      "plan_tier": "pro",
      "role": "admin",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6...",
    "has_more": true
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| AUTH_002 | 401 | Token expired |
| RATE_001 | 429 | Rate limit exceeded |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| Free | 60 req | 1 minute |
| Pro | 300 req | 1 minute |
| Enterprise | 1000 req | 1 minute |

## Tenancy Notes

- Query scoped by [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] WHERE creator_id = auth.sub() AND revoked_at IS NULL
- Soft-deleted workspaces excluded unless `status=deleted` explicitly requested
- API key auth requires `X-Workspace-Id` header to identify workspace context
- Returns data from [[02-Database/tables/wp/wp.workspace|wp.workspace]]
