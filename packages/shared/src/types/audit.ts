/**
 * Audit Log Types — DOC-029 §2.2 compliant.
 *
 * Every staff action must have an audit record written in the same
 * transaction as the action itself. If the audit write fails, the action fails.
 *
 * Immutable, append-only. Corrections are new records, not mutations.
 */

// ── Audit Event Types ──────────────────────────────────────────

export type AuditAction =
  // Workspace actions
  | 'workspace.suspend'
  | 'workspace.reinstate'
  | 'workspace.view'
  // Creator actions
  | 'creator.admin_view'
  | 'creator.merge'
  | 'creator.unmerge'
  | 'creator.erasure_trigger'
  | 'creator.contested_removal_review'
  // Feature flag actions
  | 'feature_flag.create'
  | 'feature_flag.toggle'
  | 'feature_flag.deprecate'
  // Queue/ops actions
  | 'queue.dlq_inspect'
  | 'queue.dlq_redrive'
  | 'queue.worker_status'
  // Ledger actions
  | 'ledger.correction'
  | 'ledger.refund'
  // Impersonation
  | 'impersonation.start'
  | 'impersonation.end'
  // Support actions
  | 'support.ticket_view'
  | 'support.workspace_inspect'
  | 'support.audit_view'
  // Staff management actions
  | 'staff.create'
  | 'staff.promote'
  | 'staff.demote'
  | 'staff.revoke';

// ── Audit Record ───────────────────────────────────────────────

export interface AuditRecord {
  /** Unique audit record ID */
  auditId: string;
  /** Staff user ID */
  staffUserId: string;
  /** Staff role at time of action */
  staffRole: 'admin' | 'support';
  /** Action performed */
  action: AuditAction;
  /** Target resource type */
  targetType: 'workspace' | 'creator' | 'feature_flag' | 'queue' | 'ledger' | 'impersonation' | 'support' | 'staff';
  /** Target resource ID */
  targetId: string;
  /** Workspace ID if action is workspace-scoped */
  workspaceId?: string;
  /** Required reason (min 10 chars) for mutating actions */
  reason: string;
  /** Optional support ticket reference */
  ticketRef?: string;
  /** Request ID for correlation */
  requestId: string;
  /** When the action occurred */
  occurredAt: Date;
  /** IP address of the staff user */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Additional context (before/after values for mutations) */
  details?: Record<string, unknown>;
}

// ── Audit Validation ───────────────────────────────────────────

export const AUDIT_REASON_MIN_LENGTH = 10;

/**
 * Validate audit record before writing.
 * Returns null if valid, error message if invalid.
 */
export function validateAuditRecord(record: Partial<AuditRecord>): string | null {
  if (!record.auditId) return 'auditId is required';
  if (!record.staffUserId) return 'staffUserId is required';
  if (!record.staffRole) return 'staffRole is required';
  if (!record.action) return 'action is required';
  if (!record.targetType) return 'targetType is required';
  if (!record.targetId) return 'targetId is required';
  if (!record.requestId) return 'requestId is required';
  if (!record.occurredAt) return 'occurredAt is required';

  // Reason is required for mutating actions
  const mutatingActions = [
    'workspace.suspend', 'workspace.reinstate',
    'creator.merge', 'creator.unmerge', 'creator.erasure_trigger', 'creator.contested_removal_review',
    'feature_flag.create', 'feature_flag.toggle', 'feature_flag.deprecate',
    'queue.dlq_redrive',
    'ledger.correction', 'ledger.refund',
    'impersonation.start',
  ];

  if (mutatingActions.includes(record.action)) {
    if (!record.reason || record.reason.length < AUDIT_REASON_MIN_LENGTH) {
      return `Reason required (min ${AUDIT_REASON_MIN_LENGTH} chars) for mutating action: ${record.action}`;
    }
  }

  return null;
}
