/**
 * Health Check Routes — DOC-023 compliant.
 *
 * GET /health       — Full health check (all registered components)
 * GET /health/liveness — Liveness probe (always 200 if process alive)
 */
import { Hono } from 'hono';
import { livenessCheck, runHealthChecks } from '@mushin/shared';
import type { Database } from '@mushin/database';

export function createHealthRoutes(db: Database): Hono {
  const routes = new Hono();

  /**
   * GET /health
   * Full health check — returns 200 if healthy, 503 if degraded/unhealthy.
   */
  routes.get('/', async (c) => {
    const result = await runHealthChecks();
    const status = result.status === 'healthy' ? 200 : 503;
    return c.json(result, status);
  });

  /**
   * GET /health/liveness
   * Liveness probe — always 200 if process is running.
   */
  routes.get('/liveness', async (c) => {
    return c.json(livenessCheck());
  });

  return routes;
}
