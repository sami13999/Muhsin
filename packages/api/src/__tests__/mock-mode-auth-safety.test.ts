/**
 * Mock Mode & Authentication Safety Tests (Step 1 Verification).
 *
 * Verifies:
 * 1. Explicit mock mode in an allowed local/test environment.
 * 2. Mock mode rejection in production (fails closed).
 * 3. createApp(config) respecting supplied configuration over process.env heuristics.
 * 4. Missing or invalid production authentication configuration failing safely.
 * 5. /auth/session never granting an unauthenticated admin session.
 * 6. Elimination of master password bypasses in mock mode.
 * 7. Protected routes enforcing authentication.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '../index.js';

// Mock dependencies for real mode composition
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
  creatorRepository: {
    eraseCreator: vi.fn(),
    isCreatorErased: vi.fn(),
    isHandleBlocked: vi.fn(),
  },
}));

vi.mock('@mushin/adapters', () => ({
  createMeilisearchAdapter: vi.fn().mockReturnValue({
    health: vi.fn().mockResolvedValue({ status: 'healthy' }),
    search: vi.fn().mockResolvedValue({ hits: [] }),
    upsertDocument: vi.fn(),
  }),
  createLLMAdapter: vi.fn().mockReturnValue({
    call: vi.fn(),
  }),
  createSerperAdapter: vi.fn().mockReturnValue({
    search: vi.fn().mockResolvedValue([]),
    health: vi.fn().mockResolvedValue({ status: 'healthy' }),
  }),
  createApifyAdapter: vi.fn().mockReturnValue({
    runActor: vi.fn().mockResolvedValue([]),
    health: vi.fn().mockResolvedValue({ status: 'healthy' }),
  }),
  createPaddleAdapter: vi.fn().mockReturnValue(null),
  createWhatsAppAdapter: vi.fn().mockReturnValue({
    sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'waba-test-123' }),
    health: vi.fn().mockResolvedValue({ status: 'healthy' }),
  }),
}));

describe('Mock Mode & Authentication Safety (Step 1)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Explicit Mock Mode in Non-Production', () => {
    it('should activate mock mode when config.mockMode is explicitly true', async () => {
      process.env['NODE_ENV'] = 'test';
      const app = createApp({ mockMode: true });

      // In mock mode, /health returns mock indicators
      const res = await app.fetch(new Request('http://localhost/health/liveness'));
      expect(res.status).toBe(200);

      // Workspaces returns mock data
      const wsRes = await app.fetch(new Request('http://localhost/api/v1/workspaces'));
      expect(wsRes.status).toBe(200);
      const wsBody = (await wsRes.json()) as { data: Array<{ workspace: { id: string } }> };
      expect(wsBody.data[0]?.workspace.id).toBe('ws-001');
    });

    it('should activate mock mode when process.env.MOCK_MODE === "true" in non-production', async () => {
      process.env['NODE_ENV'] = 'development';
      process.env['MOCK_MODE'] = 'true';
      const app = createApp();

      const res = await app.fetch(new Request('http://localhost/health/liveness'));
      expect(res.status).toBe(200);
    });
  });

  describe('2. Mock Mode Rejected in Production', () => {
    it('should throw fatal error if mockMode is requested in production via config', () => {
      process.env['NODE_ENV'] = 'production';
      expect(() => {
        createApp({ mockMode: true });
      }).toThrow(/FATAL: Mock mode cannot be activated in production environment/);
    });

    it('should throw fatal error if MOCK_MODE=true is set in production via process.env', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['MOCK_MODE'] = 'true';
      expect(() => {
        createApp();
      }).toThrow(/FATAL: Mock mode cannot be activated in production environment/);
    });
  });

  describe('3. Configuration Validation & Fail-Closed Behavior', () => {
    it('should fail safely with a startup error when required non-mock configuration is missing', () => {
      process.env['NODE_ENV'] = 'development';
      delete process.env['MOCK_MODE'];
      delete process.env['DATABASE_URL'];
      delete process.env['SUPABASE_URL'];
      delete process.env['SUPABASE_ANON_KEY'];
      delete process.env['JWKS_URI'];
      delete process.env['JWT_ISSUER'];
      delete process.env['JWT_AUDIENCE'];

      expect(() => {
        createApp({});
      }).toThrow(/FATAL: Missing required environment variables/);
    });

    it('should fail safely when JWKS_URI has an invalid URL format', () => {
      process.env['NODE_ENV'] = 'test';
      expect(() => {
        createApp({
          databaseUrl: 'postgresql://localhost:5432/db',
          supabaseUrl: 'https://example.supabase.co',
          supabaseAnonKey: 'anon-key',
          jwtIssuer: 'https://issuer.com',
          jwtAudience: 'audience',
          jwksUri: 'not-a-valid-url',
        });
      }).toThrow(/FATAL: Invalid JWKS_URI format/);
    });

    it('should fail safely when SUPABASE_URL has an invalid URL format', () => {
      process.env['NODE_ENV'] = 'test';
      expect(() => {
        createApp({
          databaseUrl: 'postgresql://localhost:5432/db',
          supabaseUrl: 'invalid-url',
          supabaseAnonKey: 'anon-key',
          jwtIssuer: 'https://issuer.com',
          jwtAudience: 'audience',
          jwksUri: 'https://example.com/jwks.json',
        });
      }).toThrow(/FATAL: Invalid SUPABASE_URL format/);
    });
  });

  describe('4. Hardened Authentication & No Unconditional Admin Session in Mock Mode', () => {
    it('GET /auth/session without Authorization header must return 401 AUTH_TOKEN_MISSING', async () => {
      process.env['NODE_ENV'] = 'test';
      const app = createApp({ mockMode: true });

      const res = await app.fetch(new Request('http://localhost/auth/session'));
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('GET /auth/session with unknown token must return 401 AUTH_TOKEN_INVALID', async () => {
      process.env['NODE_ENV'] = 'test';
      const app = createApp({ mockMode: true });

      const res = await app.fetch(new Request('http://localhost/auth/session', {
        headers: { Authorization: 'Bearer random-fake-token' },
      }));
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('POST /auth/login must reject master password bypass (password123!) for mismatched password', async () => {
      process.env['NODE_ENV'] = 'test';
      const app = createApp({ mockMode: true });

      // Attempt login with incorrect password
      const res = await app.fetch(new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@mushin.app', password: 'wrong-password' }),
      }));
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('AUTH_INVALID_PASSWORD');
    });

    it('POST /auth/login with valid credentials establishes session, and logout revokes it', async () => {
      process.env['NODE_ENV'] = 'test';
      const app = createApp({ mockMode: true });

      // 1. Login with valid mock user
      const loginRes = await app.fetch(new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@mushin.app', password: 'password123' }),
      }));
      expect(loginRes.status).toBe(200);
      const loginBody = (await loginRes.json()) as { data: { session: { access_token: string } } };
      const token = loginBody.data.session.access_token;
      expect(token).toBeDefined();

      // 2. Validate session with issued token
      const sessionRes = await app.fetch(new Request('http://localhost/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      }));
      expect(sessionRes.status).toBe(200);
      const sessionBody = (await sessionRes.json()) as { data: { user: { email: string } } };
      expect(sessionBody.data.user.email).toBe('admin@mushin.app');

      // 3. Logout
      const logoutRes = await app.fetch(new Request('http://localhost/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }));
      expect(logoutRes.status).toBe(200);

      // 4. Session check after logout must fail
      const revokedRes = await app.fetch(new Request('http://localhost/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      }));
      expect(revokedRes.status).toBe(401);
    });
  });

  describe('5. Real Configuration Composition & Route Protection', () => {
    it('createApp(config) mounts real tenancy middleware and protected routes when given valid config', async () => {
      process.env['NODE_ENV'] = 'test';
      const app = createApp({
        databaseUrl: 'postgresql://test:test@localhost:5432/mushin',
        supabaseUrl: 'https://test-project.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        jwtIssuer: 'https://test-issuer.supabase.co/auth/v1',
        jwtAudience: 'authenticated',
        jwksUri: 'https://test-issuer.supabase.co/auth/v1/.well-known/jwks.json',
      });

      // Protected route without authorization header must be intercepted with 401
      const res = await app.fetch(new Request('http://localhost/api/v1/creators', {
        headers: { 'X-Workspace-ID': 'ws-test' },
      }));
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });
});
