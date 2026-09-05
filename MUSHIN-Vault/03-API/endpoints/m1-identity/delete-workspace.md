---
title: DELETE /api/v1/workspaces/{workspace_id}
type: api-endpoint
module: m1
date: 2026-07-05
status: active
tags: [api, identity, workspaces, delete]
---

# 🔌 `DELETE /v1/workspaces/{workspace_id}`

> [!abstract] Purpose
> Soft-delete a workspace. Requires owner role. Emits suspension event to outbox.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| X-Workspace-ID | Yes | Target workspace |

- **Roles:** owner only
- **Tenancy:** Verified via [[04-Functions/edge/tenancy-middleware|tenancy middleware]]

## Response `204 No Content`

No response body. Headers only:
- `X-Request-ID`: Trace ID

## Business Logic

1. Verify JWT and resolve tenancy
2. Check role = owner
3. Set `deleted_at` on [[02-Database/tables/wp/wp.workspace|wp.workspace]]
4. Set status = 'deleted'
5. Emit `workspace.deleted` to [[02-Database/tables/platform/platform.outbox|platform.outbox]]
6. Return 204

## Error Codes

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing/invalid JWT |
| WORKSPACE_ID_REQUIRED | 400 | Missing header |
| WORKSPACE_NOT_FOUND | 404 | Workspace doesn't exist |
| WORKSPACE_ACCESS_DENIED | 403 | User not member |
| ROLE_INSUFFICIENT | 403 | User is not owner |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part I1
- [[07-Quality-Standards/Doc-29-Internal-Roles|Internal Roles]] - RBAC
- [[04-Functions/workers/outbox-relay|Outbox Relay]] - Event delivery
