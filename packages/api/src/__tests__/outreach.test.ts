/**
 * Outreach service unit tests.
 * CRITICAL: Tests minor_signal enforcement at point of send.
 * ADR-029, AGENTS.md Section 2 — gate must be tested, not just documented.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutreachService, createOutreachService } from '../services/outreach.service.js';
import { createMockDatabase } from '@mushin/testing';
import type { ResendAdapter } from '@mushin/adapters';

describe('OutreachService', () => {
  let service: OutreachService;
  let mockDb: ReturnType<typeof createMockDatabase>;
  let mockEmailAdapter: ResendAdapter;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockEmailAdapter = {
      sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
      health: vi.fn().mockResolvedValue({ status: 'healthy', latencyMs: 10, lastChecked: new Date().toISOString(), circuitStatus: 'closed' }),
      getCircuitStatus: vi.fn().mockReturnValue('closed'),
    } as unknown as ResendAdapter;
    service = createOutreachService(mockDb as any, mockEmailAdapter);
  });

  describe('sendMessage', () => {
    it('should call email adapter when channel is email', async () => {
      // Mock DB to return a creator with minor_signal = false and an email contact
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: false, display_name: 'Test Creator', primary_handle: '@test' }])
        .mockResolvedValueOnce([{ subscription_plan_id: 'free' }])
        .mockResolvedValueOnce([{ value: 'test@example.com' }]);

      const result = await service.sendMessage({
        workspaceId: 'ws-123',
        creatorId: 'c-456',
        channel: 'email',
        subject: 'Test Subject',
        body: '<p>Test body</p>',
      });

      expect(result.success).toBe(true);
      expect(mockEmailAdapter.sendEmail).toHaveBeenCalled();
    });

    it('should return blocked: true when minor_signal = true', async () => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: true, display_name: 'Minor Creator', primary_handle: '@minor' }]);

      const result = await service.sendMessage({
        workspaceId: 'ws-123',
        creatorId: 'c-456',
        channel: 'email',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockReason).toContain('minor_signal');
    });

    it('should return error when creator not found', async () => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([]);

      const result = await service.sendMessage({
        workspaceId: 'ws-123',
        creatorId: 'nonexistent',
        channel: 'email',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Creator not found');
    });

    it('should return error for WhatsApp channel (not yet implemented)', async () => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: false, display_name: 'Test', primary_handle: '@test' }])
        .mockResolvedValueOnce([{ subscription_plan_id: 'growth' }]);

      const result = await service.sendMessage({
        workspaceId: 'ws-123',
        creatorId: 'c-456',
        channel: 'whatsapp',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('WhatsApp');
    });
  });

  describe('revealContact', () => {
    it('should return contacts when minor_signal = false', async () => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: false }])
        .mockResolvedValueOnce([
          { contact_type: 'email', value: 'test@example.com' },
          { contact_type: 'phone', value: '+1234567890' },
        ]);

      const result = await service.revealContact('ws-123', 'c-456');

      expect(result.success).toBe(true);
      expect(result.contact).toEqual({
        email: 'test@example.com',
        phone: '+1234567890',
      });
    });

    it('should return blocked: true when minor_signal = true', async () => {
      // Mock DB to return creator with minor_signal = true
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: true }]);

      const result = await service.revealContact('ws-123', 'c-456');

      // The service should check minor_signal and return blocked
      // Even if the DB query returns minor_signal: true, the service should handle it
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });
  });

  describe('enrollInSequence', () => {
    it('should allow enrollment when minor_signal = false', async () => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: false }])
        .mockResolvedValue([]);

      const result = await service.enrollInSequence('ws-123', 'c-456', 'seq-789');

      expect(result.success).toBe(true);
      expect(result.enrollmentId).toBeDefined();
    });

    it('should return blocked: true when minor_signal = true', async () => {
      mockDb.execute = vi.fn()
        .mockResolvedValueOnce([{ minor_signal: true }]);

      const result = await service.enrollInSequence('ws-123', 'c-456', 'seq-789');

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });
  });
});
