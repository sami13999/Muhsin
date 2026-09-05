/**
 * MFA validation tests.
 * Tests DOC-029 §1.2 MFA requirements for staff roles.
 */
import { describe, it, expect } from 'vitest';
import { validateStaffMFA, getMFARequirements, hasMFAEnrolled } from '@mushin/shared';

describe('MFA Validation', () => {
  describe('validateStaffMFA', () => {
    it('should require webauthn for admin role', () => {
      const error = validateStaffMFA('admin', ['totp']);
      expect(error).toContain('webauthn');
    });

    it('should accept webauthn for admin role', () => {
      const error = validateStaffMFA('admin', ['webauthn']);
      expect(error).toBeNull();
    });

    it('should accept webauthn + totp for admin role', () => {
      const error = validateStaffMFA('admin', ['webauthn', 'totp']);
      expect(error).toBeNull();
    });

    it('should require totp for support role', () => {
      const error = validateStaffMFA('support', ['webauthn']);
      expect(error).toContain('totp');
    });

    it('should accept totp for support role', () => {
      const error = validateStaffMFA('support', ['totp']);
      expect(error).toBeNull();
    });

    it('should reject empty AMR', () => {
      const error = validateStaffMFA('admin', []);
      expect(error).toContain('MFA required');
    });

    it('should reject undefined AMR', () => {
      const error = validateStaffMFA('admin', undefined);
      expect(error).toContain('MFA required');
    });

    it('should reject unknown role', () => {
      const error = validateStaffMFA('unknown', ['webauthn']);
      expect(error).toContain('Unknown staff role');
    });
  });

  describe('getMFARequirements', () => {
    it('should return admin requirements', () => {
      const req = getMFARequirements('admin');
      expect(req).toBeDefined();
      expect(req?.primary).toBe('webauthn');
      expect(req?.enrollmentRequired).toBe(true);
    });

    it('should return support requirements', () => {
      const req = getMFARequirements('support');
      expect(req).toBeDefined();
      expect(req?.primary).toBe('totp');
    });

    it('should return null for unknown role', () => {
      const req = getMFARequirements('unknown');
      expect(req).toBeNull();
    });
  });

  describe('hasMFAEnrolled', () => {
    it('should return true when AMR has methods', () => {
      expect(hasMFAEnrolled(['webauthn'])).toBe(true);
    });

    it('should return false when AMR is empty', () => {
      expect(hasMFAEnrolled([])).toBe(false);
    });

    it('should return false when AMR is undefined', () => {
      expect(hasMFAEnrolled(undefined)).toBe(false);
    });
  });
});
