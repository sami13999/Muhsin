---
type: adr
status: Accepted
date: 2026-07-09
module: Security
related_docs: ["DOC-029", "DOC-021"]
tags: [adr, rbac, staff, security]
---

# ADR-038: Staff RBAC Implementation

## Context

DOC-029 defines the staff RBAC matrix with two roles (admin, support) and specific permission sets. The implementation needs to enforce these at the middleware layer while maintaining the audit-first invariant (DOC-029 §2.2).

## Decision

### Permission Matrix
- **Admin:** Full access (workspace management, GCP admin, GDPR erasure, identity merge, feature flags, cost dashboards, queue health, audit logs, impersonation, ledger corrections)
- **Support:** Read-only (workspace inspection, creator view, ticket viewing, workspace-scoped audit, ops stream)

### Hard Denials for Support
Support role is deny-by-default with explicit denials for: impersonation, feature flags, queue management, workspace suspension, GDPR erasure, identity merge, ledger corrections, cost dashboards, platform-wide audit.

### Middleware Stack
1. `staffOnly` — verifies JWT realm is 'staff'
2. `requireStaffRole('admin' | 'support')` — verifies role claim
3. `requirePermission('permission.id')` — checks against permission matrix
4. `requireWorkspaceTarget()` — staff must explicitly target workspace via header

### Audit Integration
Every mutating staff action requires:
- `reason` field (min 10 chars)
- Optional `ticketRef`
- Written in same transaction as action (audit-first invariant)

## Consequence

- Staff RBAC is enforced at middleware level, not scattered across handlers
- Permission checks are composable and testable
- Audit records are immutable and append-only
- Support role cannot accidentally perform admin actions

## Implementation

- `packages/shared/src/types/staff.ts` — permission matrix
- `packages/api/src/middleware/staff-rbac.ts` — middleware functions
- `packages/shared/src/types/audit.ts` — audit record types
- `packages/api/src/middleware/audit-log.ts` — audit middleware

## Related

- [[05-Security-Legal/DOC-029-Internal-Roles-Permissions|DOC-029]]
- [[05-Security-Legal/DOC-021-Security-Privacy-Compliance|DOC-021]]
- [[08-Decisions/ADR-011-staff-identity-plane|ADR-011]]
