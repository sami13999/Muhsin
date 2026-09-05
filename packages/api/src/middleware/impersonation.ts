/**
 * Impersonation Middleware — DOC-029 compliant.
 *
 * Manages impersonation sessions for staff users.
 * Support: read-only impersonation
 * Admin: full impersonation
 *
 * Impersonation features:
 * - Time-limited sessions (2 hours default)
 * - All actions logged to audit
 * - Visible banner in UI
 * - Explicit exit required
 */
import type { Context, Next } from 'hono';
import { createLogger } from '@mushin/shared';

const logger = createLogger('impersonation');

// ── Impersonation Session Store ─────────────────────────────

interface ImpersonationSession {
  sessionId: string;
  staffUserId: string;
  staffRole: 'admin' | 'support';
  targetWorkspaceId: string;
  mode: 'read-only' | 'full';
  startedAt: Date;
  expiresAt: Date;
}

const _sessions = new Map<string, ImpersonationSession>();

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

// ── Session Management ──────────────────────────────────────

export function startImpersonation(
  staffUserId: string,
  staffRole: 'admin' | 'support',
  targetWorkspaceId: string,
  mode: 'read-only' | 'full',
): ImpersonationSession {
  // Support can only do read-only impersonation
  if (staffRole === 'support' && mode !== 'read-only') {
    throw new Error('Support role can only use read-only impersonation');
  }

  const sessionId = crypto.randomUUID();
  const now = new Date();

  const session: ImpersonationSession = {
    sessionId,
    staffUserId,
    staffRole,
    targetWorkspaceId,
    mode,
    startedAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  };

  _sessions.set(sessionId, session);

  logger.info('Impersonation started', {
    sessionId,
    staffUserId,
    staffRole,
    targetWorkspaceId,
    mode,
  });

  return session;
}

export function endImpersonation(sessionId: string): boolean {
  const session = _sessions.get(sessionId);
  if (!session) return false;

  _sessions.delete(sessionId);

  logger.info('Impersonation ended', {
    sessionId,
    staffUserId: session.staffUserId,
    targetWorkspaceId: session.targetWorkspaceId,
  });

  return true;
}

export function getImpersonationSession(sessionId: string): ImpersonationSession | null {
  const session = _sessions.get(sessionId);
  if (!session) return null;

  // Check expiration
  if (new Date() > session.expiresAt) {
    _sessions.delete(sessionId);
    return null;
  }

  return session;
}

// ── Middleware ───────────────────────────────────────────────

/**
 * Impersonation context middleware.
 * Attaches impersonation state to request context.
 */
export function impersonationContext() {
  return async (c: Context, next: Next) => {
    const impersonationToken = c.req.header('X-Impersonation-Token');

    if (impersonationToken) {
      const session = getImpersonationSession(impersonationToken);

      if (!session) {
        return c.json(
          {
            error: {
              code: 'IMPERSONATION_EXPIRED',
              message: 'Impersonation session has expired or is invalid',
              request_id: c.get('requestId'),
            },
          },
          403,
        );
      }

      // Set impersonation context
      c.set('impersonation', {
        sessionId: session.sessionId,
        mode: session.mode,
        targetWorkspaceId: session.targetWorkspaceId,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
      });
    }

    return await next();
  };
}

/**
 * Enforce impersonation mode restrictions.
 * For read-only mode, block mutating operations.
 */
export function enforceImpersonationMode() {
  return async (c: Context, next: Next) => {
    const impersonation = c.get('impersonation');

    if (!impersonation) {
      return next();
    }

    // Read-only mode: block mutating methods
    if (impersonation.mode === 'read-only') {
      const method = c.req.method;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
        return c.json(
          {
            error: {
              code: 'IMPERSONATION_READ_ONLY',
              message: 'Read-only impersonation mode does not allow mutating operations',
              request_id: c.get('requestId'),
            },
          },
          403,
        );
      }
    }

    await next();
  };
}
