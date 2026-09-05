/**
 * Worker Framework — Background event consumers.
 *
 * Workers consume events from SQS queues, process them, and mark as processed
 * via the processed_event_ledger for idempotency.
 *
 * Per ADR-031 queue-class mapping:
 * - q-discovery-high: interactive (user-waiting, highest priority)
 * - q-discovery-standard: discovery-bulk (live search fan-out)
 * - q-rescore-low: scheduled (PATCH-010 re-scoring)
 * - q-outbox-relay: events (outbox relay is the event-transport mechanism)
 * - q-erasure: erasure (72-hour regulatory SLA)
 */
import type { Database } from '@mushin/database';
import { isEventProcessed, markEventProcessed } from '@mushin/events';

// ── Types ────────────────────────────────────────────────────

export interface WorkerConfig {
  /** Worker name for logging and consumer group identification */
  name: string;
  /** SQS queue URL */
  queueUrl: string;
  /** Maximum number of messages to process per batch */
  batchSize: number;
  /** Visibility timeout in seconds */
  visibilityTimeout: number;
  /** Wait time in seconds for long polling */
  waitTimeSeconds: number;
}

export interface SQSMessage {
  messageId: string;
  body: string;
  receiptHandle: string;
  attributes?: Record<string, string>;
}

export interface SQSClient {
  /** Receive messages from queue */
  receiveMessages(params: {
    queueUrl: string;
    maxMessages: number;
    waitTimeSeconds: number;
    visibilityTimeout: number;
  }): Promise<SQSMessage[]>;

  /** Delete message from queue (after successful processing) */
  deleteMessage(params: {
    queueUrl: string;
    receiptHandle: string;
  }): Promise<void>;
}

export interface EventHandler {
  /** Event types this handler cares about */
  eventTypes: string[];
  /** Process the event */
  handle(event: ParsedEvent, db: Database): Promise<void>;
}

export interface ParsedEvent {
  eventId: string;
  type: string;
  schemaVersion: number;
  scopeClass: string;
  workspaceId: string | null;
  actor: { type: string; id: string };
  correlationId: string;
  causationId?: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}

export interface WorkerMetrics {
  processed: number;
  failed: number;
  skipped: number;
  lastPollAt: Date | null;
  isRunning: boolean;
}

// ── Worker ───────────────────────────────────────────────────

export class EventWorker {
  private config: WorkerConfig;
  private sqs: SQSClient;
  private db: Database;
  private handlers: Map<string, EventHandler[]>;
  private metrics: WorkerMetrics;
  private running: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private inFlightCount: number = 0;
  private drainResolve: (() => void) | null = null;
  private consecutiveFailures: number = 0;

  constructor(
    config: WorkerConfig,
    sqs: SQSClient,
    db: Database,
    handlers: EventHandler[],
  ) {
    this.config = config;
    this.sqs = sqs;
    this.db = db;
    this.handlers = new Map();

    // Index handlers by event type
    for (const handler of handlers) {
      for (const eventType of handler.eventTypes) {
        const existing = this.handlers.get(eventType) ?? [];
        existing.push(handler);
        this.handlers.set(eventType, existing);
      }
    }

    this.metrics = {
      processed: 0,
      failed: 0,
      skipped: 0,
      lastPollAt: null,
      isRunning: false,
    };
  }

  /**
   * Start the worker polling loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.metrics.isRunning = true;
    this.poll();
  }

  /**
   * Stop the worker polling loop and wait for in-flight messages to complete.
   * @param drainTimeoutMs Max time to wait for in-flight messages (default: 30s)
   */
  async stop(drainTimeoutMs: number = 30_000): Promise<void> {
    this.running = false;
    this.metrics.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Wait for in-flight messages to complete
    if (this.inFlightCount > 0) {
      const drainPromise = new Promise<void>((resolve) => {
        this.drainResolve = resolve;
      });

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(resolve, drainTimeoutMs);
      });

