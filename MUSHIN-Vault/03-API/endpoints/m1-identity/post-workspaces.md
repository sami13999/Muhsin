---
title: POST /api/v1/workspaces
type: api-endpoint
module: m1
date: 2026-07-05
status: active
tags: [api, identity, workspaces, create]
---

# 🔌 `POST /v1/workspaces`

> [!abstract] Purpose
> Create a new workspace. Not workspace-scoped (no X-Workspace-ID required).

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |

- **Roles:** Any authenticated user (no workspace scope)
- **Tenancy:** N/A - creates new workspace

## Request

```json
{
  "name": "My Workspace",
  "url": "https://example.com"
}
```

## Response `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "name": "My Workspace",
    "url": "https://example.com",
    "status": "active",
    "plan_tier": "free"
  },
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

## Business Logic

1. Validate input (name length, URL format)
2. Create [[02-Database/tables/wp/wp.workspace|wp.workspace]]
3. Create [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] with role=owner
4. Initialize [[02-Database/tables/wp/wp.workspace-credit-balance|wp.workspace_credit_balance]]
5. Emit `workspace.created` to [[02-Database/tables/platform/platform.outbox|platform.outbox]]

## Error Codes

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing/invalid JWT |
| VALIDATION_ERROR | 400 | Invalid name or URL |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part I1
- [[04-Functions/workers/outbox-relay|Outbox Relay]] - Event delivery
