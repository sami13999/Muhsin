/**
 * Structured Logger — JSON logging with correlation IDs.
 *
 * Per DOC-023:
 * - Structured JSON log schema
 * - Correlation: request_id → trace_id → job_id
 * - Redaction rules for C1/C2 data
 * - Log levels: fatal, error, warn, info, debug
 */

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  service: string;
  message: string;
  request_id?: string;
  trace_id?: string;
  workspace_id?: string;
  module?: string;
  adapter?: string;
  ctx?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ── Redaction Rules (DOC-021 C1/C2) ─────────────────────────

const C1_DENYLIST = [
  'password', 'secret', 'token', 'api_key', 'apiKey',
  'credit_card', 'ssn', 'social_security',
  'authorization', 'cookie',
];

const C2_FIELDS = ['email', 'phone', 'ip_address', 'user_agent'];

function redactField(key: string, value: unknown): unknown {
  const lowerKey = key.toLowerCase();

  // C1: Full redaction
  if (C1_DENYLIST.some((deny) => lowerKey.includes(deny))) {
    return '[REDACTED]';
  }

  // C2: HMAC pseudonymization (simplified — in production use actual HMAC)
  if (C2_FIELDS.some((field) => lowerKey.includes(field))) {
    if (typeof value === 'string') {
      return `[PSEUDO:${hashSimple(value)}]`;
    }
  }

  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = redactField(key, value);
    }
  }
  return result;
}

function hashSimple(str: string): string {
  // Simplified hash for pseudonymization — production should use HMAC-SHA256
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ── Logger ───────────────────────────────────────────────────

const LEVEL_ORDER: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const MIN_LEVEL: LogLevel = (process.env['LOG_LEVEL'] as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[MIN_LEVEL];
}

export class StructuredLogger {
  private service: string;
  private defaultCtx: Record<string, unknown>;

  constructor(service: string, defaultCtx: Record<string, unknown> = {}) {
    this.service = service;
    this.defaultCtx = defaultCtx;
  }

  fatal(message: string, ctx?: Record<string, unknown>, error?: Error): void {
    this.log('fatal', message, ctx, error);
  }

  error(message: string, ctx?: Record<string, unknown>, error?: Error): void {
    this.log('error', message, ctx, error);
  }

  warn(message: string, ctx?: Record<string, unknown>): void {
    this.log('warn', message, ctx);
  }

  info(message: string, ctx?: Record<string, unknown>): void {
    this.log('info', message, ctx);
  }

  debug(message: string, ctx?: Record<string, unknown>): void {
    this.log('debug', message, ctx);
  }

  /**
   * Create a child logger with additional context.
   */
  child(defaultCtx: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger(this.service, {
      ...this.defaultCtx,
      ...defaultCtx,
    });
  }

  private log(
    level: LogLevel,
    message: string,
    ctx?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...this.defaultCtx,
      ...ctx,
    };

    // Redact sensitive fields
    const redacted = redactObject(entry as unknown as Record<string, unknown>);

    // Add error details
    if (error) {
      redacted['error'] = {
        name: error.name,
        message: error.message,
        stack: process.env['NODE_ENV'] === 'production' ? undefined : error.stack,
      };
    }

    // Output as JSON
    const output = JSON.stringify(redacted);

    switch (level) {
      case 'fatal':
      case 'error':
        process.stderr.write(output + '\n');
        break;
      case 'warn':
        process.stderr.write(output + '\n');
        break;
      default:
        process.stdout.write(output + '\n');
    }

    // Send to Axiom if configured
    if (_axiomTransport) {
      _axiomTransport(redacted);
    }
  }
}

// ── Axiom Transport Hook ───────────────────────────────────────

let _axiomTransport: ((entry: Record<string, unknown>) => void) | null = null;

/**
 * Register a transport function for sending log entries to external services.
 * Used by Axiom integration.
 */
export function setLogTransport(transport: (entry: Record<string, unknown>) => void): void {
  _axiomTransport = transport;
}

// ── Factory ──────────────────────────────────────────────────

export function createLogger(service: string): StructuredLogger {
  return new StructuredLogger(service);
}
