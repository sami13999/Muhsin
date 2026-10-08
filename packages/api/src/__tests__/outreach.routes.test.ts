/**
 * M9 Outreach API contract tests.
 * Verifies email/WhatsApp dispatch endpoints, validation, and minor_signal gating.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createMockDatabase } from '@mushin/testing';
import type { TenancyContext } from '@mushin/shared';
import { createOutreachRoutes } from '../routes/m9-outreach/outreach.routes.js';
import type { OutreachService } from '../services/outreach.service.js';

describe('Outreach API Routes (Step 2)', () => {
  let app: Hono;
  let mockOutreachService: any;

  beforeEach(() => {
    mockOutreachService = {
      sendMessage: vi.fn(),
      enrollInSequence: vi.fn(),
    };

    app = new Hono();

    app.use('*', async (c, next) => {
      c.set('requestId', 'req-outreach-123');
      const tenancy: TenancyContext = {
        userId: 'usr-marketer-001',
        workspaceId: 'ws-123',
        creatorId: 'cr-001',
        isStaff: false,
        roles: ['admin'],
        claims: {
          iss: 'https://auth.mushin.app/',
          sub: 'usr-marketer-001',
          aud: 'mushin-api',
          exp: 9999999999,
          iat: 1000000000,
        },
      };
      c.set('tenancy', tenancy);
      await next();
    });

    app.route('/api/v1', createOutreachRoutes(mockOutreachService as unknown as OutreachService));
  });

  describe('POST /api/v1/outreach/messages', () => {
    it('should dispatch email message successfully', async () => {
      mockOutreachService.sendMessage.mockResolvedValue({
        success: true,
        messageId: 'msg-outreach-100',
      });

      const res = await app.request('/api/v1/outreach/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: 'c-101',
          channel: 'email',
          subject: 'Campaign Invitation',
          body: '<p>Join our summer campaign!</p>',
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.success).toBe(true);
      expect(json.data.messageId).toBe('msg-outreach-100');
    });

    it('should dispatch WhatsApp message successfully', async () => {
      mockOutreachService.sendMessage.mockResolvedValue({
        success: true,
        messageId: 'waba-msg-200',
      });

      const res = await app.request('/api/v1/outreach/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: 'c-102',
          channel: 'whatsapp',
          body: 'Hello! Would love to collaborate with you.',
        }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.success).toBe(true);
      expect(json.data.messageId).toBe('waba-msg-200');
    });

    it('should reject missing required fields with 400', async () => {
      const res = await app.request('/api/v1/outreach/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: 'c-101' }),
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 when minor_signal blocks outreach', async () => {
      mockOutreachService.sendMessage.mockResolvedValue({
        success: false,
        blocked: true,
        blockReason: 'Creator has minor_signal flag.',
      });

      const res = await app.request('/api/v1/outreach/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: 'c-minor',
          channel: 'email',
          body: 'Hello',
        }),
      });

      expect(res.status).toBe(403);
      const json = (await res.json()) as any;
      expect(json.error.code).toBe('OUTREACH_BLOCKED');
    });
  });

  describe('POST /api/v1/outreach/sequences/:id/enroll', () => {
    it('should enroll creator in sequence successfully', async () => {
      mockOutreachService.enrollInSequence.mockResolvedValue({
        success: true,
        enrollmentId: 'enroll-100',
      });

      const res = await app.request('/api/v1/outreach/sequences/seq-777/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: 'c-101' }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.data.success).toBe(true);
      expect(json.data.enrollmentId).toBe('enroll-100');
    });
  });
});
