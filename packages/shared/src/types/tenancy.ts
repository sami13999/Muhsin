/**
 * Tenancy context resolved from JWT (Doc-21 §2.2).
 * Attached to every request after auth middleware.
 */
export interface TenancyContext {
  /** Auth0 user ID (sub claim) */
  userId: string;
  /** Workspace UUID — the tenant boundary */
  workspaceId: string;
  /** Creator UUID — the identity plane within the workspace */
  creatorId: string;
  /** Staff flag — separate identity plane (ADR-011) */
  isStaff: boolean;
  /** Roles assigned to this user in this workspace */
  roles: string[];
  /** JWT claims for downstream audit */
  claims: {
    iss: string;
    sub: string;
    aud: string;
    exp: number;
    iat: number;
    /** Staff role (admin | support) — present on staff tokens per DOC-029 */
    role?: string;
    /** Authentication methods used (amr claim) — present on staff tokens */
    amr?: string[];
  };
}

/**
 * Marker decorator metadata for tenancy-exempt routes.
 * Requires explicit justification per Doc-25.
 */
export interface TenancyExemptMeta {
  exempt: true;
  justification: string;
  approvedBy: string;
}
