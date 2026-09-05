/**
 * M12 Analytics — Routes.
 *
 * GET /analytics — Workspace analytics (credit usage, outreach, creators)
 */
import { Hono } from 'hono';
import type { TenancyContext } from '@mushin/shared';
import type { AnalyticsService } from '../../services/analytics.service.js';

// ── Route Factory ────────────────────────────────────────────

export function createAnalyticsRoutes(analytics: AnalyticsService): Hono {
  const routes = new Hono();

  /**
   * GET /analytics?period=current_month
   * Workspace analytics for the given period.
   */
  routes.get('/analytics', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const period = c.req.query('period') ?? 'current_month';

    const data = await analytics.getWorkspaceAnalytics(tenancy.workspaceId, period);

    return c.json({
      data: { analytics: data },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
