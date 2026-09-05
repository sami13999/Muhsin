/**
 * Timeline Writer Consumer
 *
 * Consumes events that should be recorded in the interaction timeline.
 * Appends events to wp.interaction_timeline (append-only, immutable).
 *
 * Events consumed:
 * - All *.timeline_entry events
 * - list.created, list.membership_changed
 * - outreach.message_sent, outreach.message_delivered, outreach.reply_received
 * - billing.subscription_state_changed
 * - feedback.report_submitted, feedback.report_resolved
 */
import type { Database } from '@mushin/database';
import type { EventHandler, ParsedEvent } from '../worker.js';

// ── Timeline Event Types ─────────────────────────────────────

const TIMELINE_EVENT_TYPES = new Set([
  // Feedback
  'feedback.report_submitted',
  'feedback.report_resolved',
  'feedback.timeline_entry',

  // List
  'list.created',
  'list.archived',
  'list.membership_changed',
  'list.note_added',
  'list.exported',

  // Outreach
  'outreach.message_sent',
  'outreach.message_delivered',
  'outreach.message_failed',
  'outreach.reply_received',
  'outreach.opened',
  'outreach.optout_recorded',
  'outreach.sequence_enrolled',
  'outreach.sequence_step_executed',
  'outreach.sequence_stopped',
  'outreach.blocked',

  // Billing
  'billing.subscription_state_changed',
  'billing.plan_changed',

  // Credit
  'credit.granted',
  'credit.reserved',
  'credit.committed',
  'credit.released',
  'credit.reversed',

  // Reveal
  'reveal.contact_revealed',

  // Creator
  'creator.discovered',
  'creator.enriched',
  'creator.scored',
  'creator.merge_resolved',
]);

// ── Consumer ─────────────────────────────────────────────────

export function createTimelineWriterHandler(db: Database): EventHandler {
  return {
    eventTypes: Array.from(TIMELINE_EVENT_TYPES),

    async handle(event: ParsedEvent, db: Database): Promise<void> {
      const workspaceId = event.workspaceId;
      if (!workspaceId) {
        // GCP-scope events without workspace_id skip timeline
        return;
      }

      // Determine actor type and ID from event
      const actorType = event.actor?.type ?? 'system';
      const actorId = event.actor?.id ?? 'system';

      // Determine channel from event type
      const channel = determineChannel(event.type);

      // Insert into interaction_timeline
      await db.execute(`
        INSERT INTO wp.interaction_timeline (
          workspace_id,
          workspace_creator_link_id,
          event_type,
          actor_type,
          actor_id,
          channel,
          payload,
          source_event_id
        ) VALUES (
          ${workspaceId},
          ${extractCreatorLinkId(event)},
          ${event.type},
          ${actorType},
          ${actorId},
          ${channel},
          ${JSON.stringify(event.payload)},
          ${event.eventId}
        )
      `);
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────

function determineChannel(eventType: string): string | null {
  if (eventType.startsWith('outreach.message_') || eventType === 'outreach.reply_received') {
    return 'email';
  }
  if (eventType === 'outreach.sequence_enrolled' || eventType === 'outreach.sequence_step_executed') {
    return 'email';
  }
  return null;
}

function extractCreatorLinkId(event: ParsedEvent): string | null {
  const payload = event.payload as Record<string, unknown>;
  return (payload['workspaceCreatorLinkId'] as string) ??
         (payload['creator_id'] as string) ??
         null;
}
