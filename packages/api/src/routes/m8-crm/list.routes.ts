/**
 * M8 CRM — List Routes.
 *
 * GET    /lists           — List all lists in workspace
 * POST   /lists           — Create a new list
 * GET    /lists/:id       — Get list detail
 * POST   /lists/:id/members — Add member to list
 * DELETE /lists/:id/members/:memberId — Remove member from list
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { TenancyContext } from '@mushin/shared';
import type { CRMService } from '../../services/crm.service.js';

// ── Validation Schemas ───────────────────────────────────────

const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'workspace']).default('workspace'),
});

const addMemberSchema = z.object({
  workspaceCreatorLinkId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

// ── Route Factory ────────────────────────────────────────────

export function createCRMListRoutes(crm: CRMService): Hono {
  const routes = new Hono();

  /**
   * GET /lists
   * List all lists in the current workspace.
   */
  routes.get('/lists', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');

    const lists = await crm.listLists(tenancy.workspaceId);

    return c.json({
      data: lists,
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /lists
   * Create a new list in the current workspace.
   */
  routes.post('/lists', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');

    const body = await c.req.json();
    const parsed = createListSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    const list = await crm.createList({
      workspaceId: tenancy.workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      createdBy: tenancy.userId,
    });

    return c.json(
      { data: { list }, meta: { request_id: requestId } },
      201,
    );
  });

  /**
   * GET /lists/:id
   * Get list detail with members.
   */
  routes.get('/lists/:id', async (c) => {
    const requestId = c.get('requestId');
    const listId = c.req.param('id');

    const list = await crm.getList(listId);
    if (!list) {
      return c.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `List not found: ${listId}`,
            request_id: requestId,
          },
        },
        404,
      );
    }

    return c.json({
      data: { list },
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /lists/:id/members
   * Add a creator to a list.
   */
  routes.post('/lists/:id/members', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const listId = c.req.param('id');

    const body = await c.req.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
            request_id: requestId,
          },
        },
        400,
      );
    }

    await crm.addListMember({
      listId,
      workspaceCreatorLinkId: parsed.data.workspaceCreatorLinkId,
      addedBy: tenancy.userId,
      notes: parsed.data.notes,
    });

    return c.json(
      { data: { success: true }, meta: { request_id: requestId } },
      201,
    );
  });

  /**
   * DELETE /lists/:id/members/:memberId
   * Remove a creator from a list (soft delete).
   */
  routes.delete('/lists/:id/members/:memberId', async (c) => {
    const requestId = c.get('requestId');
    const memberId = c.req.param('memberId');

    await crm.removeListMember(memberId);

    return c.body(null, 204);
  });

  return routes;
}
