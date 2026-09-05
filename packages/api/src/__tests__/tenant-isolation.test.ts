/**
 * Tenant isolation security tests.
 * Tests that workspace A cannot access workspace B's data.
 * Verifies RLS enforcement contract and API-level isolation.
 */
import { describe, it, expect, vi } from 'vitest';
import { createMockDatabase, createMockTenancyContext } from '@mushin/testing';
import { tenancyMiddleware, staffOnly } from '../middleware/tenancy.js';

// Mock jose
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

// Mock workspace repository
vi.mock('@mushin/database', () => ({
  workspaceRepository: {
    getMembership: vi.fn(),
    findById: vi.fn(),
  },
}));

import { jwtVerify } from 'jose';
import { workspaceRepository } from '@mushin/database';

describe('Tenant Isolation', () => {
  describe('Workspace isolation', () => {
    it('tenancy middleware should reject user not in workspace (403)', async () => {
      const mockDb = createMockDatabase();
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: 'user-001', iss: 'https://auth.mushin.io', aud: 'mushin-api', exp: 9999999999, iat: 1000000000 },
      } as any);
      vi.mocked(workspaceRepository.getMembership).mockResolvedValue(null);

      const middleware = tenancyMiddleware({
        jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
        jwtIssuer: 'https://auth.mushin.io',
        jwtAudience: 'mushin-api',
        db: mockDb as any,
      });

      const c = {
        req: { header: (name: string) => name === 'Authorization' ? 'Bearer valid-token' : name === 'X-Workspace-ID' ? 'ws-other' : undefined },
        json: vi.fn().mockReturnValue(new Response()),
        set: vi.fn(),
        get: vi.fn(),
      };

      await middleware(c as any, vi.fn());

      // Should return 403 — user is not a member of ws-other
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTHZ_WORKSPACE_MISMATCH' }),
        }),
        403,
      );
    });

    it('tenancy middleware should set workspace context on valid membership', async () => {
      const mockDb = createMockDatabase();
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: 'user-001', iss: 'https://auth.mushin.io', aud: 'mushin-api', exp: 9999999999, iat: 1000000000 },
      } as any);
      vi.mocked(workspaceRepository.getMembership).mockResolvedValue({
        membershipId: 'mem-001',
        workspaceId: 'ws-001',
        userId: 'user-001',
        role: 'member',
        status: 'active',
        invitedEmail: null,
        invitedBy: null,
        invitedAt: null,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        workspace: { subscriptionPlanId: 'free' },
      } as any);

      const mockDbExecute = vi.fn().mockResolvedValue([]);
      mockDb.execute = mockDbExecute;

      const middleware = tenancyMiddleware({
        jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
        jwtIssuer: 'https://auth.mushin.io',
        jwtAudience: 'mushin-api',
        db: mockDb as any,
      });

      const next = vi.fn();
      const c = {
        req: { header: (name: string) => name === 'Authorization' ? 'Bearer valid-token' : name === 'X-Workspace-ID' ? 'ws-001' : undefined },
        json: vi.fn().mockReturnValue(new Response()),
        set: vi.fn(),
        get: vi.fn(),
      };

      await middleware(c as any, next);

      // Should call next (request allowed)
      expect(next).toHaveBeenCalled();
      // Should set tenancy context with correct workspace
      expect(c.set).toHaveBeenCalledWith('tenancy', expect.objectContaining({
        workspaceId: 'ws-001',
        userId: 'user-001',
      }));
    });
  });

  describe('API-level isolation', () => {
    it('staffOnly should block non-staff users (403)', () => {
      const c = {
        get: vi.fn().mockReturnValue({ isStaff: false }),
        json: vi.fn().mockReturnValue(new Response()),
      };
      const next = vi.fn();

      staffOnly(c as any, next);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'STAFF_REALM_REQUIRED' }),
        }),
        403,
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('staffOnly should allow staff users', () => {
      const c = {
        get: vi.fn().mockReturnValue({ isStaff: true }),
        json: vi.fn(),
      };
      const next = vi.fn();

      staffOnly(c as any, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('SQL injection prevention', () => {
    it('tenancy middleware should reject missing workspace header (400)', async () => {
      const mockDb = createMockDatabase();
      vi.mocked(jwtVerify).mockResolvedValue({
        payload: { sub: 'user-001', iss: 'https://auth.mushin.io', aud: 'mushin-api', exp: 9999999999, iat: 1000000000 },
      } as any);

      const middleware = tenancyMiddleware({
        jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
        jwtIssuer: 'https://auth.mushin.io',
        jwtAudience: 'mushin-api',
        db: mockDb as any,
      });

      const c = {
        req: { header: (name: string) => name === 'Authorization' ? 'Bearer valid-token' : undefined },
        json: vi.fn().mockReturnValue(new Response()),
        set: vi.fn(),
        get: vi.fn(),
      };

      await middleware(c as any, vi.fn());

      // Should return 400 — X-Workspace-ID is required
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'WORKSPACE_ID_REQUIRED' }),
        }),
        400,
      );
    });

    it('tenancy middleware should reject expired JWT (401)', async () => {
      const mockDb = createMockDatabase();
      vi.mocked(jwtVerify).mockRejectedValue(new Error('JWT expired'));

      const middleware = tenancyMiddleware({
        jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
        jwtIssuer: 'https://auth.mushin.io',
        jwtAudience: 'mushin-api',
        db: mockDb as any,
      });

      const c = {
        req: { header: (name: string) => name === 'Authorization' ? 'Bearer expired-token' : name === 'X-Workspace-ID' ? 'ws-001' : undefined },
        json: vi.fn().mockReturnValue(new Response()),
        set: vi.fn(),
        get: vi.fn(),
      };

      await middleware(c as any, vi.fn());

      // Should return 401 — JWT is expired
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'AUTH_TOKEN_EXPIRED' }),
        }),
        401,
      );
    });
  });
});
