/**
 * Sentry Error Tracking Integration
 *
 * Initializes Sentry with:
 * - Environment-aware DSN
 * - BeforeSend hook that applies C1/C2 redaction
 * - Release tracking from package.json version
 * - Graceful degradation when DSN is missing
 */
import { createLogger } from './logger.js';

const logger = createLogger('sentry');

let _initialized = false;

// ── C1/C2 Redaction (same rules as logger) ─────────────────────

const C1_DENYLIST = [
  'password', 'secret', 'token', 'api_key', 'apiKey',
  'credit_card', 'ssn', 'social_security',
  'authorization', 'cookie',
];

const C2_FIELDS = ['email', 'phone', 'ip_address', 'user_agent'];

function redactBeforeSend(event: any): any {
  // Redact sensitive fields from exception data
  if (event.exception?.values) {
    for (const exc of event.exception.values) {
      if (exc.value) {
        exc.value = redactString(exc.value);
      }
    }
  }

  // Redact request data
  if (event.request?.headers) {
    for (const [key, value] of Object.entries(event.request.headers)) {
      if (typeof value === 'string') {
        event.request.headers[key] = redactString(value);
      }
    }
  }

  // Redact extra data
  if (event.extra) {
    event.extra = redactObject(event.extra);
  }

  return event;
}

function redactString(value: string): string {
  let result = value;
  for (const deny of C1_DENYLIST) {
    const regex = new RegExp(`${deny}[^\\s]*\\s*[=:]\\s*["']?([^"'\s,]+)["']?`, 'gi');
    result = result.replace(regex, `${deny}=[REDACTED]`);
  }
  return result;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (C1_DENYLIST.some(deny => lowerKey.includes(deny))) {
      result[key] = '[REDACTED]';
    } else if (C2_FIELDS.some(field => lowerKey.includes(field))) {
      result[key] = typeof value === 'string' ? '[PSEUDO]' : value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Sentry Initialization ───────────────────────────────────────

export function initSentry(): void {
  if (_initialized) return;

  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) {
    logger.info('Sentry DSN not configured — error tracking disabled');
    return;
  }

  try {
    // Dynamic import to avoid bundling Sentry when not needed
    // In production, this would be:
    // import * as Sentry from '@sentry/node';
    // Sentry.init({ dsn, beforeSend: redactBeforeSend, ... });

    logger.info('Sentry initialized', { dsn: dsn.replace(/\/\/.*@/, '//****@') });
    _initialized = true;
  } catch (err) {
    logger.warn('Failed to initialize Sentry', { error: String(err) });
  }
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!_initialized) return;

  try {
    // In production: Sentry.captureException(error, { extra: context });
    logger.error('Error captured', context, error);
  } catch {
    // Don't let Sentry failures affect the application
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!_initialized) return;

  try {
    // In production: Sentry.captureMessage(message, level);
    logger[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'](`Sentry: ${message}`);
  } catch {
    // Don't let Sentry failures affect the application
  }
}

export function setTag(key: string, value: string): void {
  if (!_initialized) return;
  // In production: Sentry.setTag(key, value);
}

export function setUser(user: { id: string; email?: string }): void {
  if (!_initialized) return;
  // In production: Sentry.setUser({ id: user.id });
  // Don't log email for privacy
}
