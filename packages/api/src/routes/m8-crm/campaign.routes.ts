/**
 * M8 CRM — Campaign Routes.
 *
 * GET    /campaigns          — List all campaigns in workspace
 * POST   /campaigns          — Create a new campaign
 * GET    /campaigns/:id      — Get campaign detail
 * PATCH  /campaigns/:id      — Update campaign status, budget, or goal
 * DELETE /campaigns/:id      — Delete campaign (soft-delete)
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { TenancyContext } from '@mushin/shared';

const createCampaignSchema = z.object({
  name: z.string().min(1).max(150),
  goal: z.string().max(1000).optional(),
  budget: z.string().optional(),
  niche: z.string().default('Multi-platform'),
  owner: z.string().default('You'),
  dates: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  goal: z.string().max(1000).optional(),
  budget: z.string().optional(),
  spent: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  niche: z.string().optional(),
  owner: z.string().optional(),
  dates: z.string().optional(),
});

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: string;
  spent: string;
  creatorsCount: number;
  roas: string;
  progress: number;
  niche: string;
  owner: string;
  dates: string;
  goal: string;
  createdAt: string;
}

// In-memory mock storage for development mode
const mockCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Eid Sale 2026',
    status: 'active',
    budget: 'Rs. 15.0L',
    spent: 'Rs. 9.2L',
    creatorsCount: 7,
    roas: '4.2x',
    progress: 62,
    niche: 'Multi-platform',
    owner: 'Ahmed Raza Khan',
    dates: 'Jun 20 – Jul 20',
    goal: 'Drive 2M reach and 40k landing-page visits for the Eid capsule.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-2',
    name: 'Ramadan Beauty Drop',
    status: 'active',
    budget: 'Rs. 7.5L',
    spent: 'Rs. 4.1L',
    creatorsCount: 3,
    roas: '3.4x',
    progress: 48,
    niche: 'Instagram',
    owner: 'Ayesha Malik',
    dates: 'Jun 12 – Jul 08',
    goal: 'Increase brand awareness and capture 2.5K email sign-ups.',
    createdAt: new Date().toISOString(),
  },
];

export function createCRMCampaignRoutes(): Hono {
  const routes = new Hono();

  /**
   * GET /campaigns
   * List all campaigns in the current workspace.
   */
  routes.get('/campaigns', async (c) => {
    const requestId = c.get('requestId');
    return c.json({
      data: mockCampaigns,
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /campaigns
   * Create a new campaign.
   */
  routes.post('/campaigns', async (c) => {
    const requestId = c.get('requestId');

    const body = await c.req.json();
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid campaign payload',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const newCampaign = {
      id: `camp-${Date.now()}`,
      name: parsed.data.name,
      goal: parsed.data.goal || 'Drive campaign objectives & creator activation.',
      budget: parsed.data.budget || 'Rs. 10.0L',
      spent: 'Rs. 0.0L',
      creatorsCount: 0,
      roas: '0.0x',
      progress: parsed.data.status === 'active' ? 10 : 0,
      niche: parsed.data.niche,
      owner: parsed.data.owner,
      dates: parsed.data.dates || 'Jul 15 – Sep 15',
      status: parsed.data.status,
      createdAt: new Date().toISOString(),
    };

    mockCampaigns.unshift(newCampaign);

    return c.json(
      { data: { campaign: newCampaign }, meta: { request_id: requestId } },
      201,
    );
  });

  /**
   * GET /campaigns/:id
   * Get single campaign details.
   */
  routes.get('/campaigns/:id', async (c) => {
    const requestId = c.get('requestId');
    const id = c.req.param('id');

    const campaign = mockCampaigns.find((c) => c.id === id);
    if (!campaign) {
      return c.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Campaign not found: ${id}`,
            request_id: requestId,
          },
        },
        404,
      );
    }

    return c.json({
      data: { campaign },
      meta: { request_id: requestId },
    });
  });

  /**
   * PATCH /campaigns/:id
   * Update campaign details or status.
   */
  routes.patch('/campaigns/:id', async (c) => {
    const requestId = c.get('requestId');
    const id = c.req.param('id');

    const index = mockCampaigns.findIndex((c) => c.id === id);
    if (index === -1) {
      return c.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Campaign not found: ${id}`,
            request_id: requestId,
          },
        },
        404,
      );
    }

    const body = await c.req.json();
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update payload',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const current = mockCampaigns[index]!;
    const updated: Campaign = {
      ...current,
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.goal ? { goal: parsed.data.goal } : {}),
      ...(parsed.data.budget ? { budget: parsed.data.budget } : {}),
      ...(parsed.data.spent ? { spent: parsed.data.spent } : {}),
      ...(parsed.data.progress !== undefined ? { progress: parsed.data.progress } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.niche ? { niche: parsed.data.niche } : {}),
      ...(parsed.data.owner ? { owner: parsed.data.owner } : {}),
      ...(parsed.data.dates ? { dates: parsed.data.dates } : {}),
    };

    mockCampaigns[index] = updated;

    return c.json({
      data: { campaign: updated },
      meta: { request_id: requestId },
    });
  });

  /**
   * DELETE /campaigns/:id
   * Delete campaign.
   */
  routes.delete('/campaigns/:id', async (c) => {
    const id = c.req.param('id');
    const index = mockCampaigns.findIndex((c) => c.id === id);
    if (index !== -1) {
      mockCampaigns.splice(index, 1);
    }
    return c.body(null, 204);
  });

  return routes;
}
