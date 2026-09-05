/**
 * MUSHIN API — Standalone Server Entry Point.
 *
 * Boots the Hono application on Node.js HTTP server.
 * Handles graceful shutdown on SIGTERM/SIGINT.
 */
import { serve } from '@hono/node-server';
import { createApp } from './index.js';
import { createLogger, initAxiom, shutdownAxiom, startMetricsExport, stopMetricsExport } from '@mushin/shared';

const logger = createLogger('api:server');

async function main() {
  const port = Number(process.env['PORT'] ?? 3000);

  // Initialize observability (Axiom logs + metrics export)
  initAxiom();
  startMetricsExport();

  const app = createApp();

  const server = serve({
    fetch: app.fetch,
    port,
  }, (info) => {
    logger.info(`MUSHIN API listening on http://localhost:${info.port}`);
  });

  // ── Graceful Shutdown ──────────────────────────────────────

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Flush observability data before exit
    stopMetricsExport();
    shutdownAxiom();

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Prevent crashes from unhandled errors in request handlers
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', undefined, err instanceof Error ? err : undefined);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', undefined, err);
    // Don't exit — let the server continue serving other requests
  });
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  if (err instanceof Error) {
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
  }
  process.exit(1);
});
