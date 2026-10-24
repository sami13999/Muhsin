/**
 * MUSHIN API — Hono Application Composition.
 *
 * Wires all middleware and routes into a single Hono application.
 * Middleware order (non-negotiable):
 *   1. request-id
 *   2. error handler (wraps everything)
 *   3. CORS
 *   4. webhook routes (no tenancy, no rate limit)
 *   5. tenancy resolution (protected routes only)
 *   6. rate limiting (after tenancy — keys by workspaceId)
 *   7. RBAC (per-route)
 *   8. audit logging (per-route)
 *   9. route handlers
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Database } from '@mushin/database';
import { getDb } from '@mushin/database';
import type { MeilisearchAdapter, LLMAdapter, BillingProvider, SerperAdapter, ApifyAdapter } from '@mushin/adapters';
import { createMeilisearchAdapter, createLLMAdapter, createPaddleAdapter, createSerperAdapter, createApifyAdapter } from '@mushin/adapters';
import { createLogger, registerHealthCheck, createDatabaseCheck } from '@mushin/shared';
import { tenancyMiddleware, staffOnly } from './middleware/tenancy.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import { mfaEnforcement } from './middleware/mfa-enforcement.js';
import { impersonationContext, enforceImpersonationMode } from './middleware/impersonation.js';
import { createM1Routes } from './routes/m1-workspace/index.js';
import { createM2Routes, createErasureRoutes } from './routes/m2-creator/index.js';
import { createRevealRoutes } from './routes/m2-creator/reveal.routes.js';
import { createHistoryRoutes } from './routes/m2-creator/history.routes.js';
import { createRefreshRoutes } from './routes/m2-creator/refresh.routes.js';
import { createM3Routes } from './routes/m3-search/index.js';
import { createBillingWebhookRoutes } from './routes/m4-billing/index.js';
import { createCRMListRoutes, createCRMCampaignRoutes } from './routes/m8-crm/index.js';
import { createOutreachRoutes } from './routes/m9-outreach/index.js';
import { createAnalyticsRoutes } from './routes/m12-analytics/analytics.routes.js';
import { createHealthRoutes } from './routes/health/health.routes.js';
import { createAuthRoutes } from './routes/auth/auth.routes.js';
import { createAdminRoutes } from './routes/admin/admin.routes.js';
import { createStaffRoutes } from './routes/admin/staff.routes.js';
import { createStaffPortalRoutes } from './routes/staff/staff-portal.routes.js';
import { createCRMService } from './services/crm.service.js';
import { createOutreachService } from './services/outreach.service.js';
import { createAnalyticsService } from './services/analytics.service.js';
import { createStaffService } from './services/staff.service.js';

export {
  createDiscoveryOrchestrator,
  DiscoveryOrchestrator,
  type DiscoveryJob,
  type DiscoveryResult,
  type DiscoveryConfig,
} from './services/discovery/index.js';

const logger = createLogger('api:app');

// ── Configuration ─────────────────────────────────────────────

export interface AppConfig {
  db?: Database;
  databaseUrl?: string;
  meilisearchHost?: string;
  meilisearchApiKey?: string;
  groqApiKey?: string;
  anthropicApiKey?: string;
  serperApiKey?: string;
  apifyApiKey?: string;
  paddleApiKey?: string;
  paddleWebhookSecret?: string;
  paddleEnvironment?: 'sandbox' | 'production';
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  jwtIssuer?: string;
  jwtAudience?: string;
  jwksUri?: string;
  corsOrigins?: string[];
  mockMode?: boolean;
}

// ── App Factory ───────────────────────────────────────────────

export function createApp(config: AppConfig = {}): Hono {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';
  const isProduction = nodeEnv === 'production';

  // ── Mock Mode Gate (TD-08 / Sec-01) ─────────────────────────
  // Mock mode is strictly an explicit opt-in for local dev and tests.
  // It MUST NEVER activate in production under any circumstances.
  const requestedMockMode =
    config.mockMode === true || process.env['MOCK_MODE'] === 'true';

  if (isProduction && requestedMockMode) {
    logger.error('CRITICAL: Attempted to activate mock mode in production environment.');
    throw new Error(
      '[MUSHIN] FATAL: Mock mode cannot be activated in production environment (NODE_ENV=production).',
    );
  }

  const isMockMode = !isProduction && requestedMockMode;

  // ── Validate critical environment variables (TD-08) ────────
  // When not running in explicit mock mode, require valid production/staging credentials.
  if (!isMockMode) {
    const requiredEnvVars: Array<{ env: string; configKey?: keyof AppConfig }> = [
      { env: 'DATABASE_URL', configKey: 'databaseUrl' },
      { env: 'SUPABASE_URL', configKey: 'supabaseUrl' },
      { env: 'SUPABASE_ANON_KEY', configKey: 'supabaseAnonKey' },
      { env: 'JWKS_URI', configKey: 'jwksUri' },
      { env: 'JWT_ISSUER', configKey: 'jwtIssuer' },
      { env: 'JWT_AUDIENCE', configKey: 'jwtAudience' },
    ];

    const missingVars = requiredEnvVars.filter(({ env, configKey }) =>
      !(configKey && config[configKey]) && !process.env[env],
    );

    if (missingVars.length > 0) {
      const names = missingVars.map((v) => v.env);
      logger.error(`Missing required environment variables: ${names.join(', ')}`);
      throw new Error(
        `[MUSHIN] FATAL: Missing required environment variables: ${names.join(', ')}. ` +
        'Copy .env.example to .env and fill in your credentials.',
      );
    }

    // Validate URL formats for auth and db endpoints
    const jwksUri = config.jwksUri ?? process.env['JWKS_URI'];
    if (jwksUri) {
      try {
        new URL(jwksUri);
      } catch {
        throw new Error(`[MUSHIN] FATAL: Invalid JWKS_URI format: "${jwksUri}". Must be a valid URL.`);
      }
    }

    const supabaseUrl = config.supabaseUrl ?? process.env['SUPABASE_URL'];
    if (supabaseUrl) {
      try {
        new URL(supabaseUrl);
      } catch {
        throw new Error(`[MUSHIN] FATAL: Invalid SUPABASE_URL format: "${supabaseUrl}". Must be a valid URL.`);
      }
    }
  }

  const app = new Hono();

  // ── 1. Request ID (global) ─────────────────────────────────
  app.use('*', async (c, next) => {
    const requestId = c.req.header('X-Request-ID') ?? crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  });

  // ── 2. Security headers ──────────────────────────────────────
  app.use('*', secureHeaders({
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    xFrameOptions: 'DENY',
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  }));

  // ── 3. Error handler (wraps everything below) ──────────────
  app.use('*', errorHandler);

  // ── 4. CORS (env-driven origins) ───────────────────────────
  const corsOrigins = config.corsOrigins
    ?? process.env['CORS_ORIGINS']?.split(',').map(s => s.trim())
    ?? ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000'];

  app.use('*', cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID', 'X-Request-ID'],
    exposeHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
  }));

  if (isMockMode) {
    logger.info('Explicit local mock mode active — using development stubs');
    
    // Health routes
    registerHealthCheck('database', async () => ({ status: 'healthy', message: 'Mock Database Active' }));
    registerHealthCheck('meilisearch', async () => ({ status: 'healthy', message: 'Mock Meilisearch Active' }));
    app.route('/health', createHealthRoutes(undefined as any));

    // Mock Stateful Auth Store
    const mockRegisteredUsers: Array<{ id: string; email: string; password: string; name?: string }> = [
      { id: 'usr-001', email: 'admin@mushin.app', password: 'password123', name: 'Admin User' },
      { id: 'usr-002', email: 'owner@acme.com', password: 'password123', name: 'Acme Owner' },
    ];

    // Mock Active Sessions Store
    const mockActiveSessions = new Map<string, { id: string; email: string; name?: string }>();

    app.post('/auth/login', async (c) => {
      const requestId = c.get('requestId') || 'mock-request-id';
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {}

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

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = mockRegisteredUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return c.json(
          {
            error: {
              code: 'AUTH_ACCOUNT_NOT_FOUND',
              message: `Account for "${email}" was not found. Please sign up first.`,
              request_id: requestId,
            },
          },
          401,
        );
      }

      const isPasswordMatch = user.password === password;

      if (!isPasswordMatch) {
        return c.json(
          {
            error: {
              code: 'AUTH_INVALID_PASSWORD',
              message: 'Incorrect password. Please check your credentials and try again.',
              request_id: requestId,
            },
          },
          401,
        );
      }

      const accessToken = `mock-token-${user.id}-${Date.now()}`;
      const refreshToken = `mock-refresh-${user.id}-${Date.now()}`;
      mockActiveSessions.set(accessToken, { id: user.id, email: user.email, name: user.name || user.email.split('@')[0] });

      return c.json({
        data: {
          user: { id: user.id, email: user.email, name: user.name || user.email.split('@')[0] },
          session: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
          },
        },
        meta: { request_id: requestId },
      });
    });

    app.post('/auth/signup', async (c) => {
      const requestId = c.get('requestId') || 'mock-request-id';
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {}

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

      if (String(password).length < 6) {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Password must be at least 6 characters long',
              request_id: requestId,
            },
          },
          400,
        );
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = mockRegisteredUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (existing) {
        return c.json(
          {
            error: {
              code: 'AUTH_EMAIL_EXISTS',
              message: `An account with "${email}" already exists. Please log in instead.`,
              request_id: requestId,
            },
          },
          400,
        );
      }

      const newUser = {
        id: `usr-${Date.now()}`,
        email: normalizedEmail,
        password: String(password),
        name: name || normalizedEmail.split('@')[0],
      };

      mockRegisteredUsers.push(newUser);

      const accessToken = `mock-token-${newUser.id}-${Date.now()}`;
      const refreshToken = `mock-refresh-${newUser.id}-${Date.now()}`;
      mockActiveSessions.set(accessToken, { id: newUser.id, email: newUser.email, name: newUser.name });

      return c.json(
        {
          data: {
            user: { id: newUser.id, email: newUser.email, name: newUser.name },
            session: {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
            },
          },
          meta: { request_id: requestId },
        },
        201,
      );
    });

    app.post('/auth/logout', (c) => {
      const authHeader = c.req.header('Authorization');
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      if (accessToken) {
        mockActiveSessions.delete(accessToken);
      }
      return c.json({ data: { success: true }, meta: { request_id: c.get('requestId') || 'mock-request-id' } });
    });

    app.get('/auth/session', (c) => {
      const requestId = c.get('requestId') || 'mock-request-id';
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

      const sessionUser = mockActiveSessions.get(accessToken);
      if (!sessionUser) {
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
        data: { user: sessionUser },
        meta: { request_id: requestId },
      });
    });

    // Mock API Workspace & Analytics
    app.get('/api/v1/workspaces', (c) => c.json({
      data: [{ workspace: { id: 'ws-001', name: 'Acme Workspace', slug: 'acme' }, membership: { role: 'owner', status: 'active', joinedAt: new Date().toISOString() } }]
    }));
    app.get('/api/v1/analytics', (c) => c.json({
      data: {
        analytics: {
          creditUsage: { total: 1250, byCategory: { reveal: 1000, enrichment: 250 } },
          outreachMetrics: { sent: 120, delivered: 115, opened: 85, replied: 25, bounced: 2 },
          creatorMetrics: { totalCreators: 450, activeCreators: 320, newListCreators: 45 }
        }
      },
      meta: { request_id: 'mock-request-id' }
    }));

    // Mock API Lists, Campaigns & Creators
    const mockListsStore: Array<{ listId: string; name: string; description: string | null; memberCount: number; createdAt: string }> = [
      { listId: 'lst-001', name: 'Summer Niche List', description: 'Tech and Fashion influencers in Pakistan', memberCount: 24, createdAt: new Date().toISOString() },
      { listId: 'lst-002', name: 'Ramadan Brand Ambassadors', description: 'Verified beauty and lifestyle creators', memberCount: 12, createdAt: new Date().toISOString() },
    ];

    app.route('/api/v1', createCRMListRoutes({
      listLists: async () => mockListsStore,
      createList: async (p: { name: string; description?: string }) => {
        const newList = {
          listId: `lst-${Date.now()}`,
          name: p.name,
          description: p.description || null,
          memberCount: 0,
          createdAt: new Date().toISOString(),
        };
        mockListsStore.unshift(newList);
        return newList;
      },
      getList: async (id: string) => mockListsStore.find((l) => l.listId === id) || null,
      addListMember: async () => {},
      removeListMember: async () => {},
    } as any));
    app.route('/api/v1', createCRMCampaignRoutes());
    const VERIFIED_REAL_CREATORS = [
      {
        creatorId: 'cr-shahveer-01',
        displayName: 'Shahveer Jafry',
        primaryHandle: '@ShahveerJay',
        platform: 'youtube',
        followerCount: 3400000,
        engagementRate: 9.4,
        _rankingScore: 99,
        city: 'Lahore',
        niche: 'Vlogs & Entertainment',
        iqScore: 97,
        verified: true,
        avatarUrl: '/creators/shahveer-jafry.jpg',
        bio: 'Digital creator, family vlogger & Pakistani podcast host',
        canonicalUrl: 'https://www.youtube.com/@ShahveerJay',
        isLive: true
      },
      {
        creatorId: 'cr-junejo-02',
        displayName: 'Irfan Junejo',
        primaryHandle: '@IrfanJunejo',
        platform: 'youtube',
        followerCount: 1600000,
        engagementRate: 8.2,
        _rankingScore: 98,
        city: 'Karachi',
        niche: 'Cinematic & Lifestyle',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/irfan-junejo.jpg',
        bio: 'Cinematic storytelling, lifestyle photography & honest tech vlogs',
        canonicalUrl: 'https://www.youtube.com/@IrfanJunejo',
        isLive: true
      },
      {
        creatorId: 'cr-romaisa-03',
        displayName: 'Romaisa Khan',
        primaryHandle: '@romaisa.khan._',
        platform: 'tiktok',
        followerCount: 8500000,
        engagementRate: 11.4,
        _rankingScore: 96,
        city: 'Karachi',
        niche: 'Entertainment & Comedy',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/romaisa-khan.png',
        bio: 'Waiting for 10M 😊 | Actress & TikTok star known for viral comedy skits & lifestyle',
        canonicalUrl: 'https://www.tiktok.com/@romaisa.khan._',
        isLive: true
      },
      {
        creatorId: 'cr-arslan-04',
        displayName: 'Arslan Naseer (CBA)',
        primaryHandle: '@arsalancba',
        platform: 'youtube',
        followerCount: 1250000,
        engagementRate: 8.9,
        _rankingScore: 97,
        city: 'Islamabad',
        niche: 'Comedy & Parody',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/arslan-naseer.jpg',
        bio: 'Comics By Arslan (CBA) creator, satirist, YouTuber & TV actor',
        canonicalUrl: 'https://www.youtube.com/@arsalancba',
        isLive: true
      },
      {
        creatorId: 'cr-danyal-05',
        displayName: 'Danyal Zafar',
        primaryHandle: '@danyalzee',
        platform: 'instagram',
        followerCount: 890000,
        engagementRate: 7.2,
        _rankingScore: 95,
        city: 'Lahore',
        niche: 'Music & Fashion',
        iqScore: 94,
        verified: true,
        avatarUrl: '/creators/danyal-zafar.jpg',
        bio: 'Musician, singer, indie songwriter & youth fashion icon',
        canonicalUrl: 'https://www.instagram.com/danyalzee/',
        isLive: true
      },
      {
        creatorId: 'cr-areeka-06',
        displayName: 'Areeka Haq',
        primaryHandle: '@areeka__haq',
        platform: 'tiktok',
        followerCount: 11200000,
        engagementRate: 12.1,
        _rankingScore: 99,
        city: 'Karachi',
        niche: 'Fashion & Beauty',
        iqScore: 98,
        verified: true,
        avatarUrl: '/creators/areeka-haq.jpg',
        bio: 'Fashion, beauty, lip-sync & top trending Pakistani creator',
        canonicalUrl: 'https://www.tiktok.com/@areeka__haq',
        isLive: true
      },
      {
        creatorId: 'cr-kanwal-07',
        displayName: 'Kanwal Aftab',
        primaryHandle: '@kanwal.135',
        platform: 'tiktok',
        followerCount: 18500000,
        engagementRate: 10.8,
        _rankingScore: 98,
        city: 'Lahore',
        niche: 'Lifestyle & Family',
        iqScore: 97,
        verified: true,
        avatarUrl: '/creators/kanwal-aftab.jpg',
        bio: 'Lifestyle influencer, TV host & family vlogger',
        canonicalUrl: 'https://www.tiktok.com/@kanwal.135',
        isLive: true
      },
      {
        creatorId: 'cr-mooroo-08',
        displayName: 'Mooroo',
        primaryHandle: '@mooroosicity',
        platform: 'youtube',
        followerCount: 1100000,
        engagementRate: 7.6,
        _rankingScore: 96,
        city: 'Islamabad',
        niche: 'Music & Podcasts',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/mooroo.jpg',
        bio: 'Taimoor Salahuddin (Mooroo) - Musician, filmmaker & top Pakistani podcaster',
        canonicalUrl: 'https://www.youtube.com/@mooroosicity',
        isLive: true
      },
      {
        creatorId: 'cr-ducky-09',
        displayName: 'Ducky Bhai',
        primaryHandle: '@DuckyBhai',
        platform: 'youtube',
        followerCount: 8200000,
        engagementRate: 14.8,
        _rankingScore: 99,
        city: 'Lahore',
        niche: 'Gaming, Roasting & Vlogs',
        iqScore: 98,
        verified: true,
        avatarUrl: '/creators/ducky-bhai.jpg',
        bio: 'Saad Ur Rehman (Ducky Bhai) - Pakistan top gaming, roasting & viral daily vlogger',
        canonicalUrl: 'https://www.youtube.com/@DuckyBhai',
        isLive: true
      },
      {
        creatorId: 'cr-maaz-10',
        displayName: 'Maaz Safder',
        primaryHandle: '@MaazSafderWorld',
        platform: 'youtube',
        followerCount: 4800000,
        engagementRate: 11.2,
        _rankingScore: 98,
        city: 'Karachi',
        niche: 'Daily Vlogs & Family',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/maaz-safder.jpg',
        bio: 'Pakistani daily family vlogger, travel content creator & lifestyle influencer',
        canonicalUrl: 'https://www.youtube.com/@MaazSafderWorld',
        isLive: true
      },
      {
        creatorId: 'cr-bilal-11',
        displayName: 'Bilal Munir (VideoWaliSarkar)',
        primaryHandle: '@VideoWaliSarkar1',
        platform: 'youtube',
        followerCount: 3100000,
        engagementRate: 8.5,
        _rankingScore: 97,
        city: 'Lahore',
        niche: 'Tech & Gadgets',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/bilal-munir.jpg',
        bio: 'Pakistan premier technology reviewer, smartphone unboxer & gadget expert',
        canonicalUrl: 'https://www.youtube.com/@VideoWaliSarkar1',
        isLive: true
      },
      {
        creatorId: 'cr-village-12',
        displayName: 'Village Food Secrets',
        primaryHandle: '@VillageFoodSecrets',
        platform: 'youtube',
        followerCount: 4300000,
        engagementRate: 9.8,
        _rankingScore: 98,
        city: 'Sialkot',
        niche: 'Food & Cooking',
        iqScore: 97,
        verified: true,
        avatarUrl: '/creators/village-food-secrets.jpg',
        bio: 'Mubashir Saddique - Traditional Pakistani village recipes, outdoor cooking & organic food',
        canonicalUrl: 'https://www.youtube.com/@VillageFoodSecrets',
        isLive: true
      },
      {
        creatorId: 'cr-amna-13',
        displayName: 'Kitchen With Amna',
        primaryHandle: '@KitchenWithAmna',
        platform: 'youtube',
        followerCount: 4500000,
        engagementRate: 8.9,
        _rankingScore: 97,
        city: 'Lahore',
        niche: 'Food & Recipes',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/kitchen-with-amna.jpg',
        bio: 'Amna Riaz - Easy Pakistani home cooking recipes, baking tutorials & street food',
        canonicalUrl: 'https://www.youtube.com/@KitchenWithAmna',
        isLive: true
      },
      {
        creatorId: 'cr-jannat-14',
        displayName: 'Jannat Mirza',
        primaryHandle: '@jannatmirza',
        platform: 'tiktok',
        followerCount: 25000000,
        engagementRate: 15.6,
        _rankingScore: 99,
        city: 'Faisalabad',
        niche: 'Fashion & Acting',
        iqScore: 98,
        verified: true,
        avatarUrl: '/creators/jannat-mirza.jpg',
        bio: 'Top Pakistani TikTok star, fashion model & cinema actress',
        canonicalUrl: 'https://www.tiktok.com/@jannatmirza',
        isLive: true
      },
      {
        creatorId: 'cr-zulqarnain-15',
        displayName: 'Zulqarnain Sikandar',
        primaryHandle: '@zulqarnaintwoker',
        platform: 'tiktok',
        followerCount: 16500000,
        engagementRate: 12.4,
        _rankingScore: 98,
        city: 'Lahore',
        niche: 'Comedy & Vlogs',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/zulqarnain-sikandar.jpg',
        bio: 'Comedy creator, TikToker, YouTuber & family entertainer with Kanwal Aftab',
        canonicalUrl: 'https://www.tiktok.com/@zulqarnaintwoker',
        isLive: true
      },
      {
        creatorId: 'cr-dananeer-16',
        displayName: 'Dananeer Mobeen',
        primaryHandle: '@dananeerr',
        platform: 'instagram',
        followerCount: 3900000,
        engagementRate: 9.8,
        _rankingScore: 98,
        city: 'Islamabad',
        niche: 'Lifestyle & Fashion',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/dananeer-mobeen.jpg',
        bio: 'Pakistani actress, viral trend creator ("Pawri Horai Hai") & youth fashion icon',
        canonicalUrl: 'https://www.instagram.com/dananeerr/',
        isLive: true
      },
      {
        creatorId: 'cr-merium-17',
        displayName: 'Merium Pervaiz',
        primaryHandle: '@MeriumPervaiz',
        platform: 'youtube',
        followerCount: 7400000,
        engagementRate: 11.2,
        _rankingScore: 99,
        city: 'Faisalabad',
        niche: 'Beauty & Lifestyle',
        iqScore: 97,
        verified: true,
        avatarUrl: '/creators/merium-pervaiz.jpg',
        bio: 'Top Pakistani beauty vlogger, skincare educator & cosmetics entrepreneur',
        canonicalUrl: 'https://www.youtube.com/@MeriumPervaiz',
        isLive: true
      },
      {
        creatorId: 'cr-alizafar-18',
        displayName: 'Ali Zafar',
        primaryHandle: '@AliZafarOfficial',
        platform: 'youtube',
        followerCount: 3800000,
        engagementRate: 7.5,
        _rankingScore: 96,
        city: 'Lahore',
        niche: 'Music & Entertainment',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/ali-zafar.jpg',
        bio: 'Renowned Pakistani pop singer, composer, actor & digital music artist',
        canonicalUrl: 'https://www.youtube.com/@AliZafarOfficial',
        isLive: true
      },
      {
        creatorId: 'cr-hania-19',
        displayName: 'Hania Aamir',
        primaryHandle: '@haniaheheofficial',
        platform: 'instagram',
        followerCount: 17200000,
        engagementRate: 14.5,
        _rankingScore: 99,
        city: 'Karachi',
        niche: 'Lifestyle & Acting',
        iqScore: 98,
        verified: true,
        avatarUrl: '/creators/hania-aamir.jpg',
        bio: 'Celebrated Pakistani cinema actress, daily lifestyle vlogger & viral digital sensation',
        canonicalUrl: 'https://www.instagram.com/haniaheheofficial/',
        isLive: true
      },
      {
        creatorId: 'cr-ayla-20',
        displayName: 'Ayla Adnan',
        primaryHandle: '@aylasworld',
        platform: 'instagram',
        followerCount: 115000,
        engagementRate: 8.2,
        _rankingScore: 95,
        city: 'Lahore',
        niche: 'Fashion & Bridal Lifestyle',
        iqScore: 94,
        verified: true,
        avatarUrl: '/creators/ayla-adnan.jpg',
        bio: 'Pakistani fashion creator, aesthetic bridal styling, outfit inspiration & lifestyle vlogs',
        canonicalUrl: 'https://www.instagram.com/aylasworld/',
        isLive: true
      },
      {
        creatorId: 'cr-mubeen-29',
        displayName: 'Mubeen',
        primaryHandle: '@whoismubeen',
        platform: 'instagram',
        followerCount: 72000,
        engagementRate: 8.5,
        _rankingScore: 94,
        city: 'Karachi',
        niche: 'Lifestyle & Food',
        iqScore: 93,
        verified: true,
        avatarUrl: '/creators/whois-mubeen.jpg',
        bio: 'Pakistani aesthetic lifestyle & culinary explorer. Known for high production reels & food culture',
        canonicalUrl: 'https://www.instagram.com/whoismubeen/',
        isLive: true
      },
      {
        creatorId: 'cr-aliqa-30',
        displayName: 'Aliqa Shafqat',
        primaryHandle: '@life_incurls',
        platform: 'instagram',
        followerCount: 68000,
        engagementRate: 7.9,
        _rankingScore: 93,
        city: 'Karachi',
        niche: 'Curly Hair & Lifestyle',
        iqScore: 91,
        verified: true,
        avatarUrl: '/creators/life-incurls.jpg',
        bio: 'Pakistani natural hair advocate, daily lifestyle vlogger & skincare enthusiast',
        canonicalUrl: 'https://www.instagram.com/life_incurls/',
        isLive: true
      },
      {
        creatorId: 'cr-alikarachi-31',
        displayName: 'Ali In Karachi',
        primaryHandle: '@ali_in_karachi',
        platform: 'instagram',
        followerCount: 78000,
        engagementRate: 9.1,
        _rankingScore: 94,
        city: 'Karachi',
        niche: 'Food Reviews & Street Food',
        iqScore: 92,
        verified: true,
        avatarUrl: '/creators/ali-in-karachi.jpg',
        bio: 'Discovering hidden gems, Karachi street food heritage & authentic culinary reviews',
        canonicalUrl: 'https://www.instagram.com/ali_in_karachi/',
        isLive: true
      },
      {
        creatorId: 'cr-mastech-32',
        displayName: 'Mas Tech',
        primaryHandle: '@mastechpk',
        platform: 'youtube',
        followerCount: 180000,
        engagementRate: 8.4,
        _rankingScore: 95,
        city: 'Karachi',
        niche: 'Tech Reviews & PC Builds',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/mas-tech.jpg',
        bio: 'Pakistani tech YouTuber, PC hardware unboxings, custom builds & gadget benchmarks',
        canonicalUrl: 'https://www.youtube.com/@mastechpk',
        isLive: true
      },
      {
        creatorId: 'cr-hira-33',
        displayName: 'Hira Attique',
        primaryHandle: '@hirableeh',
        platform: 'instagram',
        followerCount: 380000,
        engagementRate: 7.6,
        _rankingScore: 94,
        city: 'Islamabad',
        niche: 'Fashion & Aesthetic Lifestyle',
        iqScore: 93,
        verified: true,
        avatarUrl: '/creators/hira-attique.jpg',
        bio: 'Digital content creator, twin sister lifestyle documentation & modest luxury fashion',
        canonicalUrl: 'https://www.instagram.com/hirableeh/',
        isLive: true
      },
      {
        creatorId: 'cr-hemayal-34',
        displayName: 'Hemayal Attique',
        primaryHandle: '@hemayal',
        platform: 'instagram',
        followerCount: 410000,
        engagementRate: 7.9,
        _rankingScore: 95,
        city: 'Lahore',
        niche: 'Fashion & Travel',
        iqScore: 94,
        verified: true,
        avatarUrl: '/creators/hemayal-attique.jpg',
        bio: 'Pakistani style maven, travel storyteller & high-fashion content creator',
        canonicalUrl: 'https://www.instagram.com/hemayal/',
        isLive: true
      },
      {
        creatorId: 'cr-waliya-35',
        displayName: 'Waliya Najib',
        primaryHandle: '@waliyanajib',
        platform: 'instagram',
        followerCount: 1400000,
        engagementRate: 9.2,
        _rankingScore: 97,
        city: 'Islamabad',
        niche: 'Photography & Lifestyle',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/waliya-najib.jpg',
        bio: 'Celebrated photographer, lifestyle creator & digital media personality',
        canonicalUrl: 'https://www.instagram.com/waliyanajib/',
        isLive: true
      },
      {
        creatorId: 'cr-bekaar-36',
        displayName: 'Bekaar Films',
        primaryHandle: '@bekaarfilms',
        platform: 'youtube',
        followerCount: 720000,
        engagementRate: 10.4,
        _rankingScore: 96,
        city: 'Karachi',
        niche: 'Comedy & Entertainment',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/bekaar-films.jpg',
        bio: 'Original Pakistani comedy sketches, relatable youth humor & satire videos',
        canonicalUrl: 'https://www.youtube.com/@bekaarfilms',
        isLive: true
      },
      {
        creatorId: 'cr-laraib-21',
        displayName: 'Laraib Rahim',
        primaryHandle: '@laraib_rahim',
        platform: 'instagram',
        followerCount: 1200000,
        engagementRate: 8.4,
        _rankingScore: 95,
        city: 'Islamabad',
        niche: 'Skincare & Lifestyle',
        iqScore: 94,
        verified: true,
        avatarUrl: '/creators/laraib-rahim.jpg',
        bio: 'Skincare specialist, aesthetic lifestyle creator & beauty advocate',
        canonicalUrl: 'https://www.instagram.com/laraib_rahim/',
        isLive: true
      },
      {
        creatorId: 'cr-sistrology-22',
        displayName: 'Sistrology (Iqra Kanwal)',
        primaryHandle: '@sistrology',
        platform: 'youtube',
        followerCount: 5600000,
        engagementRate: 12.8,
        _rankingScore: 98,
        city: 'Lahore',
        niche: 'Daily Vlogs & Lifestyle',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/sistrology.jpg',
        bio: 'Leading Pakistani sister vloggers, family lifestyle documentation & comedy content',
        canonicalUrl: 'https://www.youtube.com/@sistrology',
        isLive: true
      },
      {
        creatorId: 'cr-rhs-23',
        displayName: 'Rana Hamza Saif (RHS)',
        primaryHandle: '@ranahamzasaif',
        platform: 'youtube',
        followerCount: 1850000,
        engagementRate: 9.1,
        _rankingScore: 97,
        city: 'Lahore',
        niche: 'Food & Travel',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/rana-hamza-saif.jpg',
        bio: 'Pakistan premier culinary street food explorer & international cultural traveler',
        canonicalUrl: 'https://www.youtube.com/@ranahamzasaif',
        isLive: true
      },
      {
        creatorId: 'cr-kendoll-24',
        displayName: 'Ken Doll Dubai (Adnan Zafar)',
        primaryHandle: '@ken_doll_dubai',
        platform: 'instagram',
        followerCount: 1450000,
        engagementRate: 8.7,
        _rankingScore: 95,
        city: 'Karachi',
        niche: 'Fashion & Luxury Lifestyle',
        iqScore: 94,
        verified: true,
        avatarUrl: '/creators/ken-doll.jpg',
        bio: 'Pakistani luxury influencer, hospitality expert & entertainment lifestyle personality',
        canonicalUrl: 'https://www.instagram.com/ken_doll_dubai/',
        isLive: true
      },
      {
        creatorId: 'cr-alishba-25',
        displayName: 'Alishba Anjum',
        primaryHandle: '@alishbaanjum',
        platform: 'tiktok',
        followerCount: 17000000,
        engagementRate: 11.9,
        _rankingScore: 98,
        city: 'Faisalabad',
        niche: 'Fashion & Entertainment',
        iqScore: 96,
        verified: true,
        avatarUrl: '/creators/alishba-anjum.jpg',
        bio: 'Viral TikTok fashion creator, lip-sync performer & lifestyle influencer',
        canonicalUrl: 'https://www.tiktok.com/@alishbaanjum',
        isLive: true
      },
      {
        creatorId: 'cr-ukhano-26',
        displayName: 'Ukhano (Umar Khan)',
        primaryHandle: '@ukhano',
        platform: 'youtube',
        followerCount: 920000,
        engagementRate: 7.8,
        _rankingScore: 95,
        city: 'Islamabad',
        niche: 'Cinematic Travel & Vlogs',
        iqScore: 94,
        verified: true,
        avatarUrl: '/creators/ukhano.jpg',
        bio: 'Northern Pakistan cinematic travel filmmaker, visual storyteller & photographer',
        canonicalUrl: 'https://www.youtube.com/@ukhano',
        isLive: true
      },
      {
        creatorId: 'cr-rabeeca-27',
        displayName: 'Rabeeca Khan',
        primaryHandle: '@rabeecakhan',
        platform: 'tiktok',
        followerCount: 10800000,
        engagementRate: 13.2,
        _rankingScore: 98,
        city: 'Karachi',
        niche: 'Music & Lifestyle',
        iqScore: 97,
        verified: true,
        avatarUrl: '/creators/rabeeca-khan.jpg',
        bio: 'Singer, fashion vlogger & daughter of legendary comedian Iftikhar Thakur',
        canonicalUrl: 'https://www.tiktok.com/@rabeecakhan',
        isLive: true
      },
      {
        creatorId: 'cr-bhatti-28',
        displayName: 'Hamza Bhatti',
        primaryHandle: '@hamzathebhatti',
        platform: 'instagram',
        followerCount: 1100000,
        engagementRate: 9.3,
        _rankingScore: 96,
        city: 'Islamabad',
        niche: 'Food Reviews & Travel',
        iqScore: 95,
        verified: true,
        avatarUrl: '/creators/hamza-bhatti.jpg',
        bio: 'Aesthetic food reviewer, Northern Pakistan travel chronicler & storyteller',
        canonicalUrl: 'https://www.instagram.com/hamzathebhatti/',
        isLive: true
      }
    ];

    const matchCreators = (query: string, platformFilter?: string) => {
      const q = (query || '').toLowerCase().trim();
      let list = VERIFIED_REAL_CREATORS.filter(c => !c.displayName.toLowerCase().includes('babar'));

      if (platformFilter && platformFilter !== 'all') {
        list = list.filter(c => c.platform.toLowerCase() === platformFilter.toLowerCase());
      }

      // Detect follower tier constraints
      const is50k = q.includes('50k') || q.includes('50,000');
      const is30k = q.includes('30k') || q.includes('30,000');
      const is100k = q.includes('100k') || q.includes('100,000');
      const isMega = q.includes('1m') || q.includes('1,000,000') || q.includes('million') || q.includes('mega');

      // Detect niche intent
      const isFood = q.includes('food') || q.includes('cooking') || q.includes('recipe') || q.includes('restaurant') || q.includes('street');
      const isTech = q.includes('tech') || q.includes('gadget') || q.includes('phone') || q.includes('pc') || q.includes('hardware');
      const isFashion = q.includes('fashion') || q.includes('outfit') || q.includes('bridal') || q.includes('beauty') || q.includes('skincare') || q.includes('style');
      const isGaming = q.includes('gaming') || q.includes('gamer') || q.includes('esports') || q.includes('streamer') || q.includes('pubg');
      const isComedy = q.includes('comedy') || q.includes('skit') || q.includes('parody') || q.includes('funny') || q.includes('humor');
      const isLifestyle = q.includes('lifestyle') || q.includes('vlog') || q.includes('travel') || q.includes('daily');

      // Detect city intent
      const isKarachi = q.includes('karachi');
      const isLahore = q.includes('lahore');
      const isIslamabad = q.includes('islamabad');

      const tokens = q
        .split(/[\s,+/]+/)
        .filter(t => t.length > 1 && !['pakistani', 'creator', 'creators', 'influencer', 'influencers', '30k+', '50k+', '100k+', '1m+', 'pk'].includes(t));

      const scored = list.map(creator => {
        let score = 50; // base score
        const name = creator.displayName.toLowerCase();
        const handle = creator.primaryHandle.toLowerCase();
        const niche = creator.niche.toLowerCase();
        const city = creator.city.toLowerCase();
        const bio = (creator.bio || '').toLowerCase();
        const followers = creator.followerCount;

        // 1. Follower Tier Matching
        if (is50k) {
          if (followers >= 50000 && followers <= 450000) {
            score += 250; // High priority for true 50k-400k tier creators
          } else if (followers > 450000 && followers <= 1200000) {
            score += 80;
          } else if (followers > 1200000) {
            score -= 100; // Penalize mega-celebrities when user explicitly asked for 50k+
          }
        } else if (is30k) {
          if (followers >= 30000 && followers <= 500000) {
            score += 180;
          }
        } else if (is100k) {
          if (followers >= 100000 && followers <= 900000) {
            score += 200;
          }
        } else if (isMega) {
          if (followers >= 1000000) {
            score += 250;
          }
        }

        // 2. Niche Intent Matching
        if (isFood && (niche.includes('food') || niche.includes('cooking') || bio.includes('food') || bio.includes('recipe'))) {
          score += 200;
        }
        if (isTech && (niche.includes('tech') || niche.includes('gadget') || bio.includes('tech') || bio.includes('review'))) {
          score += 200;
        }
        if (isFashion && (niche.includes('fashion') || niche.includes('beauty') || niche.includes('skincare') || bio.includes('fashion') || bio.includes('bridal'))) {
          score += 200;
        }
        if (isGaming && (niche.includes('gaming') || bio.includes('gaming') || bio.includes('stream'))) {
          score += 200;
        }
        if (isComedy && (niche.includes('comedy') || niche.includes('parody') || bio.includes('skit') || bio.includes('comedy'))) {
          score += 200;
        }
        if (isLifestyle && (niche.includes('lifestyle') || niche.includes('vlog') || bio.includes('lifestyle') || bio.includes('vlog'))) {
          score += 150;
        }

        // 3. City Intent Matching
        if (isKarachi && city.includes('karachi')) score += 150;
        if (isLahore && city.includes('lahore')) score += 150;
        if (isIslamabad && city.includes('islamabad')) score += 150;

        // 4. Keyword tokens
        for (const token of tokens) {
          if (name.includes(token)) score += 80;
          if (handle.includes(token)) score += 80;
          if (niche.includes(token)) score += 50;
          if (city.includes(token)) score += 40;
          if (bio.includes(token)) score += 30;
        }

        return { creator, score };
      });

      return scored.sort((a, b) => b.score - a.score).map(s => s.creator);
    };

    app.get('/api/v1/creators/search', (c) => {
      const q = c.req.query('q') || c.req.query('query') || '';
      const platform = c.req.query('platform') || 'all';
      const results = matchCreators(q, platform);
      return c.json({
        data: results,
        total: results.length,
        page: 1,
        limit: 20,
        meta: { request_id: 'mock-request-id' }
      });
    });

    app.post('/api/v1/creators/search/nl', async (c) => {
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {}
      const query = String(body.query || 'Pakistani creators');
      const queryLower = query.toLowerCase();
      const chips: Array<{ label: string; value: string; field: string }> = [];

      let platform = 'all';
      if (queryLower.includes('instagram')) {
        platform = 'instagram';
        chips.push({ label: 'Platform', value: 'Instagram', field: 'platform' });
      } else if (queryLower.includes('youtube')) {
        platform = 'youtube';
        chips.push({ label: 'Platform', value: 'YouTube', field: 'platform' });
      } else if (queryLower.includes('tiktok')) {
        platform = 'tiktok';
        chips.push({ label: 'Platform', value: 'TikTok', field: 'platform' });
      }

      if (queryLower.includes('50k')) {
        chips.push({ label: 'Tier', value: '50K+ (Micro / Mid)', field: 'follower_min' });
      } else if (queryLower.includes('30k')) {
        chips.push({ label: 'Tier', value: '30K+', field: 'follower_min' });
      } else if (queryLower.includes('100k')) {
        chips.push({ label: 'Tier', value: '100K+', field: 'follower_min' });
      } else if (queryLower.includes('1m')) {
        chips.push({ label: 'Tier', value: '1M+ (Mega)', field: 'follower_min' });
      }

      if (queryLower.includes('fashion')) {
        chips.push({ label: 'Niche', value: 'Fashion & Beauty', field: 'niche' });
      } else if (queryLower.includes('tech')) {
        chips.push({ label: 'Niche', value: 'Tech & Gadgets', field: 'niche' });
      } else if (queryLower.includes('food')) {
        chips.push({ label: 'Niche', value: 'Food & Cooking', field: 'niche' });
      } else if (queryLower.includes('gaming')) {
        chips.push({ label: 'Niche', value: 'Gaming', field: 'niche' });
      } else if (queryLower.includes('comedy')) {
        chips.push({ label: 'Niche', value: 'Comedy & Skits', field: 'niche' });
      } else if (queryLower.includes('lifestyle')) {
        chips.push({ label: 'Niche', value: 'Lifestyle & Vlogs', field: 'niche' });
      }

      if (queryLower.includes('karachi')) {
        chips.push({ label: 'City', value: 'Karachi, PK', field: 'city' });
      } else if (queryLower.includes('lahore')) {
        chips.push({ label: 'City', value: 'Lahore, PK', field: 'city' });
      } else if (queryLower.includes('islamabad')) {
        chips.push({ label: 'City', value: 'Islamabad, PK', field: 'city' });
      } else {
        chips.push({ label: 'Geography', value: 'Pakistan (PK)', field: 'geo' });
      }

      const results = matchCreators(query, platform);

      return c.json({
        interpretation: {
          chips: chips.length > 0 ? chips : [{ label: 'Smart Filter', value: 'Pakistani Creators', field: 'niche' }],
          raw: query,
          confidence: 0.98,
          cached: false
        },
        results,
        total: results.length,
        meta: { request_id: 'mock-request-id' }
      });
    });

    app.post('/api/v1/creators/search/live', async (c) => {
      let body: any = {};
      try {
        body = await c.req.json();
      } catch {}
      const query = String(body.query || 'Pakistani creators');
      const platform = String(body.platform || 'all');
      const round = Number(body.round || 1);
      const excludeHandles: string[] = Array.isArray(body.excludeHandles)
        ? body.excludeHandles.map((h: string) => String(h).toLowerCase().trim())
        : [];

      // Execute intelligent matching with tier and niche awareness
      const allMatches = matchCreators(query, platform);

      // Filter out creators already present on the user's dashboard
      let unshown = allMatches.filter(item => 
        !excludeHandles.includes(item.primaryHandle.toLowerCase())
      );

      // Return a fresh batch of newly discovered creators for this round
      const batchSize = 4;
      let batch = unshown.slice(0, batchSize);

      return c.json({
        data: batch,
        total: batch.length,
        totalPool: allMatches.length,
        remainingUnshown: Math.max(0, unshown.length - batch.length),
        round,
        pipelineStages: {
          aiQueryExpansion: [
            `site:instagram.com Pakistan ${query} -cricket -athlete`,
            `site:tiktok.com Pakistan ${query} -cricket -athlete`,
            `site:youtube.com Pakistan ${query} -cricket -athlete`
          ],
          serperQueriesExecuted: 3,
          groqAiFilteredAthletes: 1, // Babar Azam / non-influencers discarded
          apifyUrlsScraped: batch.length,
          creatorsPersistedDb: batch.length,
          mushinRankingApplied: true
        },
        executionStats: {
          scrapedEndpoints: ['instagram.com', 'tiktok.com', 'youtube.com'],
          latencyMs: 1650,
          creditsDeducted: 12,
          freshness: 'realtime_live_scan'
        },
        meta: { request_id: 'mock-request-id', timestamp: new Date().toISOString() }
      });
    });

    app.get('/api/v1/creators/trending', (c) => c.json({
      data: [
        { creatorId: 'cr-shahveer-01', displayName: 'Shahveer Jafry', primaryHandle: '@shahveerjay', platform: 'youtube', followerCount: 3400000, engagementRate: 9.4, primaryNiche: 'comedy', trendingScore: 98, trendingExplanation: { growth: 52, engagement: 46 }, trendDirection: 'accelerating' },
        { creatorId: 'cr-junejo-02', displayName: 'Irfan Junejo', primaryHandle: '@irfanjunejo', platform: 'youtube', followerCount: 1600000, engagementRate: 8.2, primaryNiche: 'lifestyle', trendingScore: 95, trendingExplanation: { growth: 48, engagement: 47 }, trendDirection: 'steady' }
      ],
      meta: { request_id: 'mock-request-id', computedAt: new Date().toISOString(), ttl: 3600 }
    }));

    app.get('/api/v1/creators/:id', (c) => {
      const id = c.req.param('id');
      const found = VERIFIED_REAL_CREATORS.find(item => item.creatorId === id) || VERIFIED_REAL_CREATORS[0]!;
      return c.json({
        data: {
          creator: found,
          profiles: [{ platform: found.platform, handle: found.primaryHandle, url: found.canonicalUrl }],
          enrichment: [],
          niches: [found.niche]
        }
      });
    });
    const mockRevealHandler = (c: any) => c.json({
      data: {
        revealed: true,
        freeReveal: false,
        creditsUsed: 5,
        contact: {
          email: 'ayesha.khan@creator-agency.pk',
          phone: '+92 300 5550192',
          whatsapp: '+92 300 5550192',
        },
      },
      meta: { request_id: 'mock-request-id' }
    });
    app.post('/api/v1/creators/:id/reveal', mockRevealHandler);
    app.post('/api/v1/creators/:id/reveal-contact', mockRevealHandler);

    // Mock Admin stats & staff
    app.get('/api/v1/admin/stats', (c) => c.json({
      data: { totalWorkspaces: 12, totalUsers: 34, totalCreators: 1045, apiCalls24h: 4520 }
    }));
    app.get('/api/v1/admin/staff', (c) => c.json({
      data: [{ id: 'st-001', email: 'admin@mushin.app', role: 'admin', status: 'active' }]
    }));

    // Mock Staff portal
    app.get('/api/v1/staff/workspaces', (c) => c.json({
      data: [{ id: 'ws-001', name: 'Acme Workspace', ownerEmail: 'owner@acme.com', plan: 'starter', status: 'active' }]
    }));
    app.get('/api/v1/staff/customers', (c) => c.json({
      data: [{ id: 'cust-001', email: 'owner@acme.com', name: 'Acme Corp', workspacesCount: 1 }]
    }));
    app.get('/api/v1/staff/audit/:workspaceId', (c) => c.json({
      data: [{ id: 'aud-001', timestamp: new Date().toISOString(), action: 'workspace_create', actorEmail: 'admin@mushin.app', details: {} }]
    }));

    return app;
  }

  // ── Resolve dependencies ───────────────────────────────────
  const db = config.db ?? (config.databaseUrl ? getDb(config.databaseUrl) : getDb(process.env['DATABASE_URL']!));

  const meilisearchHost = config.meilisearchHost ?? process.env['MEILISEARCH_HOST'] ?? 'http://localhost:7700';
  const meilisearchApiKey = config.meilisearchApiKey ?? process.env['MEILISEARCH_API_KEY'] ?? 'test-api-key';

  const meilisearch: MeilisearchAdapter = createMeilisearchAdapter({
    host: meilisearchHost,
    apiKey: meilisearchApiKey,
  });

  const llm: LLMAdapter = createLLMAdapter({
    groqApiKey: config.groqApiKey ?? process.env['GROQ_API_KEY'] ?? 'test-groq-key',
    anthropicApiKey: config.anthropicApiKey ?? process.env['ANTHROPIC_API_KEY'],
  });

  // ── Billing adapter (with webhook secret validation) ───────
  const paddleApiKey = config.paddleApiKey ?? process.env['PADDLE_API_KEY'];
  const paddleWebhookSecret = config.paddleWebhookSecret ?? process.env['PADDLE_WEBHOOK_SECRET'];

  let billing: BillingProvider | null = null;
  if (paddleApiKey) {
    if (!paddleWebhookSecret) {
      logger.error('PADDLE_API_KEY is set but PADDLE_WEBHOOK_SECRET is empty — webhook signature verification will fail');
    }
    billing = createPaddleAdapter({
      apiKey: paddleApiKey,
      webhookSecret: paddleWebhookSecret ?? '',
      environment: (config.paddleEnvironment ?? process.env['PADDLE_ENVIRONMENT'] as 'sandbox' | 'production') ?? 'sandbox',
    });
  }

  // Register health checks
  registerHealthCheck('database', createDatabaseCheck(db as unknown as { execute: (query: unknown) => Promise<unknown> }));

  // Register Meilisearch health check (adapter-level)
  registerHealthCheck('meilisearch', async () => {
    try {
      const health = await meilisearch.health();
      return { status: health.status === 'healthy' ? 'healthy' : 'degraded', message: health.status };
    } catch {
      return { status: 'unhealthy' as const, message: 'Meilisearch unreachable' };
    }
  });

  // ── 4. Unauthenticated routes ──────────────────────────────

  // Health endpoints (no auth, no rate limit)
  app.route('/health', createHealthRoutes(db));

  // Auth endpoints (no tenancy — Supabase Auth handles session)
  app.route('/auth', createAuthRoutes({
    supabaseUrl: config.supabaseUrl ?? process.env['SUPABASE_URL']!,
    supabaseAnonKey: config.supabaseAnonKey ?? process.env['SUPABASE_ANON_KEY']!,
  }));

  // ── 5. Webhook routes (raw body, NO tenancy, NO rate limit) ──
  // MUST be mounted before tenancy middleware to avoid 401 on webhook delivery
  if (billing) {
    app.route('/api/v1/webhooks', createBillingWebhookRoutes(db, billing));
  }

  // ── 6. Tenancy middleware (protected routes) ────────────────
  app.use('/api/*', tenancyMiddleware({
    jwksUri: config.jwksUri ?? process.env['JWKS_URI']!,
    jwtIssuer: config.jwtIssuer ?? process.env['JWT_ISSUER']!,
    jwtAudience: config.jwtAudience ?? process.env['JWT_AUDIENCE']!,
    db,
  }));

  // ── 6.5. Impersonation context (after tenancy, before routes) ──
  app.use('/api/*', impersonationContext());

  // ── 6.6. MFA enforcement (for staff routes) ────────────────
  app.use('/api/*', mfaEnforcement());

  // ── 7. Rate limiting (AFTER tenancy — keys by workspaceId) ──
  app.use('/api/*', rateLimitMiddleware());

  // ── 7.5. Impersonation mode enforcement (for write operations) ──
  app.use('/api/*', enforceImpersonationMode());

  // ── 8. Protected route groups ──────────────────────────────

  // M1 — Workspace CRUD
  app.route('/api/v1', createM1Routes(db));

  // M2 — Creator CRUD + Detail + GDPR Erasure
  app.route('/api/v1', createM2Routes(db, meilisearch));
  app.route('/api/v1', createRevealRoutes(db));
  app.route('/api/v1', createHistoryRoutes(db));
  app.route('/api/v1', createRefreshRoutes(db));
  app.route('/api/v1/creators', createErasureRoutes);

  const serper = createSerperAdapter({
    apiKey: config.serperApiKey ?? process.env['SERPER_API_KEY'] ?? 'mock-serper-key',
  });

  const apify = createApifyAdapter({
    apiKey: config.apifyApiKey ?? process.env['APIFY_API_KEY'] ?? process.env['APIFY_TOKEN'] ?? 'mock-apify-key',
  });

  // M3 — Search (filtered + NL + live discovery + quote + trending)
  app.route('/api/v1', createM3Routes(meilisearch, llm, db, serper, apify));

  // M8 — CRM (lists & campaigns)
  const crmService = createCRMService(db);
  app.route('/api/v1', createCRMListRoutes(crmService));
  app.route('/api/v1', createCRMCampaignRoutes());

  // M9 — Outreach
  const outreachService = createOutreachService(db);
  app.route('/api/v1', createOutreachRoutes(outreachService));

  // M12 — Analytics
  const analyticsService = createAnalyticsService(db);
  app.route('/api/v1', createAnalyticsRoutes(analyticsService));

  // Admin (staff-only routes mounted separately)
  app.use('/api/v1/admin/*', async (c, next) => staffOnly(c, next));
  app.route('/api/v1', createAdminRoutes(db));

  // Staff management (admin-only)
  const supabaseUrl = config.supabaseUrl ?? process.env['SUPABASE_URL']!;
  const supabaseServiceRoleKey = config.supabaseServiceRoleKey ?? process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (supabaseServiceRoleKey) {
    const staffService = createStaffService(db, supabaseUrl, supabaseServiceRoleKey);
    app.route('/api/v1/admin/staff', createStaffRoutes(staffService));
  } else {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY not set — staff management routes disabled');
  }

  // Staff portal (support + admin routes) — requires staff authentication
  app.use('/api/v1/staff/*', async (c, next) => staffOnly(c, next));
  app.route('/api/v1/staff', createStaffPortalRoutes(db));

  logger.info('Application composed successfully');

  return app;
}
