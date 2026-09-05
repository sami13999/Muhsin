/**
 * Feedback & Product Intelligence Service — DOC-030.
 *
 * Handles:
 * - Bug reports, feature requests, general feedback
 * - Incorrect creator data reports
 * - Fraud false-positive reports
 * - Support ticket creation
 * - Timeline events
 * - Analytics events
 * - Automatic prioritization scoring
 * - Admin review queues
 *
 * Every report generates:
 * - Support ticket
 * - Analytics event
 * - Timeline event
 * - Priority score
 */
import type { Database } from '@mushin/database';
import { sql } from 'drizzle-orm';
import { emitEvent, EVENT_TYPES } from '@mushin/events';

// ── Types ────────────────────────────────────────────────────

export type ReportType =
  | 'bug_report'
  | 'feature_request'
  | 'general_feedback'
  | 'incorrect_creator_data'
  | 'fraud_false_positive';

export type TicketType =
  | 'feedback'
  | 'bug'
  | 'feature_request'
  | 'data_correction'
  | 'fraud_report'
  | 'account_issue';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface SubmitReportInput {
  workspaceId: string;
  userId: string;
  reportType: ReportType;
  title: string;
  description: string;
  creatorId?: string;
  pageUrl?: string;
  attachmentUrl?: string;
}

export interface ReportResult {
  reportId: string;
  ticketId: string;
  priorityScore: number;
  priority: Priority;
}

export interface ReviewQueueItem {
  queueId: string;
  itemType: string;
  itemId: string;
  reason: string;
  priorityScore: number;
  status: string;
  createdAt: Date;
}

// ── Priority Scoring ─────────────────────────────────────────

const REPORT_TYPE_WEIGHTS: Record<ReportType, number> = {
  fraud_false_positive: 90,    // Highest — potential revenue impact
  incorrect_creator_data: 80,  // Data quality critical
  bug_report: 70,              // Broken functionality
  feature_request: 40,         // Enhancement
  general_feedback: 30,        // Lowest priority
};

function calculatePriority(input: SubmitReportInput): { score: number; priority: Priority } {
  let score = REPORT_TYPE_WEIGHTS[input.reportType] ?? 50;

  // Boost if creator-related (data quality impact)
  if (input.creatorId) {
    score = Math.min(100, score + 10);
  }

  // Boost if page URL provided (reproducibility)
  if (input.pageUrl) {
    score = Math.min(100, score + 5);
  }

  // Boost if attachment provided (evidence)
  if (input.attachmentUrl) {
    score = Math.min(100, score + 5);
  }

  const priority: Priority =
    score >= 80 ? 'urgent' :
    score >= 60 ? 'high' :
    score >= 40 ? 'medium' : 'low';

  return { score, priority };
}

// ── Service ──────────────────────────────────────────────────

