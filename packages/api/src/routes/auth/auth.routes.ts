/**
 * Auth Routes — Supabase Auth integration.
 *
 * POST /auth/login    — Email/password login
 * POST /auth/signup   — Email/password signup
 * POST /auth/logout   — Sign out
 * GET  /auth/session  — Validate session
 * POST /auth/refresh  — Refresh access token
 */
import { Hono } from 'hono';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// ── Circuit Breaker for Supabase Auth ────────────────────────

interface AuthCircuitState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureAt: number;
  openedAt: number;
}

const authCircuit: AuthCircuitState = {
  status: 'closed',
  failureCount: 0,
  lastFailureAt: 0,
  openedAt: 0,
};

const AUTH_CIRCUIT_THRESHOLD = 5;
const AUTH_CIRCUIT_WINDOW_MS = 5 * 60 * 1000;
const AUTH_CIRCUIT_RECOVERY_MS = 30 * 1000;

function recordAuthFailure(): void {
  const now = Date.now();
  if (now - authCircuit.lastFailureAt > AUTH_CIRCUIT_WINDOW_MS) {
    authCircuit.failureCount = 0;
  }
  authCircuit.failureCount++;
  authCircuit.lastFailureAt = now;

  if (authCircuit.failureCount >= AUTH_CIRCUIT_THRESHOLD && authCircuit.status !== 'open') {
    authCircuit.status = 'open';
    authCircuit.openedAt = now;
  }
}

function recordAuthSuccess(): void {
  authCircuit.failureCount = 0;
  if (authCircuit.status === 'half-open') {
    authCircuit.status = 'closed';
  }
}

function isAuthCircuitOpen(): boolean {
  if (authCircuit.status === 'closed') return false;
  if (authCircuit.status === 'open') {
    if (Date.now() - authCircuit.openedAt > AUTH_CIRCUIT_RECOVERY_MS) {
      authCircuit.status = 'half-open';
      return false;
    }
    return true;
  }
  return false; // half-open: allow one request through
}

// ── IP-Based Rate Limiting for Auth Endpoints ────────────────

interface LoginAttempt {
  count: number;
  windowStart: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const LOGIN_RATE_LIMIT = 5; // max attempts per window
const LOGIN_RATE_WINDOW_MS = 60_000; // 1 minute

function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt || now - attempt.windowStart > LOGIN_RATE_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  attempt.count++;

  if (attempt.count > LOGIN_RATE_LIMIT) {
    const retryAfterMs = LOGIN_RATE_WINDOW_MS - (now - attempt.windowStart);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (now - attempt.windowStart > LOGIN_RATE_WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ── Route Factory ────────────────────────────────────────────

export function createAuthRoutes(config: AuthConfig): Hono {
  const routes = new Hono();

  function getClient(accessToken?: string): SupabaseClient {
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    });
    return client;
  }

  /**
   * POST /auth/login
   * Sign in with email and password.
   */
  routes.post('/login', async (c) => {
    const requestId = c.get('requestId');

    // IP-based rate limiting (TD-07)
    const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('x-real-ip')
      ?? 'unknown';
    const rateLimit = checkLoginRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return c.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
            retry_after_ms: rateLimit.retryAfterMs,
            request_id: requestId,
          },
        },
        429,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const { email, password } = body ?? {};

    if (!email || !password) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const supabase = getClient();

    // Circuit breaker check
    if (isAuthCircuitOpen()) {
      return c.json(
        {
          error: {
            code: 'AUTH_SERVICE_UNAVAILABLE',
            message: 'Authentication service temporarily unavailable. Please try again later.',
            request_id: requestId,
          },
        },
        503,
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: email as string, password: password as string });

    if (error) {
      recordAuthFailure();
      return c.json(
        {
          error: {
            code: 'AUTH_CREDENTIALS_INVALID',
            message: 'Invalid email or password',
            request_id: requestId,
          },
        },
        401,
      );
    }

    recordAuthSuccess();

    return c.json({
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /auth/signup
   * Register new user with email and password.
   */
  routes.post('/signup', async (c) => {
    const requestId = c.get('requestId');

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const { email, password, name } = body ?? {};

    if (!email || !password) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const supabase = getClient();
    const { data, error } = await supabase.auth.signUp({
      email: email as string,
      password: password as string,
      options: name ? { data: { full_name: name } } : undefined,
    });

    if (error) {
      return c.json(
        {
          error: {
            code: 'AUTH_SIGNUP_FAILED',
            message: 'Unable to create account. Please try again.',
            request_id: requestId,
          },
        },
        400,
      );
    }

    return c.json({
      data: {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
        } : null,
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        } : null,
      },
      meta: { request_id: requestId },
    }, 201);
  });

  /**
   * POST /auth/logout
   * Sign out current session.
   */
  routes.post('/logout', async (c) => {
    const requestId = c.get('requestId');
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    const supabase = getClient(accessToken);
    const { error } = await supabase.auth.signOut();

    if (error) {
      return c.json(
        {
          error: {
            code: 'AUTH_LOGOUT_FAILED',
            message: error.message,
            request_id: requestId,
          },
        },
        500,
      );
    }

    return c.json({ data: { success: true }, meta: { request_id: requestId } });
  });

  /**
   * GET /auth/session
   * Validate current session and return user info.
   */
  routes.get('/session', async (c) => {
    const requestId = c.get('requestId');
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!accessToken) {
      return c.json(
        {
          error: {
            code: 'AUTH_TOKEN_MISSING',
            message: 'Authorization header is required',
            request_id: requestId,
          },
        },
        401,
      );
    }

    const supabase = getClient(accessToken);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return c.json(
        {
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Invalid or expired token',
            request_id: requestId,
          },
        },
        401,
      );
    }

    return c.json({
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token.
   */
  routes.post('/refresh', async (c) => {
    const requestId = c.get('requestId');

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const { refresh_token } = body ?? {};

    if (!refresh_token) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'refresh_token is required',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const supabase = getClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refresh_token as string });

    if (error || !data.session) {
      return c.json(
        {
          error: {
            code: 'AUTH_REFRESH_FAILED',
            message: 'Session expired. Please log in again.',
            request_id: requestId,
          },
        },
        401,
      );
    }

    return c.json({
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
