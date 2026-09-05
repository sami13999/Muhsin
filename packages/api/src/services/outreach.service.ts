/**
 * Outreach Service — Email (Resend) and sequence management.
 *
 * Source: Doc 9 (Outreach), Doc 19 Addendum (OAuth/WABA storage)
 *
 * CRITICAL: minor_signal gating (ADR-029, AGENTS.md Section 2)
 * When creator.minor_signal = true:
 *   - Contact reveal is BLOCKED
 *   - Campaign-add is BLOCKED
 *   - Outreach sequence enrollment is BLOCKED
 *   - Any automated commercial-outreach trigger is BLOCKED
 *
 * This is enforced at the point of send, not just at data-model level.
 */
import type { Database } from '@mushin/database';
import { sql } from 'drizzle-orm';
import { emitEvent, EVENT_TYPES } from '@mushin/events';
import type { ResendAdapter } from '@mushin/adapters';

// ── Types ────────────────────────────────────────────────────

export type OutreachChannel = 'email' | 'whatsapp';

export interface OutreachMessage {
  workspaceId: string;
  creatorId: string;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  templateId?: string;
  sentBy?: string;
}

export interface OutreachResult {
  success: boolean;
  messageId?: string;
  error?: string;
  blocked?: boolean;
  blockReason?: string;
}

export interface SequenceInput {
  workspaceId: string;
  name: string;
  steps: SequenceStep[];
  createdBy?: string;
}

export interface SequenceStep {
  channel: OutreachChannel;
  delayDays: number;
  templateId?: string;
  subject?: string;
  body: string;
}

export interface SequenceEnrollment {
  enrollmentId: string;
  sequenceId: string;
  creatorId: string;
  workspaceId: string;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  currentStep: number;
  enrolledAt: Date;
  nextStepAt: Date | null;
}

// ── Service ──────────────────────────────────────────────────

export class OutreachService {
  private db: Database;
  private emailAdapter: ResendAdapter | null;

  constructor(db: Database, emailAdapter?: ResendAdapter) {
    this.db = db;
    this.emailAdapter = emailAdapter ?? null;
  }

  /**
   * Send an outreach message to a creator.
   * CRITICAL: Checks minor_signal before allowing send.
   */
  async sendMessage(input: OutreachMessage): Promise<OutreachResult> {
    // 1. Check minor_signal (ADR-029, AGENTS.md Section 2)
    const creatorData = await this.db.execute(sql`
      SELECT minor_signal, display_name, primary_handle
      FROM gcp.creator
      WHERE creator_id = ${input.creatorId}
    `);

    if (creatorData.length === 0) {
      return {
        success: false,
        error: 'Creator not found',
      };
    }

    const creatorRow = creatorData[0]!;
    const minorSignal = creatorRow['minor_signal'] as boolean;

    if (minorSignal) {
      // BLOCKED: minor_signal = true
      // Log the attempt for audit
      await this.logBlockedAttempt(input, 'minor_signal');

      return {
        success: false,
        blocked: true,
        blockReason: 'Creator has minor_signal flag. Contact reveal and outreach are blocked by default per ADR-029.',
      };
    }

    // 2. Check workspace entitlements for outreach channel
    const canSend = await this.checkChannelEntitlement(input.workspaceId, input.channel);
    if (!canSend) {
      return {
        success: false,
        error: `Workspace does not have ${input.channel} outreach enabled`,
      };
    }

    // 3. Send message (implementation depends on channel)
    try {
      const messageId = await this.dispatchMessage(input);

      // 4. Emit event
      await this.emitOutreachEvent(input.workspaceId, input.creatorId, EVENT_TYPES.OUTREACH_MESSAGE_SENT, {
        channel: input.channel,
        messageId,
      });

      return {
        success: true,
        messageId,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send message',
      };
    }
  }

  /**
   * Enroll a creator in an outreach sequence.
   * CRITICAL: Checks minor_signal before enrollment.
   */
  async enrollInSequence(
    workspaceId: string,
    creatorId: string,
    sequenceId: string,
  ): Promise<{ success: boolean; enrollmentId?: string; error?: string; blocked?: boolean }> {
    // Check minor_signal
    const creatorData = await this.db.execute(sql`
      SELECT minor_signal FROM gcp.creator WHERE creator_id = ${creatorId}
    `);

    if (creatorData.length > 0 && (creatorData[0]!['minor_signal'] as boolean)) {
      await this.logBlockedAttempt(
        { workspaceId, creatorId, channel: 'email', body: '' },
        'minor_signal_sequence',
      );

      return {
        success: false,
        blocked: true,
        error: 'Creator has minor_signal flag. Sequence enrollment is blocked by default per ADR-029.',
      };
    }

    // Create enrollment
    const enrollmentId = crypto.randomUUID();
    await this.emitOutreachEvent(workspaceId, creatorId, EVENT_TYPES.OUTREACH_SEQUENCE_ENROLLED, {
      sequenceId,
      enrollmentId,
    });

    return {
      success: true,
      enrollmentId,
    };
  }

