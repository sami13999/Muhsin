/**
 * Rate Limiting Middleware Unit Tests
 *
 * Tests sliding window counter rate limiting with in-memory fallback.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimitMiddleware, resetRateLimitState, getRateLimitMetrics } from '../middleware/rate-limit.js';

// Mock jose module (required by tenancy middleware)
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    resetRateLimitState();
    vi.clearAllMocks();
  });

  function createMockContext(workspaceId = 'test-workspace') {
    const headers = new Map<string, string>();
    return {
      req: {
        header: (name: string) => headers.get(name),
      },
      json: vi.fn().mockReturnValue(new Response()),
      set: vi.fn(),
      get: vi.fn().mockReturnValue({
        workspaceId,
        userId: 'test-user',
        isStaff: false,
        roles: ['member'],
      }),
      header: vi.fn(),
    };
  }

  describe('Basic functionality', () => {
    it('should allow requests under the limit', async () => {
      const middleware = rateLimitMiddleware({ windowMs: 60000, maxRequests: 5 });
      const c = createMockContext();
      const next = vi.fn().mockResolvedValue(undefined);

      await middleware(c as any, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block requests over the limit', async () => {
      const middleware = rateLimitMiddleware({ windowMs: 60000, maxRequests: 2 });
      const next = vi.fn().mockResolvedValue(undefined);

      // First two requests should pass
      const c1 = createMockContext();
      await middleware(c1 as any, next);
      expect(next).toHaveBeenCalledTimes(1);

      const c2 = createMockContext();
      await middleware(c2 as any, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third request should be blocked
      const c3 = createMockContext();
      await expect(middleware(c3 as any, next)).rejects.toThrow('Too many requests');
    });

    it('should set rate limit headers', async () => {
      const middleware = rateLimitMiddleware({ windowMs: 60000, maxRequests: 10 });
      const c = createMockContext();
      const next = vi.fn().mockResolvedValue(undefined);
      const headerFn = vi.fn();

      c.header = headerFn;

      await middleware(c as any, next);

      expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
      expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
      expect(headerFn).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    });
  });

  describe('Workspace isolation', () => {
    it('should track rate limits per workspace', async () => {
      const middleware = rateLimitMiddleware({ windowMs: 60000, maxRequests: 1 });
      const next = vi.fn().mockResolvedValue(undefined);

      // Workspace A uses its limit
      const cA = createMockContext('workspace-a');
      await middleware(cA as any, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Workspace A is now blocked
      const cA2 = createMockContext('workspace-a');
      await expect(middleware(cA2 as any, next)).rejects.toThrow('Too many requests');
      expect(next).toHaveBeenCalledTimes(1);

      // Workspace B should still be allowed
      const cB = createMockContext('workspace-b');
      await middleware(cB as any, next);
      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Feature flag', () => {
    it('should skip rate limiting when disabled', async () => {
      const middleware = rateLimitMiddleware({ enabled: false });
      const next = vi.fn().mockResolvedValue(undefined);

      // Multiple requests should all pass
      for (let i = 0; i < 100; i++) {
        const c = createMockContext();
        await middleware(c as any, next);
      }

      expect(next).toHaveBeenCalledTimes(100);
    });

    it('should skip rate limiting when env var is false', async () => {
      process.env['RATE_LIMIT_ENABLED'] = 'false';
      const middleware = rateLimitMiddleware();
      const next = vi.fn().mockResolvedValue(undefined);

      for (let i = 0; i < 100; i++) {
        const c = createMockContext();
        await middleware(c as any, next);
      }

      expect(next).toHaveBeenCalledTimes(100);
      delete process.env['RATE_LIMIT_ENABLED'];
    });
  });

  describe('Window reset', () => {
    it('should reset counter after window expires', async () => {
      const middleware = rateLimitMiddleware({ windowMs: 100, maxRequests: 1 });
      const next = vi.fn().mockResolvedValue(undefined);

      // Use up the limit
      const c1 = createMockContext();
      await middleware(c1 as any, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Should be blocked
      const c2 = createMockContext();
      await expect(middleware(c2 as any, next)).rejects.toThrow('Too many requests');

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      const c3 = createMockContext();
      await middleware(c3 as any, next);
      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe('Metrics', () => {
    it('should track memory store size', () => {
      const metrics = getRateLimitMetrics();
      expect(metrics.memoryStoreSize).toBe(0);
    });
  });

  describe('Anonymous users', () => {
    it('should use "anonymous" key when no workspace', async () => {
      const middleware = rateLimitMiddleware({ windowMs: 60000, maxRequests: 1 });
      const next = vi.fn().mockResolvedValue(undefined);

      const c = createMockContext();
      c.get = vi.fn().mockReturnValue(null); // No tenancy

      await middleware(c as any, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
