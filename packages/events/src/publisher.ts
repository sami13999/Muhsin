/**
 * SQS Publisher — Concrete implementation of QueuePublisher interface.
 *
 * Uses AWS SDK v3 to publish events to SQS queues.
 * Configured via environment variables:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - SQS_OUTBOX_QUEUE_URL
 */
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { QueuePublisher, OutboxEvent } from '@mushin/events';

// ── Queue Routing ────────────────────────────────────────────

const EVENT_QUEUE_MAP: Record<string, string> = {
  // Interactive (user-waiting, highest priority)
  'discovery.job_queued': 'q-discovery-high',
  'discovery.job_completed': 'q-discovery-high',
  'discovery.job_failed': 'q-discovery-high',

  // Discovery bulk (live search fan-out)
  'discovery.stage_completed': 'q-discovery-standard',
  'creator.discovered': 'q-discovery-standard',
  'creator.enriched': 'q-discovery-standard',

  // Scheduled (re-scoring)
  'creator.scored': 'q-rescore-low',
  'creator.refresh_completed': 'q-rescore-low',

  // Events (outbox relay)
  'workspace.created': 'q-outbox-relay',
  'workspace.member_invited': 'q-outbox-relay',
  'workspace.member_joined': 'q-outbox-relay',
  'workspace.member_removed': 'q-outbox-relay',
  'workspace.settings_changed': 'q-outbox-relay',
  'list.created': 'q-outbox-relay',
  'list.archived': 'q-outbox-relay',
  'list.membership_changed': 'q-outbox-relay',
  'list.note_added': 'q-outbox-relay',
  'list.exported': 'q-outbox-relay',
  'campaign.created': 'q-outbox-relay',
  'campaign.archived': 'q-outbox-relay',
  'campaign.stage_changed': 'q-outbox-relay',
  'campaign.task_completed': 'q-outbox-relay',
  'campaign.rate_recorded': 'q-outbox-relay',
  'campaign.outcome_recorded': 'q-outbox-relay',
  'campaign.budget_threshold_crossed': 'q-outbox-relay',
  'outreach.message_sent': 'q-outbox-relay',
  'outreach.message_delivered': 'q-outbox-relay',
  'outreach.message_failed': 'q-outbox-relay',
  'outreach.reply_received': 'q-outbox-relay',
  'outreach.opened': 'q-outbox-relay',
  'outreach.optout_recorded': 'q-outbox-relay',
  'outreach.sequence_enrolled': 'q-outbox-relay',
  'outreach.sequence_step_executed': 'q-outbox-relay',
  'outreach.sequence_stopped': 'q-outbox-relay',
  'outreach.mailbox_revoked': 'q-outbox-relay',
  'outreach.whatsapp_quality_changed': 'q-outbox-relay',
  'billing.webhook_received': 'q-outbox-relay',
  'billing.subscription_state_changed': 'q-outbox-relay',
  'billing.plan_changed': 'q-outbox-relay',
  'billing.reconciliation_healed': 'q-outbox-relay',
  'credit.granted': 'q-outbox-relay',
  'credit.reserved': 'q-outbox-relay',
  'credit.committed': 'q-outbox-relay',
  'credit.released': 'q-outbox-relay',
  'credit.reversed': 'q-outbox-relay',
  'credit.balance_threshold_crossed': 'q-outbox-relay',
  'reveal.contact_revealed': 'q-outbox-relay',
  'feedback.report_submitted': 'q-outbox-relay',
  'feedback.report_resolved': 'q-outbox-relay',
  'feedback.timeline_entry': 'q-outbox-relay',
};

const DEFAULT_QUEUE = 'q-outbox-relay';

// ── Publisher ────────────────────────────────────────────────

export class SQSPublisher implements QueuePublisher {
  private client: SQSClient;
  private queueUrls: Map<string, string>;

  constructor(config: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    queueUrls: Record<string, string>;
  }) {
    this.client = new SQSClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.queueUrls = new Map(Object.entries(config.queueUrls));
  }

  /**
   * Publish an event to the appropriate SQS queue.
   * Routes based on event type using EVENT_QUEUE_MAP.
   */
  async publish(event: OutboxEvent): Promise<void> {
    const queueName = EVENT_QUEUE_MAP[event.eventType] ?? DEFAULT_QUEUE;
    const queueUrl = this.queueUrls.get(queueName);

    if (!queueUrl) {
      // Fallback to outbox relay queue if specific queue not configured
      const fallbackUrl = this.queueUrls.get('q-outbox-relay');
      if (!fallbackUrl) {
        throw new Error(`No queue URL configured for ${queueName}`);
      }
      await this.sendToQueue(fallbackUrl, event);
      return;
    }

    await this.sendToQueue(queueUrl, event);
  }

  private async sendToQueue(queueUrl: string, event: OutboxEvent): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({
        eventId: event.eventId,
        eventType: event.eventType,
        schemaVersion: event.schemaVersion,
        scopeClass: event.scopeClass,
        workspaceId: event.workspaceId,
        actorType: event.actorType,
        actorId: event.actorId,
        correlationId: event.correlationId,
        causationId: event.causationId,
        payload: event.payload,
        occurredAt: event.occurredAt,
      }),
      // Use event type as message group ID for FIFO ordering
      MessageGroupId: event.eventType,
      // Deduplication based on event ID
      MessageDeduplicationId: event.eventId,
    });

    await this.client.send(command);
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createSQSPublisher(config: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  queueUrls: Record<string, string>;
}): SQSPublisher {
  return new SQSPublisher(config);
}

// ── In-Memory Publisher (for testing) ────────────────────────

export class InMemoryPublisher implements QueuePublisher {
  private events: OutboxEvent[] = [];

  async publish(event: OutboxEvent): Promise<void> {
    this.events.push(event);
  }

  getEvents(): OutboxEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
