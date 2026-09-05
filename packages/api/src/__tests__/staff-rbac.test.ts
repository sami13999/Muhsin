/**
 * Staff RBAC middleware tests.
 * Tests role-based access control per DOC-029.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireStaffRole, requirePermission, requireWorkspaceTarget } from '../middleware/staff-rbac.js';
import { hasStaffPermission, getStaffPermissions, isStaffDenied } from '@mushin/shared';

describe('Staff RBAC', () => {
  describe('Permission Matrix (DOC-029)', () => {
    it('admin should have workspace.suspend permission', () => {
      expect(hasStaffPermission('admin', 'workspace.suspend')).toBe(true);
    });

    it('support should NOT have workspace.suspend permission', () => {
      expect(hasStaffPermission('support', 'workspace.suspend')).toBe(false);
    });

    it('admin should have audit.view_all permission', () => {
      expect(hasStaffPermission('admin', 'audit.view_all')).toBe(true);
    });

    it('support should NOT have audit.view_all permission', () => {
      expect(hasStaffPermission('support', 'audit.view_all')).toBe(false);
    });

    it('support should have workspace.inspect permission', () => {
      expect(hasStaffPermission('support', 'workspace.inspect')).toBe(true);
    });

    it('admin should have workspace.inspect permission', () => {
      expect(hasStaffPermission('admin', 'workspace.inspect')).toBe(true);
    });

    it('support should have ticket.view permission', () => {
      expect(hasStaffPermission('support', 'ticket.view')).toBe(true);
    });

    it('support should NOT have impersonate permission', () => {
      expect(hasStaffPermission('support', 'impersonate')).toBe(false);
    });

    it('admin should have impersonate permission', () => {
      expect(hasStaffPermission('admin', 'impersonate')).toBe(true);
    });

    it('should return false for unknown permission', () => {
      expect(hasStaffPermission('admin', 'nonexistent.permission')).toBe(false);
    });
  });

  describe('getStaffPermissions', () => {
    it('should return admin permissions', () => {
      const perms = getStaffPermissions('admin');
      expect(perms.length).toBeGreaterThan(0);
      expect(perms.some(p => p.id === 'impersonate')).toBe(true);
    });

    it('should return support permissions', () => {
      const perms = getStaffPermissions('support');
      expect(perms.length).toBeGreaterThan(0);
      expect(perms.some(p => p.id === 'workspace.inspect')).toBe(true);
      expect(perms.some(p => p.id === 'impersonate')).toBe(false);
    });
  });

  describe('isStaffDenied', () => {
    it('admin should not be denied anything', () => {
      expect(isStaffDenied('admin', 'impersonate')).toBe(false);
      expect(isStaffDenied('admin', 'workspace.suspend')).toBe(false);
    });

    it('support should be denied impersonate', () => {
      expect(isStaffDenied('support', 'impersonate')).toBe(true);
    });

    it('support should be denied workspace.suspend', () => {
      expect(isStaffDenied('support', 'workspace.suspend')).toBe(true);
    });

    it('unknown role should be denied', () => {
      expect(isStaffDenied('unknown' as any, 'workspace.inspect')).toBe(true);
    });
  });

  describe('requireStaffRole middleware', () => {
    function createMockContext(staffRole?: string) {
      return {
        get: vi.fn().mockReturnValue({
          isStaff: true,
          roles: ['admin'],
          claims: { role: staffRole },
        }),
        req: {
          header: vi.fn(),
        },
        json: vi.fn().mockReturnValue(new Response()),
        set: vi.fn(),
      };
    }

    it('should allow request with correct role', async () => {
      const c = createMockContext('admin');
      const next = vi.fn().mockResolvedValue(undefined);

      const middleware = requireStaffRole('admin');
      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny request with wrong role', async () => {
      const c = createMockContext('support');
      const next = vi.fn();
      c.json = vi.fn().mockReturnValue({ status: 403 });

      const middleware = requireStaffRole('admin');
      const result = await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('should deny non-staff request', async () => {
      const c = {
        get: vi.fn().mockReturnValue({ isStaff: false }),
        json: vi.fn().mockReturnValue({ status: 403 }),
      };
      const next = vi.fn();

      const middleware = requireStaffRole('admin');
      await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', async () => {
      const c = createMockContext('support');
      const next = vi.fn().mockResolvedValue(undefined);

      const middleware = requireStaffRole('admin', 'support');
      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requirePermission middleware', () => {
    function createMockContext(staffRole?: string) {
      return {
        get: vi.fn().mockReturnValue({
          isStaff: true,
          roles: ['admin'],
          claims: { role: staffRole },
        }),
        req: {
          header: vi.fn(),
        },
        json: vi.fn().mockReturnValue(new Response()),
        set: vi.fn(),
      };
    }

    it('should allow request with matching permission', async () => {
      const c = createMockContext('admin');
      const next = vi.fn().mockResolvedValue(undefined);

      const middleware = requirePermission('audit.view_all');
      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny request without matching permission', async () => {
      const c = createMockContext('support');
      const next = vi.fn();
      c.json = vi.fn().mockReturnValue({ status: 403 });

      const middleware = requirePermission('audit.view_all');
      await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireWorkspaceTarget middleware', () => {
    it('should allow staff with workspace header', async () => {
      const c = {
        get: vi.fn().mockReturnValue({ isStaff: true }),
        req: { header: vi.fn().mockReturnValue('ws-001') },
        json: vi.fn(),
      };
      const next = vi.fn().mockResolvedValue(undefined);

      const middleware = requireWorkspaceTarget();
      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny staff without workspace header', async () => {
      const c = {
        get: vi.fn().mockReturnValue({ isStaff: true }),
        req: { header: vi.fn().mockReturnValue(undefined) },
        json: vi.fn().mockReturnValue({ status: 400 }),
      };
      const next = vi.fn();

      const middleware = requireWorkspaceTarget();
      await middleware(c as any, next);

      expect(next).not.toHaveBeenCalled();
    });

    it('should allow non-staff without workspace header', async () => {
      const c = {
        get: vi.fn().mockReturnValue({ isStaff: false }),
        req: { header: vi.fn() },
        json: vi.fn(),
      };
      const next = vi.fn().mockResolvedValue(undefined);

      const middleware = requireWorkspaceTarget();
      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
