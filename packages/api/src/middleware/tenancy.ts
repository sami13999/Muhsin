/**
 * Tenancy middleware (Doc 14 Part A2, NFR-S01, Doc 20 Part B3).
 * Every request resolves TenancyContext before business logic.
 * Now uses real workspace repository instead of stubs.
 */
import type { Context, Next } from 'hono';
import { jwtVerify, createRemoteJWKSet, type JWTVerifyResult } from 'jose';
import { sql } from 'drizzle-orm';
import type { TenancyContext } from '@mushin/shared';
import type { Database } from '@mushin/database';
import { workspaceRepository } from '@mushin/database';

// Extend Hono context to carry tenancy
declare module 'hono' {
  interface ContextVariableMap {
    tenancy: TenancyContext;
    requestId: string;
    db: Database;
  }
}

// ── JWKS Cache (refreshes every 1 hour) ─────────────────────

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let _jwksUri: string | null = null;
let _jwksCreatedAt: number = 0;
const JWKS_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function getJWKS(uri: string) {
  const now = Date.now();
  if (!_jwks || _jwksUri !== uri || (now - _jwksCreatedAt) > JWKS_REFRESH_INTERVAL_MS) {
    _jwks = createRemoteJWKSet(new URL(uri));
    _jwksUri = uri;
    _jwksCreatedAt = now;
  }
  return _jwks;
}

// ── Plan entitlements (hardcoded defaults from Doc 3) ────────
// The Entitlement Catalog (Doc 10 FS-08.01) will be built in Sprint 5 Track B.

interface Entitlements {
  seatLimit: number;
  monthlyCreditAllowance: number;
  featureGates: Record<string, boolean>;
}

const PLAN_ENTITLEMENTS: Record<string, Entitlements> = {
  free: { seatLimit: 1, monthlyCreditAllowance: 100, featureGates: { whatsapp_s2: false, exports: false } },
  starter: { seatLimit: 3, monthlyCreditAllowance: 500, featureGates: { whatsapp_s2: false, exports: true } },
  growth: { seatLimit: 10, monthlyCreditAllowance: 2000, featureGates: { whatsapp_s2: true, exports: true } },
  agency: { seatLimit: 50, monthlyCreditAllowance: 10000, featureGates: { whatsapp_s2: true, exports: true } },
  enterprise: { seatLimit: -1, monthlyCreditAllowance: 50000, featureGates: { whatsapp_s2: true, exports: true } },
};

function deriveFromPlan(plan: string): Entitlements {
  return PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS['free']!;
}

// ── Tenancy Middleware Factory ───────────────────────────────

export function tenancyMiddleware(config: {
  jwksUri: string;
  jwtIssuer: string;
  jwtAudience: string;
  db: Database;
}) {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('X-Request-ID') ?? crypto.randomUUID();
    c.set('requestId', requestId);
    c.set('db', config.db);

    // 1. Extract JWT
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        {
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'Missing or invalid Authorization header',
            request_id: requestId,
          },
        },
        401,
      );
    }

    const token = authHeader.slice(7);

    // 2. Validate JWT against JWKS
    let verifyResult: JWTVerifyResult;
    try {
      verifyResult = await jwtVerify(token, getJWKS(config.jwksUri), {
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      });
    } catch (err) {
      const code =
        err instanceof Error && err.message.includes('expired')
          ? 'AUTH_TOKEN_EXPIRED'
          : 'AUTH_TOKEN_INVALID';
      return c.json(
        {
          error: {
            code,
            message: code === 'AUTH_TOKEN_EXPIRED' ? 'JWT has expired; refresh required' : 'JWT is invalid',
            request_id: requestId,
          },
        },
        401,
      );
    }

    const claims = verifyResult.payload;
    const userId = claims.sub;
    if (!userId) {
      return c.json(
        {
          error: {
            code: 'AUTH_TOKEN_INVALID',
            message: 'JWT missing sub claim',
            request_id: requestId,
          },
        },
        401,
      );
    }

    // 3. Extract workspace ID
    const workspaceId = c.req.header('X-Workspace-ID');
    if (!workspaceId) {
      return c.json(
        {
          error: {
            code: 'WORKSPACE_ID_REQUIRED',
            message: 'X-Workspace-ID header is required for this endpoint',
            request_id: requestId,
          },
        },
        400,
      );
    }

    // 4. Verify workspace membership (REAL DB lookup)
    const membership = await workspaceRepository.getMembership(config.db, userId, workspaceId);
    if (!membership) {
      return c.json(
        {
          error: {
            code: 'AUTHZ_WORKSPACE_MISMATCH',
            message: 'User is not a member of this workspace',
            request_id: requestId,
          },
        },
        403,
      );
    }

    if (membership.status !== 'active') {
      return c.json(
        {
          error: {
            code: 'AUTHZ_WORKSPACE_SUSPENDED',
            message: 'Workspace membership is not active',
            request_id: requestId,
          },
        },
        403,
      );
    }

    // 5. Get workspace for entitlements
    const ws = await workspaceRepository.findById(config.db, workspaceId);
    const entitlements = deriveFromPlan(ws?.workspace.subscriptionPlanId ?? 'free');

    // 6. Construct and attach TenancyContext
    // Check both top-level and app_metadata for realm (Supabase puts it in app_metadata)
    const appMeta = claims['app_metadata'] as Record<string, unknown> | undefined;
    const isStaff = claims['realm'] === 'staff' || appMeta?.['realm'] === 'staff';
    const staffRole = (claims['role'] ?? appMeta?.['role']) as 'admin' | 'support' | undefined;

    const tenancy: TenancyContext = {
      userId,
      workspaceId,
      creatorId: '', // Resolved per-request where needed
      isStaff,
      roles: [membership.role],
      claims: {
        iss: claims.iss ?? '',
        sub: userId,
        aud: (claims.aud as string) ?? '',
        exp: claims.exp ?? 0,
        iat: claims.iat ?? 0,
        role: staffRole,
      },
    };

    c.set('tenancy', tenancy);

    // Set PostgreSQL session variable for RLS (Layer 3 enforcement)
    // This ensures all queries in this request are scoped to the workspace.
    await config.db.execute(
      sql`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`
    );

    await next();
    return;
  };
}

// ── Staff-only guard (Doc 20 Part B2) ───────────────────────

export function staffOnly(c: Context, next: Next) {
  const tenancy = c.get('tenancy');
  if (!tenancy?.isStaff) {
    return c.json(
      {
        error: {
          code: 'STAFF_REALM_REQUIRED',
          message: 'This endpoint requires staff authentication',
          request_id: c.get('requestId'),
        },
      },
      403,
    );
  }
  return next();
}
