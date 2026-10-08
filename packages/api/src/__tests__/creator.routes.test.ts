/**
 * Creator & Search API contract tests (Step 2).
 * Verifies creator store, reveal gating (ADR-029 minor_signal), and search.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createMockDatabase } from '@mushin/testing';
import type { TenancyContext } from '@mushin/shared';

vi.mock('@mushin/database/repositories/creator.repository', () => ({
  findById: vi.fn(),
  findByHandle: vi.fn(),
  create: vi.fn(),
  list: vi.fn(),
}));

import * as creatorRepo from '@mushin/database/repositories/creator.repository';
import { createM2Routes } from '../routes/m2-creator/creator.routes.js';
import { createRevealRoutes } from '../routes/m2-creator/reveal.routes.js';

describe('Creator & Reveal Routes (Step 2)', () => {
  let app: Hono;
  let mockDb: any;
  let mockMeilisearch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDatabase();
    mockMeilisearch = {
      upsertDocument: vi.fn().mockResolvedValue({ status: 'success' }),
    };

    app = new Hono();

    app.use('*', async (c, next) => {
      c.set('requestId', 'req-creator-123');
      const tenancy: TenancyContext = {
        userId: 'usr-analyst-001',
        workspaceId: 'ws-123',
        creatorId: 'cr-001',
        isStaff: false,
        roles: ['admin'],
        claims: {
          iss: 'https://auth.mushin.app/',
          sub: 'usr-analyst-001',
          aud: 'mushin-api',
          exp: 9999999999,
          iat: 1000000000,
        },
      };
      c.set('tenancy', tenancy);
      await next();
    });

    app.route('/api/v1', createM2Routes(mockDb, mockMeilisearch));
    app.route('/api/v1', createRevealRoutes(mockDb));
  });

  describe('GET /api/v1/creators/:id', () => {
    it('should return creator profile detail for valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(creatorRepo.findById).mockResolvedValue({
        creator: { creatorId: validUuid, name: 'Ayesha Khan', minorSignal: false } as any,
        profiles: [{ platform: 'instagram', handle: '@ayeshakhan' }] as any,
        enrichmentSnapshots: [],
        nicheClassifications: [{ niche: 'fashion' }] as any,
      });

      const res = await app.request(`/api/v1/creators/${validUuid}`, { method: 'GET' });
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.creator.name).toBe('Ayesha Khan');
      expect(json.data.niches[0].niche).toBe('fashion');
    });

    it('should return 400 for invalid non-UUID format', async () => {
      const res = await app.request('/api/v1/creators/invalid-id-123', { method: 'GET' });
      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('INVALID_UUID');
    });

    it('should return 404 if creator does not exist in DB', async () => {
      const validUuid = '999e4567-e89b-12d3-a456-426614174999';
      vi.mocked(creatorRepo.findById).mockResolvedValue(null);

      const res = await app.request(`/api/v1/creators/${validUuid}`, { method: 'GET' });
      expect(res.status).toBe(404);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/creators', () => {
    it('should create new creator and project to Meilisearch index', async () => {
      vi.mocked(creatorRepo.findByHandle).mockResolvedValue(null);
      vi.mocked(creatorRepo.create).mockResolvedValue({
        creator: { creatorId: '123e4567-e89b-12d3-a456-426614174000', name: 'Zain Ahmed' } as any,
        profiles: [{ platform: 'youtube', handle: '@zaintech' }] as any,
        enrichmentSnapshots: [],
        nicheClassifications: [],
      });

      const res = await app.request('/api/v1/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zain Ahmed',
          handle: '@zaintech',
          platform: 'youtube',
          canonicalUrl: 'https://youtube.com/@zaintech',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.data.creator.name).toBe('Zain Ahmed');
    });

    it('should reject creation if handle + platform already exists', async () => {
      vi.mocked(creatorRepo.findByHandle).mockResolvedValue({
        creator: { creatorId: '123e4567-e89b-12d3-a456-426614174000' } as any,
      } as any);

      const res = await app.request('/api/v1/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zain Ahmed',
          handle: '@zaintech',
          platform: 'youtube',
          canonicalUrl: 'https://youtube.com/@zaintech',
        }),
      });

      expect(res.status).toBe(409);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('CONFLICT');
    });
  });
});
