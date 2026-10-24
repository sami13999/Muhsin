/**
 * Worker Bootstrap — Self-starting entry point.
 *
 * Instantiates EventWorker with real DB/SQS connections,
 * registers handlers and scheduled jobs, starts polling.
 * Handles SIGTERM/SIGINT for graceful shutdown.
 */
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ChangeMessageVisibilityCommand } from '@aws-sdk/client-sqs';
import { getEnv } from '@mushin/config';
import { getDb, type Database } from '@mushin/database';
import { createMeilisearchAdapter, createSerperAdapter, createApifyAdapter, createLLMAdapter } from '@mushin/adapters';
import { createDiscoveryOrchestrator } from '@mushin/api';
import { createLogger } from '@mushin/shared';
import { EventWorker, type SQSClient as SQSClientInterface, type SQSMessage } from './worker.js';
import { createTimelineWriterHandler } from './handlers/timeline-writer.js';
import { createFeedbackProcessorHandler } from './handlers/feedback-processor.js';
import { createBillingStateHandler } from './handlers/billing-state.js';
import { createCreatorErasureHandler } from './handlers/creator-erasure.js';
import { createDiscoveryJobHandler } from './handlers/discovery-worker.js';
import { runCreditGrantJob, runReservationSweeper } from './jobs/index.js';

const logger = createLogger('worker:bootstrap');

// ── SQS Adapter ──────────────────────────────────────────────

function createSQSAdapter(config: { region: string; endpoint?: string }): SQSClientInterface {
  const endpoint =
    config.endpoint ||
    process.env['AWS_ENDPOINT_URL'] ||
    process.env['AWS_ENDPOINT_URL_SQS'] ||
    process.env['LOCALSTACK_ENDPOINT'];

  const client = new SQSClient({
    region: config.region,
    ...(endpoint ? { endpoint } : {}),
  });

  return {
    async receiveMessages(params) {
      const command = new ReceiveMessageCommand({
        QueueUrl: params.queueUrl,
        MaxNumberOfMessages: params.maxMessages,
        WaitTimeSeconds: params.waitTimeSeconds,
        VisibilityTimeout: params.visibilityTimeout,
      });

      const response = await client.send(command);
      return (response.Messages ?? []).map((msg) => ({
        messageId: msg.MessageId ?? '',
        body: msg.Body ?? '',
        receiptHandle: msg.ReceiptHandle ?? '',
        attributes: msg.Attributes as Record<string, string> | undefined,
      }));
    },

    async deleteMessage(params) {
      await client.send(new DeleteMessageCommand({
        QueueUrl: params.queueUrl,
        ReceiptHandle: params.receiptHandle,
      }));
    },

    async changeMessageVisibility(params) {
      await client.send(new ChangeMessageVisibilityCommand({
        QueueUrl: params.queueUrl,
        ReceiptHandle: params.receiptHandle,
        VisibilityTimeout: params.visibilityTimeout,
      }));
    },
  };
}

/**
 * Local Database Outbox Queue Adapter — Local Development & Test Alternative.
 * Used when AWS SQS is unconfigured. Polls platform.outbox directly using FOR UPDATE SKIP LOCKED
 * without changing the worker dispatch architecture or production SQS client code.
 */
export function createLocalDatabaseQueueAdapter(db: Database): SQSClientInterface {
  logger.info('[LocalDevQueue] Using Local Database Outbox Queue Adapter (zero external cloud SQS requirement)');
  return {
    async receiveMessages(params) {
      try {
        const rows = await (db as any).unsafe(`
          SELECT outbox_id, event_id, event_type, schema_version, scope_class, workspace_id, actor_type, actor_id, correlation_id, causation_id, payload, occurred_at
          FROM platform.outbox
          WHERE dispatched_at IS NULL
          ORDER BY created_at ASC
          LIMIT ${params.maxMessages}
          FOR UPDATE SKIP LOCKED
        `);
        return (rows ?? []).map((row: any) => ({
          messageId: row.event_id,
          receiptHandle: row.outbox_id,
          body: JSON.stringify({
            eventId: row.event_id,
            type: row.event_type,
            schemaVersion: row.schema_version,
            scopeClass: row.scope_class,
            workspaceId: row.workspace_id,
            actor: { type: row.actor_type, id: row.actor_id },
            correlationId: row.correlation_id,
            causationId: row.causation_id,
            occurredAt: row.occurred_at,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
          }),
        }));
      } catch {
        return [];
      }
    },

    async deleteMessage(params) {
      try {
        await (db as any).unsafe(`
          UPDATE platform.outbox
          SET dispatched_at = NOW()
          WHERE outbox_id = '${params.receiptHandle}'
        `);
      } catch {
        // Safe ignore
      }
    },

    async changeMessageVisibility() {
      // Visibility extension is handled naturally in local DB outbox mode
    },
  };
}


// ── Worker Factory ───────────────────────────────────────────

export interface WorkerPoolConfig {
  outboxQueueUrl?: string;
  erasureQueueUrl?: string;
  discoveryQueueUrl?: string;
}

