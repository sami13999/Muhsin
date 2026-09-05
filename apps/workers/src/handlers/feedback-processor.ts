/**
 * Feedback Processor Consumer
 *
 * Processes feedback report submissions:
 * - Updates report status based on priority
 * - Notifies admin if high priority
 * - Records metrics
 *
 * Events consumed:
 * - feedback.report_submitted
 * - feedback.report_resolved
 */
import type { EventHandler, ParsedEvent } from '../worker.js';

// ── Consumer ─────────────────────────────────────────────────

export function createFeedbackProcessorHandler(): EventHandler {
  return {
    eventTypes: [
      'feedback.report_submitted',
      'feedback.report_resolved',
    ],

    async handle(event: ParsedEvent): Promise<void> {
      const payload = event.payload as Record<string, unknown>;

      switch (event.type) {
        case 'feedback.report_submitted': {
          const priorityScore = payload['priorityScore'] as number ?? 0;
          const reportType = payload['reportType'] as string ?? 'unknown';

          // Log for monitoring
          console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'feedback-processor',
            message: `Feedback report submitted: ${reportType} with priority ${priorityScore}`,
            reportId: payload['reportId'],
            workspaceId: event.workspaceId,
            request_id: event.correlationId,
          }));

          // High priority items need immediate attention
          if (priorityScore >= 80) {
            console.log(JSON.stringify({
              ts: new Date().toISOString(),
              level: 'warn',
              service: 'feedback-processor',
              message: `URGENT: High-priority feedback requires immediate attention`,
              reportId: payload['reportId'],
              priorityScore,
              request_id: event.correlationId,
            }));
          }
          break;
        }

        case 'feedback.report_resolved': {
          const resolution = payload['resolution'] as string ?? '';
          const resolvedBy = payload['resolvedBy'] as string ?? '';

          console.log(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'info',
            service: 'feedback-processor',
            message: `Feedback report resolved by ${resolvedBy}`,
            reportId: payload['reportId'],
            resolution,
            request_id: event.correlationId,
          }));
          break;
        }
      }
    },
  };
}
