/**
 * Admin Routes — Staff-only endpoints.
 *
 * GET /admin/stats — System-wide statistics (workspace count, creator count, etc.)
 */
import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { Database } from '@mushin/database';
import { workspace, creator } from '@mushin/database';

// ── Route Factory ────────────────────────────────────────────

export function createAdminRoutes(db: Database): Hono {
  const routes = new Hono();

  /**
   * GET /admin/stats
   * System-wide statistics. Staff-only (enforced by middleware in app composition).
   */
  routes.get('/stats', async (c) => {
    const requestId = c.get('requestId');

    const [workspaceCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspace);

    const [creatorCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(creator);

    return c.json({
      data: {
        workspaces: workspaceCount?.count ?? 0,
        creators: creatorCount?.count ?? 0,
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
