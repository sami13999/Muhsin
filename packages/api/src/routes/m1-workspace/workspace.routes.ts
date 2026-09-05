/**
 * M1 Workspace — API Routes.
 * Workspace CRUD, membership management, RBAC.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { TenancyContext } from '@mushin/shared';
import type { Database } from '@mushin/database';
import { workspaceRepository } from '@mushin/database';

// ── Validation Schemas ───────────────────────────────────────

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  defaultTimezone: z.string().default('Asia/Karachi'),
  defaultCurrency: z.string().length(3).default('PKR'),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member'),
});

// ── Route Factory ────────────────────────────────────────────

export function createM1Routes(db: Database) {
  const routes = new Hono();

  /**
   * POST /api/v1/workspaces
   * Create workspace. User becomes owner.
   */
  routes.post('/workspaces', async (c) => {
    const requestId = c.get('requestId');
    const userId = c.get('tenancy')?.userId;

    // For workspace creation, we need userId from JWT but not an existing workspace
    // The tenancy middleware requires X-Workspace-ID, so workspace creation
    // uses a lighter auth check (just JWT validation)
    if (!userId) {
      return c.json(
        {
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Authentication required',
            request_id: requestId,
          },
        },
        401,
      );
    }

    const body = await c.req.json();
    const parsed = createWorkspaceSchema.safeParse(body);
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

    const input = parsed.data;

    // Check slug uniqueness
    const existing = await workspaceRepository.findBySlug(db, input.slug);
    if (existing) {
      return c.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Workspace slug "${input.slug}" is already taken`,
            request_id: requestId,
          },
        },
        409,
      );
    }

    const result = await workspaceRepository.create(db, {
      ...input,
      ownerId: userId,
    });

    return c.json(
      {
        data: {
          workspace: result.workspace,
          memberCount: result.memberCount,
          creditBalance: result.creditBalance.toString(),
        },
        meta: { request_id: requestId },
      },
      201,
    );
  });

  /**
   * GET /api/v1/workspaces
   * List user's workspaces (for workspace switcher, Doc 11 B1).
   */
  routes.get('/workspaces', async (c) => {
    const requestId = c.get('requestId');
    const userId = c.get('tenancy')?.userId;

    if (!userId) {
      return c.json(
        {
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Authentication required',
            request_id: requestId,
          },
        },
        401,
      );
    }

    const results = await workspaceRepository.listUserWorkspaces(db, userId);

    return c.json({
      data: results.map((r) => ({
        workspace: r.workspace,
        membership: {
          role: r.membership.role,
          status: r.membership.status,
          joinedAt: r.membership.joinedAt,
        },
      })),
      meta: { request_id: requestId },
    });
  });

  /**
   * GET /api/v1/workspaces/:id
   * Get workspace detail with credit balance and member count.
   */
  routes.get('/workspaces/:id', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const workspaceId = c.req.param('id');

    const result = await workspaceRepository.findById(db, workspaceId);
    if (!result) {
      return c.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Workspace not found: ${workspaceId}`,
            request_id: requestId,
          },
        },
        404,
      );
    }

    return c.json({
      data: {
        workspace: result.workspace,
        memberCount: result.memberCount,
        creditBalance: result.creditBalance.toString(),
      },
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /api/v1/workspaces/:id/members
   * Invite member. Requires owner/admin role.
   */
  routes.post('/workspaces/:id/members', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const workspaceId = c.req.param('id');

    // RBAC check
    if (!tenancy.roles.includes('owner') && !tenancy.roles.includes('admin')) {
      return c.json(
        {
          error: {
            code: 'ROLE_INSUFFICIENT',
            message: 'Only owners and admins can invite members',
            request_id: requestId,
          },
        },
        403,
      );
    }

    const body = await c.req.json();
    const parsed = inviteMemberSchema.safeParse(body);
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

    const { email, role } = parsed.data;

    // For now, we accept email and create a pending membership
    // In Sprint 5 Track B, this will send an invitation email
    const member = await workspaceRepository.addMember(
      db,
      workspaceId,
      crypto.randomUUID(), // Placeholder user ID until auth integration
      role,
      email,
    );

    return c.json(
      {
        data: { membership: member },
        meta: { request_id: requestId },
      },
      201,
    );
  });

  /**
   * DELETE /api/v1/workspaces/:id/members/:membershipId
   * Remove member. Requires owner/admin role.
   */
  routes.delete('/workspaces/:id/members/:membershipId', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const membershipId = c.req.param('membershipId');

    // RBAC check
    if (!tenancy.roles.includes('owner') && !tenancy.roles.includes('admin')) {
      return c.json(
        {
          error: {
            code: 'ROLE_INSUFFICIENT',
            message: 'Only owners and admins can remove members',
            request_id: requestId,
          },
        },
        403,
      );
    }

    await workspaceRepository.removeMember(db, membershipId);

    return c.body(null, 204);
  });

  return routes;
}
