---
title: GET /api/v1/workspaces/{workspace_id}/members
type: api-endpoint
module: m1
date: 2026-07-05
status: active
tags: [api, identity, members, list]
---

# 🔌 `GET /v1/workspaces/{workspace_id}/members`

> [!abstract] Purpose
> List all active members of a workspace with their roles.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| X-Workspace-ID | Yes | Target workspace |

- **Roles:** viewer+
- **Tenancy:** Verified via [[04-Functions/edge/tenancy-middleware|tenancy middleware]]

## Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "role": "owner",
      "grantedBy": "uuid",
      "createdAt": "2026-07-05T10:00:00Z"
    }
  ],
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

## Error Codes

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing/invalid JWT |
| WORKSPACE_ID_REQUIRED | 400 | Missing header |
| WORKSPACE_NOT_FOUND | 404 | Workspace doesn't exist |
| WORKSPACE_ACCESS_DENIED | 403 | User not member |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part I1
- [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
