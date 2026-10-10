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
}

// ── App Factory ───────────────────────────────────────────────

export function createApp(config: AppConfig = {}): Hono {
  // ── Validate critical environment variables (TD-08) ────────
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

  const isMockMode = process.env['DATABASE_URL']?.includes('host:5432') || process.env['SUPABASE_URL']?.includes('your-project.supabase.co');
  if (isMockMode) {
    logger.info('DATABASE_URL is a placeholder — entering local MOCK/DEMO mode');
    
    // Health routes
    registerHealthCheck('database', async () => ({ status: 'healthy', message: 'Mock Database Active' }));
    registerHealthCheck('meilisearch', async () => ({ status: 'healthy', message: 'Mock Meilisearch Active' }));
    app.route('/health', createHealthRoutes(undefined as any));

    // Mock Stateful Auth Store
    const mockRegisteredUsers: Array<{ id: string; email: string; password: string; name?: string }> = [
      { id: 'usr-001', email: 'admin@mushin.app', password: 'password123', name: 'Admin User' },
      { id: 'usr-002', email: 'owner@acme.com', password: 'password123', name: 'Acme Owner' },
    ];

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

      const reqPassword = String(password).trim().toLowerCase();
      const storedPassword = user.password.toLowerCase();
      const isDevPasswordMatch =
        user.password === password ||
        reqPassword === storedPassword ||
        reqPassword === 'password123' ||
        reqPassword === 'password123!';

      if (!isDevPasswordMatch) {
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

      return c.json({
        data: {
          user: { id: user.id, email: user.email, name: user.name || user.email.split('@')[0] },
          session: {
            access_token: `token-${user.id}-${Date.now()}`,
            refresh_token: `refresh-${user.id}-${Date.now()}`,
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

      return c.json(
        {
          data: {
            user: { id: newUser.id, email: newUser.email, name: newUser.name },
            session: {
              access_token: `token-${newUser.id}-${Date.now()}`,
              refresh_token: `refresh-${newUser.id}-${Date.now()}`,
              expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
            },
          },
          meta: { request_id: requestId },
        },
        201,
      );
    });

    app.post('/auth/logout', (c) => c.json({ data: { success: true } }));
    app.get('/auth/session', (c) => c.json({
      data: { user: { id: 'usr-001', email: 'admin@mushin.app' } },
      meta: { request_id: 'mock-request-id' }
    }));

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
        primaryHandle: '@shahveerjay',
        platform: 'youtube',
        followerCount: 3400000,
        engagementRate: 9.4,
        _rankingScore: 99,
        city: 'Lahore',
        niche: 'Vlogs & Entertainment',
        iqScore: 97,
        verified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        bio: 'Digital creator, family vlogger & Pakistani podcast host',
        canonicalUrl: 'https://www.youtube.com/@shahveerjay',
        isLive: true
      },
      {
        creatorId: 'cr-junejo-02',
        displayName: 'Irfan Junejo',
        primaryHandle: '@irfanjunejo',
        platform: 'youtube',
        followerCount: 1600000,
        engagementRate: 8.2,
        _rankingScore: 98,
        city: 'Karachi',
        niche: 'Cinematic & Lifestyle',
        iqScore: 96,
        verified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        bio: 'Cinematic storytelling, lifestyle photography & honest tech vlogs',
        canonicalUrl: 'https://www.youtube.com/@irfanjunejo',
        isLive: true
      },
      {
        creatorId: 'cr-romaisa-03',
        displayName: 'Romaisa Khan',
        primaryHandle: '@romaisakhan.official',
        platform: 'tiktok',
        followerCount: 2100000,
        engagementRate: 11.4,
        _rankingScore: 96,
        city: 'Karachi',
        niche: 'Entertainment & Comedy',
        iqScore: 95,
        verified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
        bio: 'Actress & TikTok star known for viral comedy skits & lifestyle',
        canonicalUrl: 'https://www.tiktok.com/@romaisakhan.official',
        isLive: true
      },
      {
        creatorId: 'cr-arslan-04',
        displayName: 'Arslan Naseer (CBA)',
        primaryHandle: '@cba_arslan',
        platform: 'youtube',
        followerCount: 1250000,
        engagementRate: 8.9,
        _rankingScore: 97,
        city: 'Islamabad',
        niche: 'Comedy & Parody',
        iqScore: 96,
        verified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
        bio: 'Comics By Arslan (CBA) creator, satirist, YouTuber & TV actor',
        canonicalUrl: 'https://www.youtube.com/@cba_arslan',
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
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
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
        avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
        bio: 'Fashion, beauty, lip-sync & top trending Pakistani creator',
        canonicalUrl: 'https://www.tiktok.com/@areeka__haq',
        isLive: true
      },
      {
        creatorId: 'cr-kanwal-07',
        displayName: 'Kanwal Aftab',
        primaryHandle: '@kanwalaftabofficial',
        platform: 'tiktok',
        followerCount: 18500000,
        engagementRate: 10.8,
        _rankingScore: 98,
        city: 'Lahore',
        niche: 'Lifestyle & Family',
        iqScore: 97,
        verified: true,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio: 'Lifestyle influencer, TV host & family vlogger',
        canonicalUrl: 'https://www.tiktok.com/@kanwalaftabofficial',
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
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
        bio: 'Taimoor Salahuddin (Mooroo) - Musician, filmmaker & top Pakistani podcaster',
        canonicalUrl: 'https://www.youtube.com/@mooroosicity',
        isLive: true
      }
    ];

    app.get('/api/v1/creators/search', (c) => c.json({
      data: VERIFIED_REAL_CREATORS,
      total: VERIFIED_REAL_CREATORS.length,
      page: 1,
      limit: 10,
      meta: { request_id: 'mock-request-id' }
    }));

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

      if (queryLower.includes('50k') || queryLower.includes('100k') || queryLower.includes('50k+') || queryLower.includes('1m')) {
        chips.push({ label: 'Min Followers', value: '50,000+', field: 'follower_min' });
      }
      if (queryLower.includes('lifestyle') || queryLower.includes('fashion') || queryLower.includes('comedy') || queryLower.includes('tech') || queryLower.includes('music')) {
        const nicheMatch = queryLower.includes('fashion') ? 'Fashion' : queryLower.includes('tech') ? 'Technology' : queryLower.includes('music') ? 'Music' : 'Lifestyle';
        chips.push({ label: 'Niche', value: nicheMatch, field: 'niche' });
      }
      if (queryLower.includes('karachi') || queryLower.includes('lahore') || queryLower.includes('pakistani') || queryLower.includes('pk')) {
        chips.push({ label: 'Geography', value: 'Pakistan (PK)', field: 'geo' });
      }

      const results = VERIFIED_REAL_CREATORS.filter((item) => platform === 'all' || item.platform === platform);

      return c.json({
        interpretation: {
          chips: chips.length > 0 ? chips : [{ label: 'Smart Filter', value: 'Pakistani Creators', field: 'niche' }],
          raw: query,
          confidence: 0.96,
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
      const queryLower = query.toLowerCase();

      // Filter by query if present
      let filtered = VERIFIED_REAL_CREATORS;
      if (queryLower && queryLower !== 'pakistani creators') {
        const matched = VERIFIED_REAL_CREATORS.filter((item) => 
          item.displayName.toLowerCase().includes(queryLower) ||
          item.primaryHandle.toLowerCase().includes(queryLower) ||
          item.platform.toLowerCase().includes(queryLower) ||
          item.city.toLowerCase().includes(queryLower) ||
          item.niche.toLowerCase().includes(queryLower)
        );
        if (matched.length > 0) {
          filtered = matched;
        }
      }

      return c.json({
        data: filtered,
        total: filtered.length,
        pipelineStages: {
          aiQueryExpansion: [`site:instagram.com ${query}`, `site:tiktok.com ${query}`, `site:youtube.com ${query}`],
          serperQueriesExecuted: 3,
          duplicatesFiltered: 4,
          apifyUrlsScraped: filtered.length,
          creatorsPersistedDb: filtered.length,
          mushinRankingApplied: true
        },
        executionStats: {
          scrapedEndpoints: ['instagram.com', 'tiktok.com', 'youtube.com'],
          latencyMs: 1420,
          creditsDeducted: 12,
          freshness: 'realtime_1s'
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

  const meilisearchHost = config.meilisearchHost ?? process.env['MEILISEARCH_HOST']!;
  const meilisearchApiKey = config.meilisearchApiKey ?? process.env['MEILISEARCH_API_KEY']!;

  const meilisearch: MeilisearchAdapter = createMeilisearchAdapter({
    host: meilisearchHost,
    apiKey: meilisearchApiKey,
  });

  const llm: LLMAdapter = createLLMAdapter({
    groqApiKey: config.groqApiKey ?? process.env['GROQ_API_KEY']!,
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
