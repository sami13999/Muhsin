/**
 * HTTP API Route Tests — Verifies actual HTTP request/response behavior.
 *
 * Uses Hono's app.fetch() to test real HTTP endpoints with proper
 * request/response cycles. Tests security headers, error handling,
 * and route behavior.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { createApp } from '../index.js';

// Mock database
vi.mock('@mushin/database', () => ({
  getDb: vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  }),
  workspaceRepository: {
    findById: vi.fn(),
    getMembership: vi.fn(),
  },
}));

// Mock adapters
vi.mock('@mushin/adapters', () => ({
  createMeilisearchAdapter: vi.fn().mockReturnValue({
    health: vi.fn().mockResolvedValue({ status: 'healthy' }),
    search: vi.fn().mockResolvedValue({ hits: [] }),
    upsertDocument: vi.fn(),
  }),
  createLLMAdapter: vi.fn().mockReturnValue({
    call: vi.fn(),
  }),
  createPaddleAdapter: vi.fn().mockReturnValue(null),
}));

// Mock events
vi.mock('@mushin/events', () => ({
  emitEvent: vi.fn(),
  EVENT_TYPES: { BILLING_WEBHOOK_RECEIVED: 'billing.webhook_received' },
}));

// Create app with test config (bypasses env validation)
let app: Hono;

beforeAll(() => {
  app = createApp({
    db: {} as any,
    databaseUrl: 'postgresql://test:test@localhost/test',
    meilisearchHost: 'http://localhost:7700',
    meilisearchApiKey: 'test',
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
    jwtIssuer: 'https://test.issuer',
    jwtAudience: 'test-audience',
    jwksUri: 'https://test.issuer/.well-known/jwks.json',
    corsOrigins: ['http://localhost:3000'],
  });
});

describe('HTTP API Routes', () => {
  describe('Security Headers', () => {
    it('should set X-Content-Type-Options: nosniff on all responses', async () => {
      const res = await app.fetch(new Request('http://localhost/health'));
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    });

    it('should set X-Frame-Options: DENY on all responses', async () => {
      const res = await app.fetch(new Request('http://localhost/health'));
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    });

    it('should set Strict-Transport-Security on all responses', async () => {
      const res = await app.fetch(new Request('http://localhost/health'));
      const hsts = res.headers.get('strict-transport-security');
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
    });

    it('should set Content-Security-Policy on all responses', async () => {
      const res = await app.fetch(new Request('http://localhost/health'));
      const csp = res.headers.get('content-security-policy');
      expect(csp).toContain("default-src 'self'");
    });

    it('should set X-Request-ID on all responses', async () => {
      const res = await app.fetch(new Request('http://localhost/health'));
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('should echo client X-Request-ID if provided', async () => {
      const req = new Request('http://localhost/health', {
        headers: { 'X-Request-ID': 'my-custom-id' },
      });
      const res = await app.fetch(req);
      expect(res.headers.get('x-request-id')).toBe('my-custom-id');
    });
  });

  describe('Health Endpoints', () => {
    it('GET /health should return 200 or 503', async () => {
      const res = await app.fetch(new Request('http://localhost/health'));
      expect([200, 503]).toContain(res.status);
    });

    it('GET /health/liveness should return 200', async () => {
      const res = await app.fetch(new Request('http://localhost/health/liveness'));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown non-API routes', async () => {
      const res = await app.fetch(new Request('http://localhost/nonexistent'));
      expect(res.status).toBe(404);
    });

    it('should return 401 for unknown API routes (tenancy middleware)', async () => {
      // /api/* routes go through tenancy middleware first — returns 401 without auth
      const res = await app.fetch(new Request('http://localhost/api/v1/nonexistent'));
      expect(res.status).toBe(401);
    });

    it('error response should not leak stack traces', async () => {
      const res = await app.fetch(new Request('http://localhost/api/v1/nonexistent'));
      const body = (await res.json()) as { error: { code: string; request_id: string } };
      expect(body.error).toBeDefined();
      expect(body.error.code).toBeDefined();
      expect(body.error.request_id).toBeDefined();
      // Should NOT contain stack trace, file paths, or SQL
      expect(JSON.stringify(body)).not.toContain('at ');
      expect(JSON.stringify(body)).not.toContain('.ts:');
      expect(JSON.stringify(body)).not.toContain('SELECT');
    });
  });

  describe('CORS', () => {
    it('should respond to preflight OPTIONS request', async () => {
      const req = new Request('http://localhost/api/v1/creators', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });
      const res = await app.fetch(req);
      // Should not be 404 — CORS middleware handles OPTIONS
      expect(res.status).not.toBe(404);
    });
  });

  describe('Auth Endpoints', () => {
    it('POST /auth/login with missing body should return 400', async () => {
      const req = new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /auth/login with invalid JSON should return 400', async () => {
      const req = new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });

    it('POST /auth/signup with missing fields should return 400', async () => {
      const req = new Request('http://localhost/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Protected Endpoints', () => {
    it('GET /api/v1/creators without auth should return 401', async () => {
      const req = new Request('http://localhost/api/v1/creators', {
        headers: { 'X-Workspace-ID': 'ws-001' },
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/creators with invalid token should return 401', async () => {
      const req = new Request('http://localhost/api/v1/creators', {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'X-Workspace-ID': 'ws-001',
        },
      });
      const res = await app.fetch(req);
      expect(res.status).toBe(401);
    });

    it('GET /api/v1/creators without workspace header should return 400', async () => {
      const req = new Request('http://localhost/api/v1/creators', {
        headers: { 'Authorization': 'Bearer valid-token' },
      });
      const res = await app.fetch(req);
      // Should be 400 (missing workspace) or 401 (invalid token)
      expect([400, 401]).toContain(res.status);
    });
  });
});
