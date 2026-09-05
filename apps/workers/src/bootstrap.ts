/**
 * Worker Bootstrap — Self-starting entry point.
 *
 * Instantiates EventWorker with real DB/SQS connections,
 * registers handlers and scheduled jobs, starts polling.
 * Handles SIGTERM/SIGINT for graceful shutdown.
 */
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { getEnv } from '@mushin/config';
import { getDb } from '@mushin/database';
import { createLogger } from '@mushin/shared';
import { EventWorker, type SQSClient as SQSClientInterface, type SQSMessage } from './worker.js';
import { createTimelineWriterHandler } from './handlers/timeline-writer.js';
import { createFeedbackProcessorHandler } from './handlers/feedback-processor.js';
import { createBillingStateHandler } from './handlers/billing-state.js';
import { runCreditGrantJob, runReservationSweeper } from './jobs/index.js';

const logger = createLogger('worker:bootstrap');

// ── SQS Adapter ──────────────────────────────────────────────

function createSQSAdapter(config: { region: string }): SQSClientInterface {
  const client = new SQSClient({ region: config.region });

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
  };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const env = getEnv();
  logger.info('Worker starting', { nodeEnv: env.NODE_ENV });

  const db = getDb(env.DATABASE_URL);
  const sqs = createSQSAdapter({ region: env.AWS_REGION });

  // ── Register event handlers ──────────────────────────────
  const handlers = [
    createTimelineWriterHandler(db),
    createFeedbackProcessorHandler(),
    createBillingStateHandler(db),
  ];

  // ── Create worker ────────────────────────────────────────
  const queueUrl = env.SQS_OUTBOX_QUEUE_URL ?? '';
  if (!queueUrl) {
    logger.warn('No SQS_OUTBOX_QUEUE_URL configured — worker will not poll');
  }

  const worker = new EventWorker(
    {
      name: 'mushin-event-worker',
      queueUrl,
      batchSize: 10,
      visibilityTimeout: 300,
      waitTimeSeconds: 20,
    },
    sqs,
    db,
    handlers,
  );

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

  // ── Start worker ─────────────────────────────────────────
  if (queueUrl) {
    worker.start();
    logger.info('Worker started', { queueUrl });
  }

  // ── Graceful shutdown ────────────────────────────────────
  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);

    clearInterval(sweepTimer);
    clearInterval(grantTimer);

    // Wait for in-flight messages to complete (max 30s)
    await worker.stop(30_000);

    logger.info('Worker stopped');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Worker failed to start', undefined, err instanceof Error ? err : undefined);
  process.exit(1);
});