export function buildWorkers(
  config: WorkerPoolConfig,
  deps: {
    sqs: SQSClientInterface;
    db: Database;
    meilisearch: Parameters<typeof createCreatorErasureHandler>[0];
    orchestrator?: Parameters<typeof createDiscoveryJobHandler>[0];
  },
): EventWorker[] {
  const outboxQueueUrl = config.outboxQueueUrl ?? '';

  const handlers = [
    createTimelineWriterHandler(deps.db),
    createFeedbackProcessorHandler(),
    createBillingStateHandler(deps.db),
    createCreatorErasureHandler(deps.meilisearch),
    ...(deps.orchestrator
      ? [
          createDiscoveryJobHandler(
            deps.orchestrator,
            deps.db,
            outboxQueueUrl && deps.sqs.changeMessageVisibility
              ? (receiptHandle, timeoutSeconds) =>
                  deps.sqs.changeMessageVisibility!({
                    queueUrl: outboxQueueUrl,
                    receiptHandle,
                    visibilityTimeout: timeoutSeconds,
                  })
              : undefined,
          ),
        ]
      : []),
  ];

  const workers: EventWorker[] = [];

  if (outboxQueueUrl) {
    const mainWorker = new EventWorker(
      {
        name: 'mushin-event-worker',
        queueUrl: outboxQueueUrl,
        batchSize: 10,
        visibilityTimeout: 300,
        waitTimeSeconds: 20,
      },
      deps.sqs,
      deps.db,
      handlers,
    );
    workers.push(mainWorker);
  } else {
    logger.warn('No SQS_OUTBOX_QUEUE_URL configured — main worker will not poll');
  }

  // Dedicated regulatory erasure worker (ADR-031 72-hour regulatory SLA)
  const erasureQueueUrl = config.erasureQueueUrl ?? '';
  if (erasureQueueUrl && erasureQueueUrl !== outboxQueueUrl) {
    const erasureWorker = new EventWorker(
      {
        name: 'mushin-erasure-worker',
        queueUrl: erasureQueueUrl,
        batchSize: 10,
        visibilityTimeout: 300,
        waitTimeSeconds: 20,
      },
      deps.sqs,
      deps.db,
      [createCreatorErasureHandler(deps.meilisearch)],
    );
    workers.push(erasureWorker);
  }

  // Dedicated discovery worker (ADR-031 interactive discovery)
  // SQS visibility timeout: 450s (> DB lease 360s > orchestrator timeout 210s > heartbeat 60s)
  const discoveryQueueUrl = config.discoveryQueueUrl ?? '';
  if (discoveryQueueUrl && discoveryQueueUrl !== outboxQueueUrl && deps.orchestrator) {
    const discoveryWorker = new EventWorker(
      {
        name: 'mushin-discovery-worker',
        queueUrl: discoveryQueueUrl,
        batchSize: 5,
        visibilityTimeout: 450,
        waitTimeSeconds: 10,
      },
      deps.sqs,
      deps.db,
      [
        createDiscoveryJobHandler(
          deps.orchestrator,
          deps.db,
          discoveryQueueUrl && deps.sqs.changeMessageVisibility
            ? (receiptHandle, timeoutSeconds) =>
                deps.sqs.changeMessageVisibility!({
                  queueUrl: discoveryQueueUrl,
                  receiptHandle,
                  visibilityTimeout: timeoutSeconds,
                })
            : undefined,
        ),
      ],
    );
    workers.push(discoveryWorker);
  }

  return workers;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const env = getEnv();
  const db = getDb(env.DATABASE_URL);

  const meilisearch = createMeilisearchAdapter({
    host: env.MEILISEARCH_HOST ?? 'http://localhost:7700',
    apiKey: env.MEILISEARCH_API_KEY ?? '',
    indexName: 'creators',
  });

  const serper = createSerperAdapter({
    apiKey: env.SERPER_API_KEY ?? 'mock-serper-key',
  });

  const apify = createApifyAdapter({
    apiKey: env.APIFY_TOKEN ?? 'mock-apify-key',
  });

  const llm = createLLMAdapter({
    groqApiKey: env.GROQ_API_KEY ?? 'test-groq-key',
    anthropicApiKey: env.ANTHROPIC_API_KEY,
  });

  const orchestrator = createDiscoveryOrchestrator(db, serper, apify, llm, meilisearch);

  const isLocalQueue = !env.SQS_OUTBOX_QUEUE_URL || process.env['LOCAL_DEV_QUEUE'] === 'true';
  const sqs = isLocalQueue
    ? createLocalDatabaseQueueAdapter(db)
    : createSQSAdapter({ region: env.AWS_REGION });

  const workers = buildWorkers(
    {
      outboxQueueUrl: isLocalQueue ? 'local://platform.outbox' : env.SQS_OUTBOX_QUEUE_URL,
      erasureQueueUrl: isLocalQueue ? 'local://platform.outbox' : env.SQS_ERASURE_QUEUE_URL,
      discoveryQueueUrl: isLocalQueue ? 'local://platform.outbox' : env.SQS_DISCOVERY_QUEUE_URL,
    },
    { sqs, db, meilisearch, orchestrator },
  );

  for (const worker of workers) {
    worker.start();
    logger.info('Worker started', { name: (worker as any).config.name, queueUrl: (worker as any).config.queueUrl });
  }

  // ── Scheduled jobs ───────────────────────────────────────
  const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const GRANT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const sweepTimer = setInterval(async () => {
    try {
      await runReservationSweeper(db);
    } catch (err) {
      logger.error('Reservation sweeper failed', undefined, err instanceof Error ? err : undefined);
    }
  }, SWEEP_INTERVAL_MS);

  const grantTimer = setInterval(async () => {
    try {
      await runCreditGrantJob(db);
    } catch (err) {
      logger.error('Credit grant job failed', undefined, err instanceof Error ? err : undefined);
    }
  }, GRANT_INTERVAL_MS);

  // ── Graceful shutdown ────────────────────────────────────
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);

    clearInterval(sweepTimer);
    clearInterval(grantTimer);

    // Wait for in-flight messages across all workers to complete (max 30s)
    await Promise.all(workers.map((w) => w.stop(30_000)));

    logger.info('Workers stopped');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.env['NODE_ENV'] !== 'test') {
  main().catch((err) => {
    logger.error('Worker failed to start', undefined, err instanceof Error ? err : undefined);
    process.exit(1);
  });
}
