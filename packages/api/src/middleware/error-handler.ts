/**
 * Error handler middleware (Doc 20 Part D).
 * Maps internal errors to the 35-code taxonomy with standardized envelope.
 */
import type { Context, Next } from 'hono';
import { AppError } from '@mushin/shared';
import { createLogger } from '@mushin/shared';

const logger = createLogger('api:error-handler');

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
    return;
  } catch (err) {
    const requestId = c.get('requestId') ?? crypto.randomUUID();

    // Known application errors
    if (err instanceof AppError) {
      logger.warn('Application error', {
        request_id: requestId,
        error_code: err.code,
        status: err.status,
      });
      return c.json(err.toEnvelope(requestId), err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503);
    }

    // Unexpected errors — do not leak internals
    logger.error('Unhandled error', { request_id: requestId }, err instanceof Error ? err : undefined);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          request_id: requestId,
        },
      },
      500,
    );
  }
}

/**
 * Rate limit headers middleware (Doc 20 Part E4).
 * Attach after tenancy resolution.
 */
export function rateLimitHeaders(limit: number, remaining: number, resetAt: number) {
  return (c: Context, next: Next) => {
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetAt));
    return next();
  };
}
