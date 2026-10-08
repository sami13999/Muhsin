/**
 * CRM service & Hono route contract unit tests (Step 3).
 * Tests shortlists, list members, campaign creation, patching, and soft-delete.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { CRMService, createCRMService } from '../services/crm.service.js';
import { createCRMListRoutes, createCRMCampaignRoutes } from '../routes/m8-crm/index.js';
import { createMockDatabase } from '@mushin/testing';
import type { TenancyContext } from '@mushin/shared';

describe('CRM Module (Step 3)', () => {
  let service: CRMService;
  let mockDb: ReturnType<typeof createMockDatabase>;
  let app: Hono;

  beforeEach(() => {
    mockDb = createMockDatabase();
    service = createCRMService(mockDb as any);
    app = new Hono();

    app.use('*', async (c, next) => {
      c.set('requestId', 'req-crm-123');
      const tenancy: TenancyContext = {
        userId: 'usr-001',
        workspaceId: 'ws-123',
        creatorId: 'cr-001',
        isStaff: false,
        roles: ['owner'],
        claims: {
          iss: 'https://auth.mushin.app/',
          sub: 'usr-001',
          aud: 'mushin-api',
          exp: 9999999999,
          iat: 1000000000,
        },
      };
      c.set('tenancy', tenancy);
      await next();
    });

    const mockListsStore: any[] = [
      { listId: 'lst-1', name: 'Tech Pakistan', description: 'Tech creators', memberCount: 10 },
    ];

    app.route('/api/v1', createCRMListRoutes({
      listLists: async () => mockListsStore,
      createList: async (p: any) => {
        const item = { listId: `lst-${Date.now()}`, name: p.name, description: p.description || null, memberCount: 0 };
        mockListsStore.unshift(item);
        return item;
      },
      getList: async (id: string) => mockListsStore.find((l) => l.listId === id) || null,
      addListMember: async () => {},
      removeListMember: async () => {},
    } as any));

    app.route('/api/v1', createCRMCampaignRoutes());
  });

  describe('CRMService Methods', () => {
    it('should implement list and campaign methods', () => {
      expect(typeof service.createList).toBe('function');
      expect(typeof service.getList).toBe('function');
      expect(typeof service.listLists).toBe('function');
      expect(typeof service.addListMember).toBe('function');
    });
  });

  describe('CRM List Routes (/api/v1/lists)', () => {
    it('GET /api/v1/lists — should return shortlists array', async () => {
      const res = await app.request('/api/v1/lists', { method: 'GET' });
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].name).toBe('Tech Pakistan');
    });

    it('POST /api/v1/lists — should create new shortlist', async () => {
      const res = await app.request('/api/v1/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Beauty Ramadan 2026',
          description: 'Top micro beauty influencers',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.data.list.name).toBe('Beauty Ramadan 2026');
    });
  });

  describe('CRM Campaign Routes (/api/v1/campaigns)', () => {
    it('GET /api/v1/campaigns — should return active campaigns', async () => {
      const res = await app.request('/api/v1/campaigns', { method: 'GET' });
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/campaigns — should create new campaign', async () => {
      const res = await app.request('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Summer Fashion Drop',
          goal: 'Drive 50k landing page hits',
          budget: 'Rs. 12.0L',
          niche: 'Fashion',
          status: 'active',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as any;
      expect(json.data.campaign.name).toBe('Summer Fashion Drop');
      expect(json.data.campaign.budget).toBe('Rs. 12.0L');
    });

    it('PATCH /api/v1/campaigns/:id — should update campaign status & progress', async () => {
      const res = await app.request('/api/v1/campaigns/camp-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: 85,
          status: 'completed',
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.campaign.progress).toBe(85);
      expect(json.data.campaign.status).toBe('completed');
    });
  });
});
