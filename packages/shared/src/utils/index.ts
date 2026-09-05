import { randomUUID } from 'node:crypto';

/**
 * Generate a v4 UUID.
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Redact C1 fields (PII) from log output (Doc-25 / ADR-011).
 * C1 fields: email, displayName, avatarUrl, any PII.
 */
const C1_FIELDS = new Set([
  'email',
  'displayName',
  'avatarUrl',
  'firstName',
  'lastName',
  'phone',
  'address',
  'ip',
]);

export function redactC1<T extends Record<string, unknown>>(obj: T): T {
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (C1_FIELDS.has(key)) {
      (redacted as Record<string, unknown>)[key] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * Create a cursor from an ID + timestamp for keyset pagination.
 */
export function encodeCursor(id: string, timestamp: Date): string {
  return Buffer.from(`${id}:${timestamp.toISOString()}`).toString('base64url');
}

/**
 * Decode a cursor back to ID + timestamp.
 */
export function decodeCursor(cursor: string): { id: string; timestamp: Date } {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
  const [id, ts] = decoded.split(':');
  if (!id || !ts) {
    throw new Error('Invalid cursor format');
  }
  return { id, timestamp: new Date(ts) };
}

/**
 * Clamp a number to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
