---
title: DELETE /api/v1/workspaces/{workspace_id}/members/{user_id}
type: api-endpoint
module: m1
date: 2026-07-05
status: active
tags: [api, identity, members, remove]
---

# 🔌 `DELETE /v1/workspaces/{workspace_id}/members/{user_id}`

> [!abstract] Purpose
> Remove a member from the workspace. Requires admin+ role. Cannot remove owner or self.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| X-Workspace-ID | Yes | Target workspace |

- **Roles:** admin+
- **Tenancy:** Verified via [[04-Functions/edge/tenancy-middleware|tenancy middleware]]

## Response `204 No Content`

No response body. Headers only:
- `X-Request-ID`: Trace ID

## Business Logic

1. Verify JWT and resolve tenancy
2. Check role = admin+
3. Cannot remove self
4. Cannot remove owner
5. Soft-revoke membership (set `revoked_at`)
6. Emit `member.removed` to [[02-Database/tables/platform/platform.outbox|platform.outbox]]

## Error Codes

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing/invalid JWT |
| ROLE_INSUFFICIENT | 403 | User is not admin+ |
| VALIDATION_ERROR | 400 | Cannot remove self or owner |
| RESOURCE_NOT_FOUND | 404 | Member not found |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part I1
- [[07-Quality-Standards/Doc-29-Internal-Roles|Internal Roles]]
- [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
