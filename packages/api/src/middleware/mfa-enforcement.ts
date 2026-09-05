/**
 * MFA Enforcement Middleware — DOC-029 §1.2 compliant.
 *
 * Enforces MFA requirements for staff endpoints.
 * Blocks access if MFA enrollment not completed.
 *
 * Support: TOTP mandatory
 * Admin: WebAuthn mandatory (TOTP as backup)
 *
 * Reads AMR (Authentication Methods Reference) claim from JWT.
 * Returns 403 with MFA_ENROLLMENT_REQUIRED if not enrolled.
 */
import type { Context, Next } from 'hono';
import { validateStaffMFA } from '@mushin/shared';

/**
 * MFA enforcement middleware factory.
 *
 * Must be used after tenancy middleware.
 * Only applies to staff users.
 */
export function mfaEnforcement() {
  return async (c: Context, next: Next) => {
    const tenancy = c.get('tenancy');
    const requestId = c.get('requestId');

    // Only enforce for staff users
    if (!tenancy?.isStaff) {
      return next();
    }

    const staffRole = tenancy.claims?.['role'];
    const amr = tenancy.claims?.['amr'] as string[] | undefined;

    // Validate MFA requirements
    const mfaError = validateStaffMFA(staffRole ?? '', amr);
    if (mfaError) {
      return c.json(
        {
          error: {
            code: 'MFA_ENROLLMENT_REQUIRED',
            message: mfaError,
            request_id: requestId,
          },
        },
        403,
      );
    }

    return next();
  };
}
