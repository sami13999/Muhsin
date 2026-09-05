---
title: PATCH /api/v1/workspaces/{workspace_id}/members/{user_id}/role
type: api-endpoint
module: m1
date: 2026-07-05
status: active
tags: [api, identity, members, role]
---

# 🔌 `PATCH /v1/workspaces/{workspace_id}/members/{user_id}/role`

> [!abstract] Purpose
> Change a member's role. Requires owner role. Cannot change own role or owner's role.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| X-Workspace-ID | Yes | Target workspace |

- **Roles:** owner only
- **Tenancy:** Verified via [[04-Functions/edge/tenancy-middleware|tenancy middleware]]

## Request

```json
{
  "role": "admin"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| role | string | Yes | `admin`, `member`, or `viewer` |

## Response `200 OK`

```json
{
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "creatorId": "uuid",
    "role": "admin",
    "grantedBy": "uuid",
    "createdAt": "2026-07-05T10:00:00Z"
  },
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

## Business Logic

1. Verify JWT and resolve tenancy
2. Check role = owner
3. Validate new role is not `owner`
4. Cannot change own role
5. Cannot change existing owner's role
6. Update [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
7. Emit `member.role_changed` to [[02-Database/tables/platform/platform.outbox|platform.outbox]]

## Error Codes

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing/invalid JWT |
| ROLE_INSUFFICIENT | 403 | User is not owner |
| VALIDATION_ERROR | 400 | Invalid role or self-change |
| RESOURCE_NOT_FOUND | 404 | Member not found |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part I1
- [[07-Quality-Standards/Doc-29-Internal-Roles|Internal Roles]]