export class FeedbackService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Submit a feedback report.
   * Creates: report, support ticket, priority score, events.
   */
  async submitReport(input: SubmitReportInput): Promise<ReportResult> {
    // 1. Calculate priority
    const { score, priority } = calculatePriority(input);

    // 2. Create feedback report
    const reportRows = await this.db.execute(sql`
      INSERT INTO wp.feedback_report (
        workspace_id, user_id, report_type, title, description,
        creator_id, page_url, attachment_url, priority_score
      ) VALUES (
        ${input.workspaceId}, ${input.userId}, ${input.reportType},
        ${input.title}, ${input.description},
        ${input.creatorId ?? null}, ${input.pageUrl ?? null}, ${input.attachmentUrl ?? null},
        ${score}
      )
      RETURNING report_id
    `);
    const reportId = reportRows[0]!['report_id'] as string;

    // 3. Create support ticket
    const ticketType = mapReportToTicketType(input.reportType);
    const ticketRows = await this.db.execute(sql`
      INSERT INTO wp.support_ticket (
        workspace_id, report_id, user_id, ticket_type, subject, description, priority
      ) VALUES (
        ${input.workspaceId}, ${reportId}, ${input.userId},
        ${ticketType}, ${input.title}, ${input.description}, ${priority}
      )
      RETURNING ticket_id
    `);
    const ticketId = ticketRows[0]!['ticket_id'] as string;

    // 4. Emit analytics event
    await this.emitEvent(input.workspaceId, 'feedback.report_submitted', {
      reportId,
      ticketId,
      reportType: input.reportType,
      priorityScore: score,
      priority,
    });

    // 5. Emit timeline event
    await this.emitEvent(input.workspaceId, 'feedback.timeline_entry', {
      reportId,
      userId: input.userId,
      action: 'submitted',
      reportType: input.reportType,
    });

    // 6. If high priority, add to admin review queue
    if (score >= 70) {
      await this.db.execute(sql`
        INSERT INTO wp.admin_review_queue (
          workspace_id, item_type, item_id, reason, priority_score
        ) VALUES (
          ${input.workspaceId}, 'feedback', ${reportId},
          ${`Auto-queued: ${input.reportType} with priority score ${score}`},
          ${score}
        )
      `);
    }

    return { reportId, ticketId, priorityScore: score, priority };
  }

  /**
   * Get reports for a workspace.
   */
  async getReports(
    workspaceId: string,
    options?: { status?: string; type?: string; limit?: number },
  ): Promise<Array<{
    reportId: string;
    reportType: string;
    title: string;
    description: string;
    priorityScore: number;
    status: string;
    createdAt: Date;
  }>> {
    const limit = options?.limit ?? 50;

    let query = sql`
      SELECT report_id, report_type, title, description, priority_score, status, created_at
      FROM wp.feedback_report
      WHERE workspace_id = ${workspaceId}
    `;

    if (options?.status) {
      query = sql`${query} AND status = ${options.status}`;
    }
    if (options?.type) {
      query = sql`${query} AND report_type = ${options.type}`;
    }

    query = sql`${query} ORDER BY priority_score DESC, created_at DESC LIMIT ${limit}`;

    const results = await this.db.execute(query);

    return results.map((row) => ({
      reportId: row['report_id'] as string,
      reportType: row['report_type'] as string,
      title: row['title'] as string,
      description: row['description'] as string,
      priorityScore: row['priority_score'] as number,
      status: row['status'] as string,
      createdAt: new Date(row['created_at'] as string),
    }));
  }

  /**
   * Get admin review queue.
   */
  async getReviewQueue(
    workspaceId: string,
    limit: number = 20,
  ): Promise<ReviewQueueItem[]> {
    const results = await this.db.execute(sql`
      SELECT queue_id, item_type, item_id, reason, priority_score, status, created_at
      FROM wp.admin_review_queue
      WHERE workspace_id = ${workspaceId} AND status = 'pending'
      ORDER BY priority_score DESC, created_at ASC
      LIMIT ${limit}
    `);

    return results.map((row) => ({
      queueId: row['queue_id'] as string,
      itemType: row['item_type'] as string,
      itemId: row['item_id'] as string,
      reason: row['reason'] as string,
      priorityScore: row['priority_score'] as number,
      status: row['status'] as string,
      createdAt: new Date(row['created_at'] as string),
    }));
  }

  /**
   * Resolve a report.
   */
  async resolveReport(
    reportId: string,
    resolution: string,
    resolvedBy: string,
  ): Promise<void> {
    // Look up workspace ID for event emission
    const reportResult = await this.db.execute(sql`
      SELECT workspace_id FROM wp.feedback_report WHERE report_id = ${reportId}
    `);
    const workspaceId = reportResult[0]?.['workspace_id'] as string ?? '';

    await this.db.execute(sql`
      UPDATE wp.feedback_report
      SET status = 'resolved', resolution_notes = ${resolution},
          resolved_by = ${resolvedBy}, resolved_at = NOW(), updated_at = NOW()
      WHERE report_id = ${reportId}
    `);

    // Emit resolution event
    await this.emitEvent(workspaceId, 'feedback.report_resolved', {
      reportId,
      resolution,
      resolvedBy,
    });
  }

  // ── Private Helpers ────────────────────────────────────────

  private async emitEvent(
    workspaceId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await emitEvent(this.db as Parameters<typeof emitEvent>[0], {
        eventId: crypto.randomUUID(),
        type: eventType,
        schemaVersion: 1,
        scopeClass: 'WP',
        workspaceId,
        actor: { type: 'user', id: 'current-user' },
        correlationId: crypto.randomUUID(),
        occurredAt: new Date(),
        payload,
      });
    } catch (err) {
      console.warn('[Feedback] Failed to emit event:', err);
    }
  }
}

function mapReportToTicketType(reportType: ReportType): TicketType {
  switch (reportType) {
    case 'bug_report': return 'bug';
    case 'feature_request': return 'feature_request';
    case 'general_feedback': return 'feedback';
    case 'incorrect_creator_data': return 'data_correction';
    case 'fraud_false_positive': return 'fraud_report';
    default: return 'feedback';
  }
}

// ── Factory ──────────────────────────────────────────────────

export function createFeedbackService(db: Database): FeedbackService {
  return new FeedbackService(db);
}
