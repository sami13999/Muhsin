/**
 * Workspace repository unit tests.
 * Tests CRUD operations with real mock database assertions.
 */
import { describe, it, expect, vi } from 'vitest';
import * as workspaceRepo from '../repositories/workspace.repository.js';

vi.mock('../client.js', () => ({
  getDb: vi.fn(),
}));

describe('workspaceRepository', () => {
  it('should export findById function', () => {
    expect(typeof workspaceRepo.findById).toBe('function');
  });

  it('should export create function', () => {
    expect(typeof workspaceRepo.create).toBe('function');
  });

  it('should export addMember function', () => {
    expect(typeof workspaceRepo.addMember).toBe('function');
  });

  it('should export removeMember function', () => {
    expect(typeof workspaceRepo.removeMember).toBe('function');
  });

  it('should export getMembership function', () => {
    expect(typeof workspaceRepo.getMembership).toBe('function');
  });

  it('should export listUserWorkspaces function', () => {
    expect(typeof workspaceRepo.listUserWorkspaces).toBe('function');
  });

  describe('getMembership', () => {
    it('should return membership when user is member', async () => {
      const mockMembership = {
        membershipId: 'mem-001',
        workspaceId: 'ws-001',
        userId: 'user-001',
        role: 'owner',
        status: 'active',
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMembership]),
            }),
          }),
        }),
      };

      const result = await workspaceRepo.getMembership(mockDb as any, 'user-001', 'ws-001');

      expect(result).toBeDefined();
      expect(result?.role).toBe('owner');
      expect(result?.status).toBe('active');
    });

    it('should return null when user is not member', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await workspaceRepo.getMembership(mockDb as any, 'user-001', 'ws-001');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return workspace with member count', async () => {
      const mockWs = {
        workspaceId: 'ws-001',
        name: 'Test Workspace',
        slug: 'test',
        subscriptionPlanId: 'free',
      };

      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              limit: vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) return Promise.resolve([mockWs]); // workspace
                if (callCount === 2) return Promise.resolve([{ memberCount: 5 }]); // count
                return Promise.resolve([{ balance: 1000n }]); // balance
              }),
              then: vi.fn().mockImplementation((resolve) => {
                callCount++;
                if (callCount === 1) resolve([mockWs]);
                else if (callCount === 2) resolve([{ memberCount: 5 }]);
                else resolve([{ balance: 1000n }]);
              }),
            })),
          })),
        })),
      };

      const result = await workspaceRepo.findById(mockDb as any, 'ws-001');

      expect(result).toBeDefined();
      expect(result?.workspace.workspaceId).toBe('ws-001');
      expect(result?.memberCount).toBe(5);
      expect(result?.creditBalance).toBe(1000n);
    });

    it('should return null when workspace not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await workspaceRepo.findById(mockDb as any, 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
