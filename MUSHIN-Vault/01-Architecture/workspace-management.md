---
title: "Workspace Management — M1 Architecture"
status: Active
last_updated: 2026-07-07
tags: [architecture, m1, workspace, tenancy, doc-14]
---

# Workspace Management — M1 Architecture

**Source:** Doc 14 (M1 Module Frame) | **Module:** M1

## Overview

M1 is the Identity & Tenancy Kernel. It manages workspaces, memberships, and tenancy resolution. Every API request passes through M1's tenancy middleware before reaching business logic.

## Repository Layer

**File:** `packages/database/src/repositories/workspace.repository.ts`

| Method | Description |
|---|---|
| `findById(db, id)` | Workspace + member count + credit balance |
| `findBySlug(db, slug)` | Workspace lookup by slug |
| `create(db, input)` | Insert workspace + owner membership + credit balance (0) in ONE transaction |
| `addMember(db, workspaceId, userId, role, invitedEmail?)` | Insert membership |
| `removeMember(db, membershipId)` | Soft-delete via removed_at |
| `getMembership(db, userId, workspaceId)` | Returns membership or null — **called by tenancy middleware** |
| `listUserWorkspaces(db, userId)` | All workspaces for workspace switcher |
| `updateSubscriptionStatus(db, workspaceId, status, ...)` | Called by M10 on Paddle webhooks |

## Tenancy Middleware

**File:** `packages/api/src/middleware/tenancy.ts`

Flow:
1. Extract JWT from `Authorization: Bearer <token>`
2. Validate against JWKS endpoint (jose library)
3. Extract `userId` from JWT `sub` claim
4. Read `X-Workspace-ID` header
5. Call `workspaceRepository.getMembership(db, userId, workspaceId)`
6. If no membership → 403 `AUTHZ_WORKSPACE_MISMATCH`
7. If status ≠ active → 403 `AUTHZ_WORKSPACE_SUSPENDED`
8. Get workspace for entitlements (hardcoded plan defaults from Doc 3)
9. Construct `TenancyContext` and attach to Hono context

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/workspaces` | POST | Create workspace (user becomes owner) |
| `/api/v1/workspaces` | GET | List user's workspaces |
| `/api/v1/workspaces/:id` | GET | Workspace detail + credit balance |
| `/api/v1/workspaces/:id/members` | POST | Invite member (owner/admin only) |
| `/api/v1/workspaces/:id/members/:membershipId` | DELETE | Remove member (owner/admin only) |

## RBAC

| Role | Scope | Mutate | Billing | Admin |
|---|---|---|---|---|
| `owner` | Full workspace | Yes | Yes | Yes |
| `admin` | Full workspace | Yes | Read-only | No |
| `member` | Assigned resources | Yes | No | No |

## Implementation Files

- Repository: `packages/database/src/repositories/workspace.repository.ts`
- Tenancy middleware: `packages/api/src/middleware/tenancy.ts`
- API routes: `packages/api/src/routes/m1-workspace/workspace.routes.ts`
