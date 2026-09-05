/**
 * Credit Concurrency Tests — TD-01 Acceptance Gate.
 *
 * Tests that credit operations enforce balance invariants:
 * - Balance never goes negative
 * - Second reserve fails when balance insufficient
 * - Release restores balance
 * - Commit finalizes deduction
 * - assertInTransaction guard prevents misuse
 *
 * This is the S0-3 acceptance gate from the Deployment Readiness Program.
 */
import { describe, it, expect, vi } from 'vitest';
import * as creditRepository from '@mushin/database/repositories/credit.repository';

// Helper: create a mock db that passes assertInTransaction
function createMockDb(opts: {
  selectResult?: unknown[];
  executeResults?: unknown[][];
} = {}) {
  let executeCallIndex = 0;
  const executeResults = opts.executeResults ?? [opts.selectResult ?? []];

  return {
    $client: { sql: () => {} },
    execute: vi.fn().mockImplementation(async () => {
      const result = executeResults[executeCallIndex] ?? executeResults[executeResults.length - 1] ?? [];
      executeCallIndex++;
      return result;
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(opts.selectResult ?? []),
        }),
      }),
    }),
  };
}

describe('Credit Concurrency (TD-01 Acceptance Gate)', () => {
  describe('reserveCredits atomicity', () => {
    it('should succeed when balance is sufficient', async () => {
      const mockDb = createMockDb({
        executeResults: [
          [{ balance: '10', version: 1 }],  // SELECT FOR UPDATE
          [],                                   // UPDATE
          [],                                   // INSERT ledger
        ],
      });

      const result = await creditRepository.reserveCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newBalance).toBe(5n);
        expect(result.version).toBe(2);
      }
    });

    it('should reject when balance is insufficient', async () => {
      const mockDb = createMockDb({
        executeResults: [
          [{ balance: '3', version: 1 }],  // SELECT FOR UPDATE — only 3 credits
        ],
      });

      const result = await creditRepository.reserveCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('insufficient_balance');
        expect(result.shortfall).toBe(2n);
      }
    });

    it('should never allow balance to go negative', async () => {
      const mockDb = createMockDb({
        executeResults: [
          [{ balance: '0', version: 1 }],  // SELECT FOR UPDATE — zero balance
        ],
      });

      const result = await creditRepository.reserveCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.shortfall).toBe(5n);
      }
    });

    it('should succeed when balance equals reserve amount', async () => {
      const mockDb = createMockDb({
        executeResults: [
          [{ balance: '5', version: 1 }],  // SELECT FOR UPDATE
          [],                                   // UPDATE
          [],                                   // INSERT ledger
        ],
      });

      const result = await creditRepository.reserveCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newBalance).toBe(0n);
      }
    });

    it('should fail when no balance row exists', async () => {
      const mockDb = createMockDb({
        executeResults: [[]],  // SELECT FOR UPDATE — no row
      });

      const result = await creditRepository.reserveCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(false);
    });

    it('second reserve should fail after first consumes all credits', async () => {
      // First reserve: 5 credits, 5 balance
      const mockDb1 = createMockDb({
        executeResults: [
          [{ balance: '5', version: 1 }],
          [],
          [],
        ],
      });

      const result1 = await creditRepository.reserveCredits(
        mockDb1 as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );
      expect(result1.success).toBe(true);

      // Second reserve: 5 credits, 0 balance (simulating stale read prevented by FOR UPDATE)
      const mockDb2 = createMockDb({
        executeResults: [
          [{ balance: '0', version: 2 }],  // After first reserve, balance is 0
        ],
      });

      const result2 = await creditRepository.reserveCredits(
        mockDb2 as any, 'ws-001', 5n, 'reveal_contact', 'ref-002',
      );
      expect(result2.success).toBe(false);
    });
  });

  describe('Balance consistency', () => {
    it('releaseCredits should restore balance', async () => {
      const mockDb = createMockDb({
        executeResults: [
          [{ balance: '0', version: 2 }],  // SELECT FOR UPDATE
          [],                                   // UPDATE (balance + 5)
          [],                                   // INSERT ledger
        ],
      });

      const result = await creditRepository.releaseCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newBalance).toBe(5n);
      }
    });

    it('commitCredits should finalize deduction', async () => {
      const mockDb = createMockDb({
        selectResult: [{ balance: 0n, version: 2 }],
      });

      const result = await creditRepository.commitCredits(
        mockDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('reserve → commit cycle maintains balance invariant', async () => {
      // Reserve: 10 → 5
      const reserveDb = createMockDb({
        executeResults: [
          [{ balance: '10', version: 1 }],
          [],
          [],
        ],
      });
      const reserveResult = await creditRepository.reserveCredits(
        reserveDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );
      expect(reserveResult.success).toBe(true);

      // Commit: balance stays at 5, ledger records committed
      const commitDb = createMockDb({
        selectResult: [{ balance: 5n, version: 2 }],
      });
      const commitResult = await creditRepository.commitCredits(
        commitDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );
      expect(commitResult.success).toBe(true);
    });

    it('reserve → release cycle restores balance', async () => {
      // Reserve: 10 → 5
      const reserveDb = createMockDb({
        executeResults: [
          [{ balance: '10', version: 1 }],
          [],
          [],
        ],
      });
      const reserveResult = await creditRepository.reserveCredits(
        reserveDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );
      expect(reserveResult.success).toBe(true);

      // Release: 5 → 10
      const releaseDb = createMockDb({
        executeResults: [
          [{ balance: '5', version: 2 }],
          [],
          [],
        ],
      });
      const releaseResult = await creditRepository.releaseCredits(
        releaseDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001',
      );
      expect(releaseResult.success).toBe(true);
      if (releaseResult.success) {
        expect(releaseResult.newBalance).toBe(10n);
      }
    });
  });

  describe('Transaction guard (TD-04)', () => {
    it('assertInTransaction should reject null db', async () => {
      const { assertInTransaction } = await import('@mushin/database/repositories/credit.repository');
      expect(() => assertInTransaction(null as any)).toThrow('db must be a Drizzle database instance');
    });

    it('assertInTransaction should reject undefined db', async () => {
      const { assertInTransaction } = await import('@mushin/database/repositories/credit.repository');
      expect(() => assertInTransaction(undefined as any)).toThrow('db must be a Drizzle database instance');
    });

    it('assertInTransaction should reject non-object db', async () => {
      const { assertInTransaction } = await import('@mushin/database/repositories/credit.repository');
      expect(() => assertInTransaction('not-a-db' as any)).toThrow('db must be a Drizzle database instance');
    });

    it('assertInTransaction should reject object without $client', async () => {
      const { assertInTransaction } = await import('@mushin/database/repositories/credit.repository');
      expect(() => assertInTransaction({} as any)).toThrow('does not appear to be a Drizzle instance');
    });

    it('assertInTransaction should reject object with $client but no sql method', async () => {
      const { assertInTransaction } = await import('@mushin/database/repositories/credit.repository');
      expect(() => assertInTransaction({ $client: {} } as any)).toThrow('does not appear to be a Drizzle instance');
    });

    it('assertInTransaction should pass for valid Drizzle-like object', async () => {
      const { assertInTransaction } = await import('@mushin/database/repositories/credit.repository');
      const mockDb = { $client: { sql: () => {} } };
      expect(() => assertInTransaction(mockDb as any)).not.toThrow();
    });

    it('reserveCredits should throw when called outside transaction', async () => {
      // Plain object without $client — guard should catch it
      const plainDb = { execute: async () => [], insert: () => ({ values: async () => ({}) }) };
      await expect(
        creditRepository.reserveCredits(plainDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001'),
      ).rejects.toThrow('assertInTransaction');
    });

    it('commitCredits should throw when called outside transaction', async () => {
      const plainDb = { execute: async () => [], insert: () => ({ values: async () => ({}) }) };
      await expect(
        creditRepository.commitCredits(plainDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001'),
      ).rejects.toThrow('assertInTransaction');
    });

    it('releaseCredits should throw when called outside transaction', async () => {
      const plainDb = { execute: async () => [], insert: () => ({ values: async () => ({}) }) };
      await expect(
        creditRepository.releaseCredits(plainDb as any, 'ws-001', 5n, 'reveal_contact', 'ref-001'),
      ).rejects.toThrow('assertInTransaction');
    });
  });
});
