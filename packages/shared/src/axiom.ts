/**
 * Axiom Log Transport
 *
 * Sends structured logs to Axiom for aggregation and querying.
 * Uses HTTP POST to Axiom ingest endpoint.
 * Async, non-blocking — log writes don't affect request path.
 */
import { createLogger, setLogTransport } from './logger.js';

const logger = createLogger('axiom');

let _enabled = false;
let _dataset: string | null = null;
let _token: string | null = null;
let _buffer: Record<string, unknown>[] = [];
let _flushTimer: NodeJS.Timeout | null = null;

const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const MAX_BUFFER_SIZE = 100;

// ── Initialization ──────────────────────────────────────────────

export function initAxiom(): void {
  _token = process.env['AXIOM_TOKEN'] ?? null;
  _dataset = process.env['AXIOM_DATASET'] ?? null;

  if (!_token || !_dataset) {
    logger.info('Axiom not configured — log aggregation disabled');
    return;
  }

  _enabled = true;

  // Register transport with logger
  setLogTransport((entry) => {
    if (!_enabled) return;
    _buffer.push(entry);
    if (_buffer.length >= MAX_BUFFER_SIZE) {
      flush();
    }
  });

  // Start flush timer
  _flushTimer = setInterval(() => {
    flush();
  }, FLUSH_INTERVAL_MS);

  // Flush on process exit
  process.on('exit', () => {
    flush();
  });

  logger.info('Axiom initialized', { dataset: _dataset });
}

// ── Flush Buffer ────────────────────────────────────────────────

async function flush(): Promise<void> {
  if (_buffer.length === 0 || !_token || !_dataset) return;

  const entries = [..._buffer];
  _buffer = [];

  try {
    const response = await fetch(`https://api.axiom.co/v1/datasets/${_dataset}/ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${_token}`,
        'Content-Type': 'application/json',
        'X-Axiom-Source': 'mushin-api',
      },
      body: JSON.stringify(entries),
    });

    if (!response.ok) {
      // Don't log the error to avoid infinite loop
      // Just silently drop the logs
    }
  } catch {
    // Network error — silently drop logs
    // In production, consider local file backup
  }
}

// ── Cleanup ─────────────────────────────────────────────────────

export function shutdownAxiom(): void {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  flush(); // Final flush
  _enabled = false;
}
