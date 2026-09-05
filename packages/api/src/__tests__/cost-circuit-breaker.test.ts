/**
 * Cost Circuit Breaker tests — ADR-037 compliant.
 * Tests per-workspace and per-provider cost tracking.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkWorkspaceCost,
  checkProviderCost,
  getWorkspaceCircuit,
  getProviderCircuit,
  emitCostEvent,
  resetCircuitBreakers,
} from '@mushin/shared';

describe('Cost Circuit Breaker (ADR-037)', () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });

  describe('Per-Workspace Circuit', () => {
    it('should allow costs under threshold', () => {
      const { allowed } = checkWorkspaceCost('ws-001', 'free', 1.0);

      expect(allowed).toBe(true);
    });

    it('should track cumulative costs', () => {
      checkWorkspaceCost('ws-001', 'free', 1.0);
      checkWorkspaceCost('ws-001', 'free', 1.0);
      checkWorkspaceCost('ws-001', 'free', 1.0);

      const circuit = getWorkspaceCircuit('ws-001');
      expect(circuit).toBeDefined();
      expect(circuit!.totalCostUsd).toBe(3.0);
    });

    it('should open circuit when cost exceeds 5x threshold', () => {
      // Free tier threshold is $5, so 5x = $25
      for (let i = 0; i < 26; i++) {
        checkWorkspaceCost('ws-001', 'free', 1.0);
      }

      const circuit = getWorkspaceCircuit('ws-001');
      expect(circuit!.status).toBe('open');
    });

    it('should block requests when circuit is open', () => {
      // Open the circuit
      for (let i = 0; i < 26; i++) {
        checkWorkspaceCost('ws-001', 'free', 1.0);
      }

      const { allowed } = checkWorkspaceCost('ws-001', 'free', 1.0);
      expect(allowed).toBe(false);
    });

    it('should use correct threshold per plan tier', () => {
      // Starter tier threshold is $25, so 5x = $125
      for (let i = 0; i < 25; i++) {
        checkWorkspaceCost('ws-001', 'starter', 1.0);
      }

      // Should still be allowed (under $125)
      const { allowed } = checkWorkspaceCost('ws-001', 'starter', 1.0);
      expect(allowed).toBe(true);
    });

    it('should isolate workspaces', () => {
      // Use up ws-001's budget
      for (let i = 0; i < 26; i++) {
        checkWorkspaceCost('ws-001', 'free', 1.0);
      }

      // ws-002 should still be allowed
      const { allowed } = checkWorkspaceCost('ws-002', 'free', 1.0);
      expect(allowed).toBe(true);
    });
  });

  describe('Per-Provider Circuit', () => {
    it('should allow costs under threshold', () => {
      const { allowed } = checkProviderCost('llm', 1.0);

      expect(allowed).toBe(true);
    });

    it('should track cumulative costs', () => {
      checkProviderCost('llm', 10.0);
      checkProviderCost('llm', 10.0);
      checkProviderCost('llm', 10.0);

      const circuit = getProviderCircuit('llm');
      expect(circuit).toBeDefined();
      expect(circuit!.totalCostUsd).toBe(30.0);
    });

    it('should open circuit when cost exceeds threshold', () => {
      // LLM threshold is $50
      for (let i = 0; i < 6; i++) {
        checkProviderCost('llm', 10.0);
      }

      const circuit = getProviderCircuit('llm');
      expect(circuit!.status).toBe('open');
    });

    it('should block requests when circuit is open', () => {
      // Open the circuit
      for (let i = 0; i < 6; i++) {
        checkProviderCost('llm', 10.0);
      }

      const { allowed } = checkProviderCost('llm', 1.0);
      expect(allowed).toBe(false);
    });

    it('should isolate providers', () => {
      // Use up llm's budget
      for (let i = 0; i < 6; i++) {
        checkProviderCost('llm', 10.0);
      }

      // apify should still be allowed
      const { allowed } = checkProviderCost('apify', 1.0);
      expect(allowed).toBe(true);
    });
  });

  describe('Cost Event Emission', () => {
    it('should emit cost event without error', () => {
      expect(() => {
        emitCostEvent({
          provider: 'llm',
          workspaceId: 'ws-001',
          costUsd: 0.01,
          operation: 'enrichment',
          timestamp: new Date(),
        });
      }).not.toThrow();
    });

    it('should track costs from emitted events', () => {
      for (let i = 0; i < 10; i++) {
        emitCostEvent({
          provider: 'llm',
          workspaceId: 'ws-001',
          costUsd: 1.0,
          operation: 'enrichment',
          timestamp: new Date(),
        });
      }

      const workspaceCircuit = getWorkspaceCircuit('ws-001');
      expect(workspaceCircuit!.totalCostUsd).toBe(10.0);

      const providerCircuit = getProviderCircuit('llm');
      expect(providerCircuit!.totalCostUsd).toBe(10.0);
    });
  });
});
