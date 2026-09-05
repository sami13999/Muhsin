/**
 * Staff RBAC Middleware — DOC-029 compliant.
 *
 * Enforces role-based access control for staff endpoints.
 * Support role is deny-by-default; admin role has specific denials.
 *
 * Usage:
 *   router.get('/admin/workspaces', staffOnly, requireStaffRole('admin'), handler)
 *   router.get('/support/inspect', staffOnly, requireStaffRole('support'), handler)
 *   router.get('/admin/audit', staffOnly, requirePermission('audit.view_all'), handler)
 */
import type { Context, Next } from 'hono';
import { hasStaffPermission, type StaffRole } from '@mushin/shared';

// ── Middleware: Require specific staff role ──────────────────────

/**
 * Require the request to be from a staff member with a specific role.
 * Must be used after staffOnly middleware.
 */
export function requireStaffRole(...roles: StaffRole[]) {
  return async (c: Context, next: Next) => {
    const tenancy = c.get('tenancy');
    const staffRole = tenancy?.claims?.['role'] as StaffRole | undefined;

    if (!tenancy?.isStaff) {
      return c.json(
        {
          error: {
            code: 'STAFF_REALM_REQUIRED',
            message: 'This endpoint requires staff authentication',
            request_id: c.get('requestId'),
          },
        },
        403,
      );
    }

    if (!staffRole || !roles.includes(staffRole)) {
      return c.json(
        {
          error: {
            code: 'STAFF_ROLE_INSUFFICIENT',
            message: `Required role: ${roles.join(' or ')}. Current role: ${staffRole ?? 'none'}`,
            request_id: c.get('requestId'),
          },
        },
        403,
      );
    }

    return next();
  };
}

// ── Middleware: Require specific permission ──────────────────────

/**
 * Require the request to have a specific permission.
 * Checks against the permission matrix in DOC-029.
 */
export function requirePermission(permissionId: string) {
  return async (c: Context, next: Next) => {
    const tenancy = c.get('tenancy');
    const staffRole = tenancy?.claims?.['role'] as StaffRole | undefined;

    if (!tenancy?.isStaff) {
      return c.json(
        {
          error: {
            code: 'STAFF_REALM_REQUIRED',
            message: 'This endpoint requires staff authentication',
            request_id: c.get('requestId'),
          },
        },
        403,
      );
    }

    if (!staffRole) {
      return c.json(
        {
          error: {
            code: 'STAFF_ROLE_MISSING',
            message: 'Staff role not found in JWT claims',
            request_id: c.get('requestId'),
          },
        },
        403,
      );
    }

    if (!hasStaffPermission(staffRole, permissionId)) {
      return c.json(
        {
          error: {
            code: 'STAFF_PERMISSION_DENIED',
            message: `Permission '${permissionId}' not granted for role '${staffRole}'`,
            request_id: c.get('requestId'),
          },
        },
        403,
      );
    }

    return next();
  };
}

// ── Middleware: Require workspace targeting (staff) ──────────────

/**
 * Require staff to explicitly target a workspace via header.
 * Staff tokens carry no workspace claim — they must name their target.
 * Per DOC-029 §1.3: "staff tooling must name its target on every workspace-scoped call"
 */
export function requireWorkspaceTarget() {
  return async (c: Context, next: Next) => {
    const tenancy = c.get('tenancy');

    if (!tenancy?.isStaff) return next();

    const workspaceId = c.req.header('X-Workspace-ID');
    if (!workspaceId) {
      return c.json(
        {
          error: {
            code: 'STAFF_WORKSPACE_TARGET_REQUIRED',
            message: 'Staff requests must specify X-Workspace-ID header',
            request_id: c.get('requestId'),
          },
        },
        400,
      );
    }

    return next();
  };
}
