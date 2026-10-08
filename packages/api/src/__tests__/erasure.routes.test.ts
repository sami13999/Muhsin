/**
 * GDPR Erasure API Contract Tests (TD-12).
 * Verifies GDPR erasure endpoints, reason validation, erasure status checks, and handle blocking.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createMockDatabase } from '@mushin/testing';
import type { TenancyContext } from '@mushin/shared';

vi.mock('@mushin/database/repositories/creator.repository', () => ({
  eraseCreator: vi.fn(),
  isCreatorErased: vi.fn(),
  isHandleBlocked: vi.fn(),
}));

import * as creatorRepo from '@mushin/database/repositories/creator.repository';
import { createErasureRoutes } from '../routes/m2-creator/index.js';

describe('GDPR Erasure Routes (TD-12)', () => {
  let app: Hono;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDatabase();

    app = new Hono();

    app.use('*', async (c, next) => {
      c.set('requestId', 'req-erasure-123');
      c.set('db', mockDb);
      const tenancy: TenancyContext = {
        userId: 'usr-admin-001',
        workspaceId: 'ws-123',
        creatorId: 'cr-001',
        isStaff: true,
        roles: ['admin'],
        claims: {
          iss: 'https://auth.mushin.app/',
          sub: 'usr-admin-001',
          aud: 'mushin-api',
          exp: 9999999999,
          iat: 1000000000,
        },
      };
      c.set('tenancy', tenancy);
      await next();
    });

    app.route('/api/v1/creators', createErasureRoutes);
  });

  describe('POST /api/v1/creators/:id/erasure', () => {
    it('should execute erasure for valid reason and return status completed', async () => {
      vi.mocked(creatorRepo.eraseCreator).mockResolvedValue('completed' as any);

      const res = await app.request('/api/v1/creators/cr-456/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User explicitly submitted GDPR right to be forgotten request',
          requestedBy: 'usr-admin-001',
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.status).toBe('completed');
      expect(json.creatorId).toBe('cr-456');
    });

    it('should reject erasure request if reason is under 10 characters', async () => {
      const res = await app.request('/api/v1/creators/cr-456/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Short',
          requestedBy: 'usr-admin-001',
        }),
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 if creator is not found', async () => {
      vi.mocked(creatorRepo.eraseCreator).mockResolvedValue('not_found' as any);

      const res = await app.request('/api/v1/creators/nonexistent/erasure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'User explicitly submitted GDPR right to be forgotten request',
          requestedBy: 'usr-admin-001',
        }),
      });

      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/creators/:id/erasure/status', () => {
    it('should check if creator has been erased', async () => {
      vi.mocked(creatorRepo.isCreatorErased).mockResolvedValue(true as any);

      const res = await app.request('/api/v1/creators/cr-456/erasure/status', { method: 'GET' });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.creatorId).toBe('cr-456');
      expect(json.erased).toBe(true);
    });
  });

  describe('GET /api/v1/creators/handle/:handle/block-status', () => {
    it('should check if handle is blocked from re-ingestion', async () => {
      vi.mocked(creatorRepo.isHandleBlocked).mockResolvedValue(true as any);

      const res = await app.request('/api/v1/creators/handle/ayeshakhan/block-status?platform=instagram', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.handle).toBe('ayeshakhan');
      expect(json.platform).toBe('instagram');
      expect(json.blocked).toBe(true);
    });
  });
});
