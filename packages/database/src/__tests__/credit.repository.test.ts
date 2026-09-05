/**
 * Credit repository unit tests.
 * Tests Reserve-Commit-Release pattern (ADR-026), reservation lifecycle (ADR-030).
 * Real behavioral assertions — verifies function signatures and basic logic.
 */
import { describe, it, expect, vi } from 'vitest';
import * as creditRepo from '../repositories/credit.repository.js';

describe('creditRepository', () => {
  describe('Core operations', () => {
    it('should export getBalance function', () => {
      expect(typeof creditRepo.getBalance).toBe('function');
    });

    it('should export reserveCredits function', () => {
      expect(typeof creditRepo.reserveCredits).toBe('function');
    });

    it('should export commitCredits function', () => {
      expect(typeof creditRepo.commitCredits).toBe('function');
    });

    it('should export releaseCredits function', () => {
      expect(typeof creditRepo.releaseCredits).toBe('function');
    });

    it('should export grantCredits function', () => {
      expect(typeof creditRepo.grantCredits).toBe('function');
    });

    it('should export expireCredits function', () => {
      expect(typeof creditRepo.expireCredits).toBe('function');
    });
  });

  describe('Reservation lifecycle (ADR-030)', () => {
    it('should export expireStaleReservations function', () => {
      expect(typeof creditRepo.expireStaleReservations).toBe('function');
    });

    it('should export getReservationStatus function', () => {
      expect(typeof creditRepo.getReservationStatus).toBe('function');
    });

    it('should export isReservationActive function', () => {
      expect(typeof creditRepo.isReservationActive).toBe('function');
    });
  });

  describe('getBalance', () => {
    it('should return balance and version from database', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                balance: 1000n,
                version: 5,
              }]),
            }),
          }),
        }),
      };

      const result = await creditRepo.getBalance(mockDb as any, 'ws-001');

      expect(result.balance).toBe(1000n);
      expect(result.version).toBe(5);
    });

    it('should return 0 balance when no row exists', async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      const result = await creditRepo.getBalance(mockDb as any, 'ws-001');

      expect(result.balance).toBe(0n);
      expect(result.version).toBe(0);
    });
  });

  describe('reserveCredits', () => {
    it('should return success with new balance when sufficient credits', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn()
          .mockResolvedValueOnce([{ balance: 1000n, version: 1 }])
          .mockResolvedValueOnce([]),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const result = await creditRepo.reserveCredits(
        mockDb as any, 'ws-001', 100n, 'discovery', 'job-001',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newBalance).toBe(900n);
        expect(result.version).toBe(2);
      }
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('should return failure when insufficient credits', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn().mockResolvedValueOnce([{ balance: 50n, version: 1 }]),
      };

      const result = await creditRepo.reserveCredits(
        mockDb as any, 'ws-001', 100n, 'discovery', 'job-001',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('insufficient_balance');
        expect(result.shortfall).toBe(50n);
      }
      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    it('should return failure when no balance row exists', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn().mockResolvedValueOnce([]),
      };

      const result = await creditRepo.reserveCredits(
        mockDb as any, 'ws-001', 100n, 'discovery', 'job-001',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('insufficient_balance');
      }
    });
  });

  describe('commitCredits', () => {
    it('should insert ledger entry and return current balance', async () => {
      // commitCredits calls insertLedgerEntry (db.insert) then getBalance (db.select)
      const mockDb = {
        $client: { sql: () => {} },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ balance: 900n, version: 2 }]),
            }),
          }),
        }),
      };

      const result = await creditRepo.commitCredits(mockDb as any, 'ws-001', 100n, 'discovery', 'job-001');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(900n);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('releaseCredits', () => {
    it('should update balance and insert ledger entry', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn()
          .mockResolvedValueOnce([{ balance: 900n, version: 1 }]) // SELECT FOR UPDATE
          .mockResolvedValueOnce([]), // UPDATE balance
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const result = await creditRepo.releaseCredits(mockDb as any, 'ws-001', 100n, 'discovery', 'job-001');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1000n);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('grantCredits', () => {
    it('should update balance and insert ledger entry', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn()
          .mockResolvedValueOnce([{ balance: 500n, version: 1 }]) // SELECT FOR UPDATE
          .mockResolvedValueOnce([]), // UPDATE balance
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const result = await creditRepo.grantCredits(mockDb as any, 'ws-001', 500n, 'allowance_grant', 'grant-001');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(1000n);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('expireCredits', () => {
    it('should update balance and insert ledger entry', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn()
          .mockResolvedValueOnce([{ balance: 500n, version: 1 }]) // SELECT FOR UPDATE
          .mockResolvedValueOnce([]), // UPDATE balance
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const result = await creditRepo.expireCredits(mockDb as any, 'ws-001', 100n, 'expiry');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(400n);
      expect(mockDb.execute).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('expireStaleReservations', () => {
    it('should find and release stale reservations', async () => {
      const mockDb = {
        $client: { sql: () => {} },
        execute: vi.fn()
          .mockResolvedValueOnce([{ reservation_id: 'res-001', workspace_id: 'ws-001', amount: 100n }]) // Find stale
          .mockResolvedValueOnce([]), // Release
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue([]),
        }),
      };

      const released = await creditRepo.expireStaleReservations(mockDb as any);

      expect(released).toBe(1);
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });
});
