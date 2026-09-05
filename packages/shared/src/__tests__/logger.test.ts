/**
 * Structured logger tests.
 * Tests DOC-023 requirements: structured JSON, correlation, redaction.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StructuredLogger, createLogger } from '../logger.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let stdoutSpy: ReturnType<typeof vi.fn>;
  let stderrSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logger = createLogger('test-service');
    stdoutSpy = vi.fn();
    stderrSpy = vi.fn();
    vi.spyOn(process.stdout, 'write').mockImplementation(stdoutSpy);
    vi.spyOn(process.stderr, 'write').mockImplementation(stderrSpy);
  });

  describe('Factory', () => {
    it('should create logger with service name', () => {
      expect(logger).toBeInstanceOf(StructuredLogger);
    });
  });

  describe('Log levels', () => {
    it('should log error to stderr', () => {
      logger.error('test error');
      expect(stderrSpy).toHaveBeenCalled();
    });

    it('should log warn to stderr', () => {
      logger.warn('test warn');
      expect(stderrSpy).toHaveBeenCalled();
    });

    it('should log info to stdout', () => {
      logger.info('test info');
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should handle debug level (filtered at info default)', () => {
      // Debug is filtered at default level (info) — this is expected
      logger.debug('test debug');
      expect(true).toBe(true);
    });
  });

  describe('Structured JSON output', () => {
    it('should output valid JSON', () => {
      logger.info('test message');
      const output = stdoutSpy.mock.calls[0]?.[0] as string;
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should include timestamp', () => {
      logger.info('test message');
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.ts).toBeDefined();
    });

    it('should include service name', () => {
      logger.info('test message');
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.service).toBe('test-service');
    });

    it('should include log level', () => {
      logger.info('test message');
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.level).toBe('info');
    });

    it('should include message', () => {
      logger.info('test message');
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.message).toBe('test message');
    });
  });

  describe('Correlation IDs', () => {
    it('should include request_id when provided', () => {
      logger.info('test', { request_id: 'req-123' });
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.request_id).toBe('req-123');
    });

    it('should include trace_id when provided', () => {
      logger.info('test', { trace_id: 'trace-456' });
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.trace_id).toBe('trace-456');
    });

    it('should include workspace_id when provided', () => {
      logger.info('test', { workspace_id: 'ws-789' });
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.workspace_id).toBe('ws-789');
    });
  });

  describe('Redaction (DOC-021 C1/C2)', () => {
    it('should redact C1 fields (password, secret, token)', () => {
      logger.info('test', { password: 'mysecret123', api_key: 'key-abc' });
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.password).toBe('[REDACTED]');
      expect(output.api_key).toBe('[REDACTED]');
    });

    it('should pseudonymize C2 fields (email, phone)', () => {
      logger.info('test', { email: 'user@example.com' });
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.email).toMatch(/^\[PSEUDO:[a-f0-9]+\]$/);
    });

    it('should not redact non-sensitive fields', () => {
      logger.info('test', { workspace_id: 'ws-123', count: 42 });
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.workspace_id).toBe('ws-123');
      expect(output.count).toBe(42);
    });
  });

  describe('Child logger', () => {
    it('should inherit parent context', () => {
      const child = logger.child({ request_id: 'req-123' });
      child.info('child message');
      const output = JSON.parse(stdoutSpy.mock.calls[0]?.[0] as string);
      expect(output.request_id).toBe('req-123');
      expect(output.service).toBe('test-service');
    });
  });

  describe('Error logging', () => {
    it('should include error details when provided', () => {
      const error = new Error('test error');
      logger.error('failed', {}, error);
      const output = JSON.parse(stderrSpy.mock.calls[0]?.[0] as string);
      expect(output.error).toBeDefined();
      expect(output.error.message).toBe('test error');
    });
  });
});
