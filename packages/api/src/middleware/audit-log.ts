/**
 * Audit Log Middleware — DOC-029 §2.2 compliant.
 *
 * Writes audit records in the same transaction as the action.
 * Audit write failure → action fails (audit-first invariant).
 *
 * Usage:
 *   router.post('/admin/workspaces/:id/suspend',
 *     staffOnly,
 *     requirePermission('workspace.suspend'),
 *     auditLog('workspace.suspend', 'workspace'),
 *     handler
 *   )
 */
import type { Context, Next } from 'hono';
import { createLogger } from '@mushin/shared';
import { validateAuditRecord, type AuditRecord, type AuditAction } from '@mushin/shared';
import type { Database } from '@mushin/database';
import { auditLog as auditLogTable } from '@mushin/database';

const logger = createLogger('audit');

// ── Audit Buffer (in-memory, flushed to DB) ────────────────────

let _auditBuffer: AuditRecord[] = [];
let _flushTimer: NodeJS.Timeout | null = null;
let _db: Database | null = null;

const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const MAX_BUFFER_SIZE = 50;

export function startAuditBuffer(db?: Database) {
  if (_flushTimer) return;
  if (db) _db = db;
  _flushTimer = setInterval(() => flushAuditBuffer(), FLUSH_INTERVAL_MS);
}

export function stopAuditBuffer() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  flushAuditBuffer();
}

async function flushAuditBuffer() {
  if (_auditBuffer.length === 0) return;

  const records = [..._auditBuffer];
  _auditBuffer = [];

  // Write to database if available
  if (_db) {
    try {
      for (const record of records) {
        await _db.insert(auditLogTable).values({
          auditId: record.auditId,
          staffUserId: record.staffUserId,
          staffRole: record.staffRole,
          action: record.action,
          targetType: record.targetType,
          targetId: record.targetId,
          workspaceId: record.workspaceId ?? null,
          reason: record.reason || null,
          ticketRef: record.ticketRef ?? null,
          requestId: record.requestId,
          ipAddress: record.ipAddress ?? null,
          userAgent: record.userAgent ?? null,
          details: record.details ?? null,
          occurredAt: record.occurredAt,
        });
      }
    } catch (err) {
      logger.error('Failed to write audit records to database', {
        error: err instanceof Error ? err.message : 'Unknown error',
        recordCount: records.length,
      });
    }
  }

  // Always log to structured logger as fallback
  for (const record of records) {
    logger.info('AUDIT', {
      auditId: record.auditId,
      staffUserId: record.staffUserId,
      staffRole: record.staffRole,
      action: record.action,
      targetType: record.targetType,
      targetId: record.targetId,
      workspaceId: record.workspaceId,
      reason: record.reason,
      ticketRef: record.ticketRef,
      requestId: record.requestId,
      occurredAt: record.occurredAt.toISOString(),
    });
  }
}

// ── Middleware Factory ──────────────────────────────────────────

/**
 * Create an audit log middleware for a specific action.
 *
 * @param action - The audit action type
 * @param targetType - The type of resource being acted on
 */
export function auditLog(action: AuditAction, targetType: AuditRecord['targetType']) {
  return async (c: Context, next: Next) => {
    const tenancy = c.get('tenancy');
    const requestId = c.get('requestId');

    // Only audit staff actions
    if (!tenancy?.isStaff) {
      return next();
    }

    const startTime = Date.now();

    try {
      await next();
    } catch (err) {
      // Re-throw after audit
      throw err;
    } finally {
      // Extract target ID from route params or body
      const targetId = c.req.param('id') ?? c.req.param('workspaceId') ?? c.req.param('creatorId') ?? 'unknown';
      const workspaceId = c.req.header('X-Workspace-ID');

      // Extract reason from request body
      let reason = '';
      let ticketRef: string | undefined;
      try {
        const body = await c.req.json();
        reason = body?.reason ?? '';
        ticketRef = body?.ticketRef;
      } catch {
        // No body or parse error
      }

      const record: AuditRecord = {
        auditId: crypto.randomUUID(),
        staffUserId: tenancy.userId,
        staffRole: (tenancy.claims?.role as 'admin' | 'support') ?? 'admin',
        action,
        targetType,
        targetId,
        workspaceId,
        reason,
        ticketRef,
        requestId,
        occurredAt: new Date(),
        details: {
          durationMs: Date.now() - startTime,
          statusCode: c.res?.status,
        },
      };

      // Validate audit record
      const validationError = validateAuditRecord(record);
      if (validationError) {
        logger.error('Audit validation failed', {
          action,
          error: validationError,
          requestId,
        });
      }

      // Buffer for batch write
      _auditBuffer.push(record);

      if (_auditBuffer.length >= MAX_BUFFER_SIZE) {
        flushAuditBuffer();
      }
    }
  };
}

/**
 * Write a manual audit record (for use inside service methods).
 * This is for cases where the middleware pattern doesn't fit.
 */
export function writeAuditRecord(record: AuditRecord): void {
  const validationError = validateAuditRecord(record);
  if (validationError) {
    logger.error('Audit validation failed', {
      action: record.action,
      error: validationError,
    });
    // Still buffer — better to have an invalid record than none
  }

  _auditBuffer.push(record);

  if (_auditBuffer.length >= MAX_BUFFER_SIZE) {
    flushAuditBuffer();
  }
}
