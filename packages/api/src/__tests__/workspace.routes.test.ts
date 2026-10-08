/**
 * M1 Workspace API contract tests.
 * Comprehensive tests for workspace CRUD, membership, and RBAC rules.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createMockDatabase } from '@mushin/testing';
import type { TenancyContext } from '@mushin/shared';

vi.mock('@mushin/database', () => ({
  workspaceRepository: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    getMembership: vi.fn(),
    listUserWorkspaces: vi.fn(),
    updateSubscriptionStatus: vi.fn(),
  },
}));

import { workspaceRepository } from '@mushin/database';
import { createM1Routes } from '../routes/m1-workspace/workspace.routes.js';

describe('Workspace Routes (M1)', () => {
  let app: Hono;
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDatabase();
    app = new Hono();

    // Context middleware to simulate tenancy & request ID
    app.use('*', async (c, next) => {
      c.set('requestId', 'req-test-123');
      const tenancy: TenancyContext = {
        userId: 'usr-owner-001',
        workspaceId: 'ws-123',
        creatorId: 'cr-001',
        isStaff: false,
        roles: ['owner'],
        claims: {
          iss: 'https://auth.mushin.app/',
          sub: 'usr-owner-001',
          aud: 'mushin-api',
          exp: 9999999999,
          iat: 1000000000,
        },
      };
      c.set('tenancy', tenancy);
      await next();
    });

    app.route('/api/v1', createM1Routes(mockDb as any));
  });

  describe('POST /api/v1/workspaces', () => {
    it('should create a workspace when given valid payload', async () => {
      vi.mocked(workspaceRepository.findBySlug).mockResolvedValue(null);
      vi.mocked(workspaceRepository.create).mockResolvedValue({
        workspace: {
          workspaceId: 'ws-new-001',
          name: 'Acme Growth',
          slug: 'acme-growth',
          defaultTimezone: 'Asia/Karachi',
          defaultCurrency: 'PKR',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        memberCount: 1,
        creditBalance: 0n,
      });

      const res = await app.request('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Acme Growth',
          slug: 'acme-growth',
          defaultTimezone: 'Asia/Karachi',
          defaultCurrency: 'PKR',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.data.workspace.name).toBe('Acme Growth');
      expect(json.data.creditBalance).toBe('0');
      expect(json.meta.request_id).toBe('req-test-123');
    });

    it('should return 409 conflict if slug is already taken', async () => {
      vi.mocked(workspaceRepository.findBySlug).mockResolvedValue({
        workspace: { workspaceId: 'ws-existing', name: 'Existing' } as any,
        memberCount: 1,
        creditBalance: 0n,
      });

      const res = await app.request('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Acme Growth',
          slug: 'existing-slug',
        }),
      });

      expect(res.status).toBe(409);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('CONFLICT');
    });

    it('should return 400 validation error for invalid slug format', async () => {
      const res = await app.request('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid Workspace',
          slug: 'Invalid Slug With Spaces!',
        }),
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/workspaces', () => {
    it('should list all workspaces for the authenticated user', async () => {
      vi.mocked(workspaceRepository.listUserWorkspaces).mockResolvedValue([
        {
          workspace: { workspaceId: 'ws-1', name: 'Alpha', slug: 'alpha' } as any,
          membership: { role: 'owner', status: 'active', joinedAt: new Date() } as any,
        },
      ]);

      const res = await app.request('/api/v1/workspaces', { method: 'GET' });
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBe(1);
      expect(json.data[0].workspace.slug).toBe('alpha');
    });
  });

  describe('GET /api/v1/workspaces/:id', () => {
    it('should return workspace details for valid id', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue({
        workspace: { workspaceId: 'ws-123', name: 'Alpha HQ', slug: 'alpha-hq' } as any,
        memberCount: 5,
        creditBalance: 500n,
      });

      const res = await app.request('/api/v1/workspaces/ws-123', { method: 'GET' });
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.memberCount).toBe(5);
      expect(json.data.creditBalance).toBe('500');
    });

    it('should return 404 if workspace does not exist', async () => {
      vi.mocked(workspaceRepository.findById).mockResolvedValue(null);
      const res = await app.request('/api/v1/workspaces/nonexistent', { method: 'GET' });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/workspaces/:id', () => {
    it('should update workspace settings for owner/admin', async () => {
      vi.mocked(workspaceRepository.update).mockResolvedValue({
        workspace: { workspaceId: 'ws-123', name: 'Updated HQ', defaultCurrency: 'USD' } as any,
        memberCount: 3,
        creditBalance: 200n,
      });

      const res = await app.request('/api/v1/workspaces/ws-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated HQ', defaultCurrency: 'USD' }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.workspace.name).toBe('Updated HQ');
    });
  });

  describe('POST /api/v1/workspaces/:id/members', () => {
    it('should invite a new workspace member', async () => {
      vi.mocked(workspaceRepository.addMember).mockResolvedValue({
        membershipId: 'mem-999',
        workspaceId: 'ws-123',
        role: 'member',
        status: 'active',
        invitedEmail: 'colleague@mushin.app',
      } as any);

      const res = await app.request('/api/v1/workspaces/ws-123/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'colleague@mushin.app', role: 'member' }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.data.membership.invitedEmail).toBe('colleague@mushin.app');
    });
  });

  describe('DELETE /api/v1/workspaces/:id/members/:membershipId', () => {
    it('should soft delete member with 204 response', async () => {
      vi.mocked(workspaceRepository.removeMember).mockResolvedValue();

      const res = await app.request('/api/v1/workspaces/ws-123/members/mem-999', {
        method: 'DELETE',
      });

      expect(res.status).toBe(204);
      expect(workspaceRepository.removeMember).toHaveBeenCalledWith(mockDb, 'mem-999');
    });
  });
});
