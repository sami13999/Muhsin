/**
 * Outbox Relay — ADR-020 compliant transactional outbox pattern.
 *
 * Reads unpublished events from platform.outbox using FOR UPDATE SKIP LOCKED,
 * publishes to SQS, and marks as dispatched.
 *
 * This is the ONLY code that reads from the outbox and publishes to queues.
 * API handlers write to outbox within their DB transaction; this relay
 * handles the async delivery.
 */
import type { Database } from '@mushin/database';
import { sql } from 'drizzle-orm';

// ── Types ────────────────────────────────────────────────────

export interface OutboxEvent {
  outboxId: string;
  eventId: string;
  eventType: string;
  schemaVersion: string;
  scopeClass: string;
  workspaceId: string | null;
  actorType: string | null;
  actorId: string | null;
  correlationId: string | null;
  causationId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface RelayConfig {
  /** Number of events to process per batch */
  batchSize: number;
  /** Maximum dispatch attempts before moving to DLQ */
  maxAttempts: number;
  /** Polling interval in milliseconds */
  pollIntervalMs: number;
}

export interface QueuePublisher {
  /** Publish event to the appropriate SQS queue */
  publish(event: OutboxEvent): Promise<void>;
}

export interface RelayMetrics {
  processed: number;
  failed: number;
  skipped: number;
  lastPollAt: Date | null;
  isRunning: boolean;
}

// ── Default Config ───────────────────────────────────────────

const DEFAULT_CONFIG: RelayConfig = {
  batchSize: 50,
  maxAttempts: 3,
  pollIntervalMs: 1000,
};

// ── Outbox Relay ─────────────────────────────────────────────

export class OutboxRelay {
  private db: Database;
  private publisher: QueuePublisher;
  private config: RelayConfig;
  private metrics: RelayMetrics;
  private running: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(db: Database, publisher: QueuePublisher, config?: Partial<RelayConfig>) {
    this.db = db;
    this.publisher = publisher;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      processed: 0,
      failed: 0,
      skipped: 0,
      lastPollAt: null,
      isRunning: false,
    };
  }

  /**
   * Start the relay polling loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.metrics.isRunning = true;
    this.poll();
  }

  /**
   * Stop the relay polling loop.
   */
  stop(): void {
    this.running = false;
    this.metrics.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Get current relay metrics.
   */
  getMetrics(): RelayMetrics {
    return { ...this.metrics };
  }

  /**
   * Single poll cycle — fetch and process a batch of events.
   * Can be called directly for testing or manual triggering.
   */
  async poll(): Promise<number> {
    this.metrics.lastPollAt = new Date();

    try {
      // Fetch unpublished events using FOR UPDATE SKIP LOCKED
      const events = await this.fetchUnpublishedEvents();

      if (events.length === 0) {
        this.scheduleNext();
        return 0;
      }

      let processed = 0;

      for (const event of events) {
        try {
          // Publish to SQS
          await this.publisher.publish(event);

          // Mark as dispatched
          await this.markDispatched(event.outboxId);
          processed++;
          this.metrics.processed++;
        } catch (err) {
          // Increment attempt count
          await this.incrementAttempts(event.outboxId);
          this.metrics.failed++;

          // Log error but continue with other events
          console.error(`[OutboxRelay] Failed to dispatch event ${event.eventId}:`, err);
        }
      }

      this.scheduleNext();
      return processed;
    } catch (err) {
      console.error('[OutboxRelay] Poll cycle failed:', err);
      this.scheduleNext();
      return 0;
    }
  }

  // ── Private Methods ────────────────────────────────────────

  /**
   * Fetch unpublished events using FOR UPDATE SKIP LOCKED.
   * This ensures:
   * 1. Each event is processed exactly once across multiple relay instances
   * 2. Locked rows are skipped (no blocking)
   * 3. Failed events can be retried up to maxAttempts
   */
  private async fetchUnpublishedEvents(): Promise<OutboxEvent[]> {
    const results = await this.db.execute(sql`
      SELECT
        outbox_id,
        event_id,
        event_type,
        schema_version,
        scope_class,
        workspace_id,
        actor_type,
        actor_id,
        correlation_id,
        causation_id,
        payload,
        occurred_at
      FROM platform.outbox
      WHERE dispatched_at IS NULL
        AND dispatch_attempts < ${this.config.maxAttempts}
      ORDER BY created_at ASC
      LIMIT ${this.config.batchSize}
      FOR UPDATE SKIP LOCKED
    `);

    return results.map((row: Record<string, unknown>) => ({
      outboxId: row['outbox_id'] as string,
      eventId: row['event_id'] as string,
      eventType: row['event_type'] as string,
      schemaVersion: row['schema_version'] as string,
      scopeClass: row['scope_class'] as string,
      workspaceId: row['workspace_id'] as string | null,
      actorType: row['actor_type'] as string | null,
      actorId: row['actor_id'] as string | null,
      correlationId: row['correlation_id'] as string | null,
      causationId: row['causation_id'] as string | null,
      payload: row['payload'] as Record<string, unknown>,
      occurredAt: new Date(row['occurred_at'] as string),
    }));
  }

  /**
   * Mark an event as dispatched.
   */
  private async markDispatched(outboxId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE platform.outbox
      SET dispatched_at = NOW()
      WHERE outbox_id = ${outboxId}
    `);
  }

  /**
   * Increment dispatch attempt count.
   */
  private async incrementAttempts(outboxId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE platform.outbox
      SET dispatch_attempts = dispatch_attempts + 1
      WHERE outbox_id = ${outboxId}
    `);
  }

  /**
   * Schedule the next poll cycle.
   */
  private scheduleNext(): void {
    if (this.running) {
      this.timer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createOutboxRelay(
  db: Database,
  publisher: QueuePublisher,
  config?: Partial<RelayConfig>,
): OutboxRelay {
  return new OutboxRelay(db, publisher, config);
}
