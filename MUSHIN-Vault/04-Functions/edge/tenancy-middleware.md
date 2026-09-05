---
type: function
name: tenancy-middleware
status: active
created: 2026-07-05
tags: [middleware, tenancy, rbac]
---

# Tenancy Resolution Middleware

## Purpose

Resolve workspace context for API requests. Verifies the authenticated user has active membership in the requested workspace and loads entitlements.

## Flow

1. Extract `X-Workspace-ID` header
2. Query [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] for active membership
3. Load workspace plan tier from [[02-Database/tables/wp/wp.workspace|wp.workspace]]
4. Load entitlements from [[02-Database/tables/wp/wp.entitlement-catalog|wp.entitlement_catalog]] via [[02-Database/tables/wp/wp.paddle-subscription|wp.paddle_subscription]]
5. Attach [[04-Functions/edge/tenancy-middleware|TenancyContext]] to request

## Implementation

```typescript
// packages/shared/src/middleware/tenancy-resolution.ts
interface TenancyContext {
  userId: string;
  workspaceId: string;
  role: Role;
  entitlements: Entitlements;
}
```

## RBAC Enforcement

Role hierarchy (Doc-29):
| Role | Level | Permissions |
|------|-------|-------------|
| owner | 4 | Full access, billing, delete workspace |
| admin | 3 | User management, settings, campaigns |
| member | 2 | Create/edit campaigns, reveal creators |
| viewer | 1 | Read-only access |

### Helper Functions

```typescript
requireRole('owner', 'admin')  // Exact role match
requireMinimumRole('member')   // Minimum role level
```

## Error Responses

| Code | Status | Condition |
|------|--------|-----------|
| WORKSPACE_ID_REQUIRED | 400 | Missing `X-Workspace-ID` header |
| WORKSPACE_ACCESS_DENIED | 403 | User not member of workspace |
| WORKSPACE_NOT_FOUND | 404 | Workspace does not exist |
| ROLE_INSUFFICIENT | 403 | User role below required minimum |

## References

- [[03-API/Doc-20-API-Design|API Design]] - Part B: Tenancy, Part D: Errors
- [[07-Quality-Standards/Doc-29-Internal-Roles|Internal Roles]] - RBAC model
- [[04-Functions/edge/jwt-verification|JWT Verification]] - Prerequisite middleware

## Related

- [[02-Database/tables/wp/wp.workspace-creator-link|wp.workspace_creator_link]] - Membership query
- [[02-Database/tables/wp/wp.workspace|wp.workspace]] - Plan tier lookup
- [[02-Database/tables/wp/wp.entitlement-catalog|wp.entitlement_catalog]] - Feature limits
- [[03-API/endpoints/m1-identity/get-workspaces|GET /workspaces]] - First protected endpoint