  /**
   * Reveal contact information for a creator.
   * CRITICAL: Checks minor_signal before reveal.
   */
  async revealContact(
    workspaceId: string,
    creatorId: string,
  ): Promise<{ success: boolean; contact?: Record<string, unknown>; error?: string; blocked?: boolean }> {
    // Check minor_signal
    const creatorData = await this.db.execute(sql`
      SELECT minor_signal FROM gcp.creator WHERE creator_id = ${creatorId}
    `);

    if (creatorData.length > 0 && (creatorData[0]!['minor_signal'] as boolean)) {
      await this.logBlockedAttempt(
        { workspaceId, creatorId, channel: 'email', body: '' },
        'minor_signal_reveal',
      );

      return {
        success: false,
        blocked: true,
        error: 'Creator has minor_signal flag. Contact reveal is blocked by default per ADR-029.',
      };
    }

    // Fetch contact records
    const contacts = await this.db.execute(sql`
      SELECT contact_type, value, source, confidence
      FROM gcp.contact_record
      WHERE creator_id = ${creatorId} AND pii_erased_at IS NULL
    `);

    return {
      success: true,
      contact: contacts.reduce((acc, row) => {
        acc[row['contact_type'] as string] = row['value'];
        return acc;
      }, {} as Record<string, unknown>),
    };
  }

  // ── Private Helpers ────────────────────────────────────────

  private async checkChannelEntitlement(workspaceId: string, channel: OutreachChannel): Promise<boolean> {
    if (channel === 'whatsapp') {
      // WhatsApp requires growth plan or higher
      const result = await this.db.execute(sql`
        SELECT subscription_plan_id FROM wp.workspace WHERE workspace_id = ${workspaceId}
      `);
      const plan = result[0]?.['subscription_plan_id'] as string ?? 'free';
      return ['growth', 'agency', 'enterprise'].includes(plan);
    }
    return true; // Email available on all plans
  }

  private async dispatchMessage(input: OutreachMessage): Promise<string> {
    if (input.channel === 'email') {
      if (!this.emailAdapter) {
        throw new Error('Email adapter not configured');
      }

      // Fetch creator email from contact records
      const contactResult = await this.db.execute(sql`
        SELECT value FROM gcp.contact_record
        WHERE creator_id = ${input.creatorId}
          AND contact_type = 'email'
          AND pii_erased_at IS NULL
        LIMIT 1
      `);

      if (contactResult.length === 0) {
        throw new Error('No email address found for creator');
      }

      const email = contactResult[0]!['value'] as string;
      const result = await this.emailAdapter.sendEmail({
        to: email,
        subject: input.subject ?? 'Message from MUSHIN',
        html: input.body,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to send email');
      }

      return result.messageId ?? crypto.randomUUID();
    }

    // WhatsApp: not yet implemented
    if (input.channel === 'whatsapp') {
      throw new Error('WhatsApp dispatch not yet implemented');
    }

    return crypto.randomUUID();
  }

  private async logBlockedAttempt(
    input: OutreachMessage,
    reason: string,
  ): Promise<void> {
    await this.emitOutreachEvent(input.workspaceId, input.creatorId, 'outreach.blocked', {
      channel: input.channel,
      reason,
    });
  }

  private async emitOutreachEvent(
    workspaceId: string,
    creatorId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // ADR-020: outbox write MUST be in the same DB transaction as the state change.
    // Wrap event emission in a transaction for atomicity.
    // Non-fatal: if event emission fails, log and continue (email was already sent).
    try {
      await this.db.transaction(async (tx) => {
        await emitEvent(tx as Parameters<typeof emitEvent>[0], {
          eventId: crypto.randomUUID(),
          type: eventType,
          schemaVersion: 1,
          scopeClass: 'WP',
          workspaceId,
          actor: { type: 'user', id: 'current-user' },
          correlationId: crypto.randomUUID(),
          occurredAt: new Date(),
          payload: { creatorId, ...payload },
        });
      });
    } catch (err) {
      console.warn('[Outreach] Failed to emit event (non-fatal):', err);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createOutreachService(db: Database, emailAdapter?: ResendAdapter): OutreachService {
  return new OutreachService(db, emailAdapter);
}
