/**
 * Staff Role-Based Access Control (RBAC) — DOC-029 compliant.
 *
 * Staff identities live in a separate auth realm (ADR-011).
 * Two roles: admin (full access) and support (read-only).
 *
 * Key invariant: Support role is DENY-BY-DEFAULT.
 * Admin role is ALLOW-BY-DEFAULT with specific hard denials.
 */

// ── Staff Roles ────────────────────────────────────────────────

export type StaffRole = 'admin' | 'support';

// ── Permission Matrix (DOC-029 §2-3) ──────────────────────────

export interface StaffPermission {
  /** Permission identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Roles that have this permission */
  roles: StaffRole[];
}

export const STAFF_PERMISSIONS: StaffPermission[] = [
  // ── Admin-only permissions ──────────────────────────────────
  {
    id: 'workspace.suspend',
    description: 'Suspend/reinstate workspaces',
    roles: ['admin'],
  },
  {
    id: 'workspace.view_all',
    description: 'View all workspaces across tenants',
    roles: ['admin'],
  },
  {
    id: 'creator.admin_view',
    description: 'View GCP creator admin data (all workspace links)',
    roles: ['admin'],
  },
  {
    id: 'gdpr.erasure_trigger',
    description: 'Trigger GDPR Tier 2 erasure',
    roles: ['admin'],
  },
  {
    id: 'identity.merge',
    description: 'Resolve identity merge candidates',
    roles: ['admin'],
  },
  {
    id: 'feature_flags.manage',
    description: 'Create/toggle/deprecate feature flags',
    roles: ['admin'],
  },
  {
    id: 'cost.view_all',
    description: 'View cost telemetry dashboards',
    roles: ['admin'],
  },
  {
    id: 'queue.manage',
    description: 'DLQ inspection/redrive, worker status',
    roles: ['admin'],
  },
  {
    id: 'audit.view_all',
    description: 'View platform-wide audit logs',
    roles: ['admin'],
  },
  {
    id: 'impersonate',
    description: 'Impersonate workspace users',
    roles: ['admin'],
  },
  {
    id: 'ledger.correct',
    description: 'Refund-linked ledger corrections',
    roles: ['admin'],
  },

  // ── Support permissions (read-only) ─────────────────────────
  {
    id: 'workspace.inspect',
    description: 'View workspace members, settings, usage metrics',
    roles: ['support', 'admin'],
  },
  {
    id: 'creator.read_view',
    description: 'View GCP creator data for workspace under investigation',
    roles: ['support', 'admin'],
  },
  {
    id: 'ticket.view',
    description: 'View support tickets and user reports',
    roles: ['support', 'admin'],
  },
  {
    id: 'audit.workspace_scoped',
    description: 'View audit logs for specific workspace',
    roles: ['support', 'admin'],
  },
  {
    id: 'ops.read',
    description: 'View ops stream logs (request_id lookup)',
    roles: ['support', 'admin'],
  },
];

// ── Hard Denials for Support (DOC-029 §3.2) ────────────────────

export const SUPPORT_DENIALS = [
  'impersonate',
  'feature_flags.manage',
  'queue.manage',
  'workspace.suspend',
  'gdpr.erasure_trigger',
  'identity.merge',
  'ledger.correct',
  'cost.view_all',
  'audit.view_all',
] as const;

// ── Permission Check Functions ──────────────────────────────────

/**
 * Check if a staff role has a specific permission.
 */
export function hasStaffPermission(role: StaffRole, permissionId: string): boolean {
  const permission = STAFF_PERMISSIONS.find(p => p.id === permissionId);
  if (!permission) return false;
  return permission.roles.includes(role);
}

/**
 * Get all permissions for a staff role.
 */
export function getStaffPermissions(role: StaffRole): StaffPermission[] {
  return STAFF_PERMISSIONS.filter(p => p.roles.includes(role));
}

/**
 * Check if a staff role is denied a specific capability.
 * Used for hard denials on Support role.
 */
export function isStaffDenied(role: StaffRole, capability: string): boolean {
  if (role === 'admin') return false;
  if (role === 'support') {
    return SUPPORT_DENIALS.includes(capability as typeof SUPPORT_DENIALS[number]);
  }
  return true; // Unknown role = denied
}
