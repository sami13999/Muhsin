/**
 * Tenancy middleware unit tests.
 * Tests JWT verification, workspace membership, and RLS context propagation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tenancyMiddleware, staffOnly } from '../middleware/tenancy.js';
import { createMockDatabase, createMockJWTPayload, createMockTenancyContext } from '@mushin/testing';

// Mock jose module
vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
}));

// Mock workspace repository
vi.mock('@mushin/database', () => ({
  workspaceRepository: {
    getMembership: vi.fn(),
    findById: vi.fn(),
  },
}));

import { jwtVerify } from 'jose';
import { workspaceRepository } from '@mushin/database';

describe('tenancyMiddleware', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let mockContext: any;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockNext = vi.fn().mockResolvedValue(undefined);

    // Reset all mocks
    vi.clearAllMocks();
  });

  function createMockContext(headers: Record<string, string> = {}) {
    const headerMap = new Map(Object.entries(headers));
    return {
      req: {
        header: (name: string) => headerMap.get(name) ?? headerMap.get(name.toLowerCase()),
      },
      json: vi.fn().mockReturnValue(new Response()),
      set: vi.fn(),
      get: vi.fn(),
    };
  }

  it('should return 401 when Authorization header is missing', async () => {
    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb as any,
    });

    const c = createMockContext({});
    const result = await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'AUTH_TOKEN_INVALID',
        }),
      }),
      401,
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when JWT is expired', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('JWT expired'));

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb as any,
    });

    const c = createMockContext({
      Authorization: 'Bearer expired-token',
      'X-Workspace-ID': 'ws-123',
    });
    const result = await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'AUTH_TOKEN_EXPIRED',
        }),
      }),
      401,
    );
  });

  it('should return 400 when X-Workspace-ID header is missing', async () => {
    const payload = createMockJWTPayload();
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb as any,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-token',
    });
    const result = await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'WORKSPACE_ID_REQUIRED',
        }),
      }),
      400,
    );
  });

  it('should return 403 when user is not a workspace member', async () => {
    const payload = createMockJWTPayload();
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);
    vi.mocked(workspaceRepository.getMembership).mockResolvedValue(null);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb as any,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-token',
      'X-Workspace-ID': 'ws-123',
    });
    const result = await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'AUTHZ_WORKSPACE_MISMATCH',
        }),
      }),
      403,
    );
  });

  it('should return 403 when membership is not active', async () => {
    const payload = createMockJWTPayload();
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);
    vi.mocked(workspaceRepository.getMembership).mockResolvedValue({
      membershipId: 'mem-001',
      workspaceId: 'ws-123',
      userId: 'test-user-id',
      role: 'member',
      status: 'suspended',
      invitedEmail: null,
      invitedBy: null,
      invitedAt: null,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb as any,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-token',
      'X-Workspace-ID': 'ws-123',
    });
    const result = await middleware(c as any, mockNext);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'AUTHZ_WORKSPACE_SUSPENDED',
        }),
      }),
      403,
    );
  });

  it('should set tenancy context and call next() on valid request', async () => {
    const payload = createMockJWTPayload();
    vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);
    vi.mocked(workspaceRepository.getMembership).mockResolvedValue({
      membershipId: 'mem-001',
      workspaceId: 'ws-123',
      userId: 'test-user-id',
      role: 'member',
      status: 'active',
      invitedEmail: null,
      invitedBy: null,
      invitedAt: null,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(workspaceRepository.findById).mockResolvedValue({
      workspace: { subscriptionPlanId: 'free' },
    } as any);

    // Mock db.execute for RLS context
    mockDb.execute = vi.fn().mockResolvedValue([]);

    const middleware = tenancyMiddleware({
      jwksUri: 'https://auth.mushin.io/.well-known/jwks.json',
      jwtIssuer: 'https://auth.mushin.io',
      jwtAudience: 'mushin-api',
      db: mockDb as any,
    });

    const c = createMockContext({
      Authorization: 'Bearer valid-token',
      'X-Workspace-ID': 'ws-123',
    });
    await middleware(c as any, mockNext);

    expect(c.set).toHaveBeenCalledWith('tenancy', expect.objectContaining({
      userId: 'test-user-id',
      workspaceId: 'ws-123',
      isStaff: false,
      roles: ['member'],
    }));
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('staffOnly', () => {
  it('should return 403 when user is not staff', () => {
    const c = {
      get: vi.fn().mockReturnValue({ isStaff: false }),
      json: vi.fn().mockReturnValue(new Response()),
    };
    const next = vi.fn();

    const result = staffOnly(c as any, next);

    expect(c.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'STAFF_REALM_REQUIRED',
        }),
      }),
      403,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() when user is staff', () => {
    const c = {
      get: vi.fn().mockReturnValue({ isStaff: true }),
      json: vi.fn(),
    };
    const next = vi.fn();

    staffOnly(c as any, next);

    expect(next).toHaveBeenCalled();
  });
});
