---
title: GET /api/v1/me
type: api-endpoint
module: m1
date: 2026-07-05
status: draft
tags: [api, identity, me]
---

# 🔌 `GET /v1/me`

> [!abstract] Purpose
> Returns the authenticated user's profile, workspace memberships, and current entitlements. Used for session initialization and profile display.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |

- **Roles:** Any authenticated user
- **Tenancy:** Returns data scoped to the authenticated user only

## Request

### Headers
```
Authorization: Bearer <jwt>
```

### Response `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "workspaces": [
      {
        "workspace_id": "uuid",
        "name": "My Workspace",
        "role": "owner",
        "plan_tier": "pro"
      }
    ],
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

## Error Codes

| Code | Status | Description |
|---|---|---|
| AUTH_001 | 401 | Missing or invalid bearer token |
| AUTH_002 | 401 | Token expired |
| USER_001 | 404 | User not found (deleted account) |

## Rate Limiting

| Tier | Limit | Window |
|---|---|---|
| All | 120 req | 1 minute |

## Tenancy Notes

- Returns only the authenticated user's data — no cross-user access
- Workspace list filtered by active [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
- Preferences from [[02-Database/tables/wp/wp.app-user|wp.app_user]].preferences JSONB field
