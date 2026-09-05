/**
 * Multi-Factor Authentication (MFA) — DOC-029 §1.2 compliant.
 *
 * Staff MFA requirements:
 * - Support: TOTP mandatory (enrollment blocks first login)
 * - Admin: WebAuthn hardware key mandatory; TOTP as backup only
 *
 * MFA is enforced at the auth provider level (separate staff tenant).
 * This module provides validation helpers for JWT claims.
 */

// ── MFA Methods ────────────────────────────────────────────────

export type MFAMethod = 'webauthn' | 'totp' | 'sms';

// ── Staff MFA Requirements (DOC-029 §1.2) ──────────────────────

export interface MFARequirements {
  role: 'admin' | 'support';
  /** Primary MFA method (mandatory) */
  primary: MFAMethod;
  /** Backup MFA methods (optional) */
  backup: MFAMethod[];
  /** Can the user skip MFA enrollment? */
  enrollmentRequired: boolean;
  /** Grace period before MFA is enforced (hours) */
  gracePeriodHours: number;
}

export const STAFF_MFA_REQUIREMENTS: Record<string, MFARequirements> = {
  admin: {
    role: 'admin',
    primary: 'webauthn',
    backup: ['totp'],
    enrollmentRequired: true,
    gracePeriodHours: 0, // Immediate enforcement
  },
  support: {
    role: 'support',
    primary: 'totp',
    backup: [],
    enrollmentRequired: true,
    gracePeriodHours: 0, // Immediate enforcement
  },
};

// ── MFA Validation ─────────────────────────────────────────────

/**
 * Validate that a staff member's AMR (Authentication Methods Reference)
 * claim satisfies their role's MFA requirements.
 *
 * @param role - Staff role (admin or support)
 * @param amr - Authentication methods from JWT claims
 * @returns null if valid, error message if invalid
 */
export function validateStaffMFA(
  role: string,
  amr: string[] | undefined,
): string | null {
  const requirements = STAFF_MFA_REQUIREMENTS[role];
  if (!requirements) {
    return `Unknown staff role: ${role}`;
  }

  if (!amr || amr.length === 0) {
    return `MFA required for ${role} role — no authentication methods claimed`;
  }

  // Check primary method
  if (!amr.includes(requirements.primary)) {
    return `${role} role requires ${requirements.primary} MFA. Current methods: ${amr.join(', ')}`;
  }

  return null;
}

/**
 * Get MFA requirements for a staff role.
 */
export function getMFARequirements(role: string): MFARequirements | null {
  return STAFF_MFA_REQUIREMENTS[role] ?? null;
}

/**
 * Check if a staff member has completed MFA enrollment.
 * In production, this checks the auth provider's MFA enrollment status.
 * For now, it checks the AMR claim in the JWT.
 */
export function hasMFAEnrolled(amr: string[] | undefined): boolean {
  return !!amr && amr.length > 0;
}
