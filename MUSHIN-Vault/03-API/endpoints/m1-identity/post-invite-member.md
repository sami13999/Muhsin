---
title: POST /api/v1/workspaces/{workspace_id}/members/invite
type: api-endpoint
module: m1
date: 2026-07-05
status: active
tags: [api, identity, members, invite]
---

# 🔌 `POST /v1/workspaces/{workspace_id}/members/invite`

> [!abstract] Purpose
> Invite a user to join the workspace by email. Requires admin+ role.

## Auth & Roles

| Auth Method | Required | Notes |
|---|---|---|
| Bearer Token | Yes | JWT with valid `sub` claim |
| X-Workspace-ID | Yes | Target workspace |

- **Roles:** admin+
- **Tenancy:** Verified via [[04-Functions/edge/tenancy-middleware|tenancy middleware]]

## Request

```json
{
  "email": "user@example.com",
  "role": "member"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| role | string | Yes | `admin`, `member`, or `viewer` (not `owner`) |

## Response `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "creatorId": "uuid",
    "role": "member",
    "grantedBy": "uuid",
    "createdAt": "2026-07-05T10:00:00Z"
  },
  "meta": {
    "request_id": "req_01JXXXXXXXXXXXXXXX"
  }
}
```

## Business Logic

1. Validate email format
2. Find user by email in [[02-Database/tables/wp/wp.app-user|wp.app_user]]
3. Check user is not already a member
4. Create [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
5. Emit `member.invited` to [[02-Database/tables/platform/platform.outbox|platform.outbox]]

## Error Codes

| Code | Status | Condition |
|------|--------|-----------|
| AUTH_TOKEN_INVALID | 401 | Missing/invalid JWT |
| ROLE_INSUFFICIENT | 403 | User is not admin+ |
| VALIDATION_ERROR | 400 | Invalid email or role |
| RESOURCE_NOT_FOUND | 404 | User not found by email |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part I1
- [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]]
- [[07-Quality-Standards/Doc-29-Internal-Roles|Internal Roles]]