      await Promise.race([drainPromise, timeoutPromise]);
      this.drainResolve = null;
    }
  }

  /**
   * Get current worker metrics.
   */
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Single poll cycle — receive and process messages.
   */
  async poll(): Promise<number> {
    this.metrics.lastPollAt = new Date();

    try {
      const messages = await this.sqs.receiveMessages({
        queueUrl: this.config.queueUrl,
        maxMessages: this.config.batchSize,
        waitTimeSeconds: this.config.waitTimeSeconds,
        visibilityTimeout: this.config.visibilityTimeout,
      });

      if (messages.length === 0) {
        this.scheduleNext();
        return 0;
      }

      let processed = 0;

      for (const message of messages) {
        this.inFlightCount++;
        try {
          const event = this.parseMessage(message);
          if (!event) {
            this.metrics.skipped++;
            continue;
          }

          // Check idempotency
          const alreadyProcessed = await isEventProcessed(
            this.db as Parameters<typeof isEventProcessed>[0],
            this.config.name,
            event.eventId,
          );

          if (alreadyProcessed) {
            this.metrics.skipped++;
            await this.deleteMessage(message);
            continue;
          }

          // Process event
          await this.processEvent(event);

          // Mark as processed (idempotency)
          await this.db.transaction(async (tx) => {
            await markEventProcessed(tx as Parameters<typeof markEventProcessed>[0], this.config.name, event.eventId);
          });

          // Delete from queue
          await this.deleteMessage(message);

          processed++;
          this.metrics.processed++;
        } catch (err) {
          this.metrics.failed++;
          console.error(`[Worker:${this.config.name}] Failed to process message ${message.messageId}:`, err);
          // Message will become visible again after visibility timeout
        } finally {
          this.inFlightCount--;
          if (this.inFlightCount === 0 && this.drainResolve) {
            this.drainResolve();
          }
        }
      }

      this.consecutiveFailures = 0; // Reset on success
      this.scheduleNext();
      return processed;
    } catch (err) {
      this.consecutiveFailures++;
      console.error(`[Worker:${this.config.name}] Poll cycle failed (consecutive: ${this.consecutiveFailures}):`, err);
      this.scheduleNext();
      return 0;
    }
  }

  // ── Private Methods ────────────────────────────────────────

  private parseMessage(message: SQSMessage): ParsedEvent | null {
    try {
      const body = JSON.parse(message.body);
      return {
        eventId: body['eventId'] ?? body['event_id'] ?? message.messageId,
        type: body['type'] ?? body['event_type'] ?? '',
        schemaVersion: Number(body['schemaVersion'] ?? body['schema_version'] ?? 1),
        scopeClass: body['scopeClass'] ?? body['scope_class'] ?? 'platform',
        workspaceId: body['workspaceId'] ?? body['workspace_id'] ?? null,
        actor: body['actor'] ?? { type: 'system', id: 'unknown' },
        correlationId: body['correlationId'] ?? body['correlation_id'] ?? message.messageId,
        causationId: body['causationId'] ?? body['causation_id'],
        occurredAt: new Date(body['occurredAt'] ?? body['occurred_at'] ?? Date.now()),
        payload: body['payload'] ?? body,
      };
    } catch {
      return null;
    }
  }

  private async processEvent(event: ParsedEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    if (handlers.length === 0) {
      // No handler for this event type — skip
      return;
    }

    for (const handler of handlers) {
      await handler.handle(event, this.db);
    }
  }

  private async deleteMessage(message: SQSMessage): Promise<void> {
    try {
      await this.sqs.deleteMessage({
        queueUrl: this.config.queueUrl,
        receiptHandle: message.receiptHandle,
      });
    } catch (err) {
      console.error(`[Worker:${this.config.name}] Failed to delete message:`, err);
    }
  }

  private scheduleNext(): void {
    if (this.running) {
      // Exponential backoff on consecutive failures: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, this.consecutiveFailures), 30_000);
      this.timer = setTimeout(() => this.poll(), delay);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createEventWorker(
  config: WorkerConfig,
  sqs: SQSClient,
  db: Database,
  handlers: EventHandler[],
): EventWorker {
  return new EventWorker(config, sqs, db, handlers);
}
