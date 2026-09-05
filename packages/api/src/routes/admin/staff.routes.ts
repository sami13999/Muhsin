/**
 * Staff Management Routes — Admin-only endpoints.
 *
 * POST /admin/staff — Create staff user
 * GET /admin/staff — List staff users
 * GET /admin/staff/:id — Get staff user
 * PATCH /admin/staff/:id/promote — Promote to staff role
 * PATCH /admin/staff/:id/demote — Demote from staff
 * POST /admin/staff/:id/revoke — Revoke staff access
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { Database } from '@mushin/database';
import type { StaffService } from '../../services/staff.service.js';
import { staffOnly } from '../../middleware/tenancy.js';
import { requireStaffRole } from '../../middleware/staff-rbac.js';
import { auditLog } from '../../middleware/audit-log.js';

// ── Validation Schemas ───────────────────────────────────────

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(200),
  role: z.enum(['admin', 'support']),
  department: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const promoteSchema = z.object({
  role: z.enum(['admin', 'support']),
  displayName: z.string().min(1).max(200),
  department: z.string().max(100).optional(),
});

// ── Route Factory ────────────────────────────────────────────

export function createStaffRoutes(staffService: StaffService): Hono {
  const routes = new Hono();

  /**
   * POST /admin/staff
   * Create a new staff user.
   */
  routes.post('/',
    staffOnly,
    requireStaffRole('admin'),
    auditLog('staff.create', 'staff'),
    async (c) => {
      const requestId = c.get('requestId');
      const body = await c.req.json();
      const parsed = createStaffSchema.safeParse(body);

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

      try {
        const staffUser = await staffService.createStaffUser(parsed.data);
        return c.json({ data: staffUser, meta: { request_id: requestId } }, 201);
      } catch (err) {
        return c.json(
          {
            error: {
              code: 'STAFF_CREATE_FAILED',
              message: err instanceof Error ? err.message : 'Failed to create staff user',
              request_id: requestId,
            },
          },
          400,
        );
      }
    },
  );

  /**
   * GET /admin/staff
   * List all staff users.
   */
  routes.get('/',
    staffOnly,
    requireStaffRole('admin'),
    async (c) => {
      const requestId = c.get('requestId');
      const staffUsers = await staffService.listStaffUsers();
      return c.json({ data: staffUsers, meta: { request_id: requestId } });
    },
  );

  /**
   * GET /admin/staff/:id
   * Get a staff user by ID.
   */
  routes.get('/:id',
    staffOnly,
    requireStaffRole('admin'),
    async (c) => {
      const requestId = c.get('requestId');
      const userId = c.req.param('id')!;

      const staffUser = await staffService.getStaffUser(userId);
      if (!staffUser) {
        return c.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: `Staff user not found: ${userId}`,
              request_id: requestId,
            },
          },
          404,
        );
      }

      return c.json({ data: staffUser, meta: { request_id: requestId } });
    },
  );

  /**
   * PATCH /admin/staff/:id/promote
   * Promote an existing user to staff role.
   */
  routes.patch('/:id/promote',
    staffOnly,
    requireStaffRole('admin'),
    auditLog('staff.promote', 'staff'),
    async (c) => {
      const requestId = c.get('requestId');
      const userId = c.req.param('id')!;
      const body = await c.req.json();
      const parsed = promoteSchema.safeParse(body);

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

      try {
        const staffUser = await staffService.promoteToStaff(
          userId,
          parsed.data.role,
          parsed.data.displayName,
          parsed.data.department,
        );
        return c.json({ data: staffUser, meta: { request_id: requestId } });
      } catch (err) {
        return c.json(
          {
            error: {
              code: 'STAFF_PROMOTE_FAILED',
              message: err instanceof Error ? err.message : 'Failed to promote user',
              request_id: requestId,
            },
          },
          400,
        );
      }
    },
  );

  /**
   * PATCH /admin/staff/:id/demote
   * Demote a staff user to regular user.
   */
  routes.patch('/:id/demote',
    staffOnly,
    requireStaffRole('admin'),
    auditLog('staff.demote', 'staff'),
    async (c) => {
      const requestId = c.get('requestId');
      const userId = c.req.param('id')!;

      try {
        await staffService.demoteStaffUser(userId);
        return c.json({ data: { success: true }, meta: { request_id: requestId } });
      } catch (err) {
        return c.json(
          {
            error: {
              code: 'STAFF_DEMOTE_FAILED',
              message: err instanceof Error ? err.message : 'Failed to demote user',
              request_id: requestId,
            },
          },
          400,
        );
      }
    },
  );

  /**
   * POST /admin/staff/:id/revoke
   * Revoke staff access.
   */
  routes.post('/:id/revoke',
    staffOnly,
    requireStaffRole('admin'),
    auditLog('staff.revoke', 'staff'),
    async (c) => {
      const requestId = c.get('requestId');
      const userId = c.req.param('id')!;

      try {
        await staffService.revokeStaffAccess(userId);
        return c.json({ data: { success: true }, meta: { request_id: requestId } });
      } catch (err) {
        return c.json(
          {
            error: {
              code: 'STAFF_REVOKE_FAILED',
              message: err instanceof Error ? err.message : 'Failed to revoke access',
              request_id: requestId,
            },
          },
          400,
        );
      }
    },
  );

  return routes;
}
