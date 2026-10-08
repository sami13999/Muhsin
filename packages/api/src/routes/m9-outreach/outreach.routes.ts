/**
 * M9 Outreach — API Routes.
 * Source: Doc 9 (Outreach), ADR-029 (minor_signal gating), AGENTS.md
 */
import { Hono } from 'hono';
import type { TenancyContext } from '@mushin/shared';
import type { OutreachService, OutreachChannel } from '../../services/outreach.service.js';

export function createOutreachRoutes(outreachService: OutreachService): Hono {
  const routes = new Hono();

  /**
   * POST /outreach/messages
   * Dispatch outreach message via Email or WhatsApp.
   * Enforces minor_signal gating and channel entitlement.
   */
  routes.post('/outreach/messages', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const body = await c.req.json();

    const { creatorId, channel, subject, body: messageBody, templateId } = body ?? {};

    if (!creatorId || !channel || !messageBody) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'creatorId, channel, and body are required fields',
            request_id: requestId,
          },
        },
        400,
      );
    }

    if (channel !== 'email' && channel !== 'whatsapp') {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'channel must be either "email" or "whatsapp"',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const result = await outreachService.sendMessage({
      workspaceId: tenancy.workspaceId,
      creatorId,
      channel: channel as OutreachChannel,
      subject,
      body: messageBody,
      templateId,
      sentBy: tenancy.userId,
    });

    if (result.blocked) {
      return c.json(
        {
          error: {
            code: 'OUTREACH_BLOCKED',
            message: result.blockReason ?? 'Outreach blocked by system policy (minor_signal flag)',
            request_id: requestId,
          },
        },
        403,
      );
    }

    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'OUTREACH_FAILED',
            message: result.error ?? 'Failed to dispatch message',
            request_id: requestId,
          },
        },
        400,
      );
    }

    return c.json({
      data: {
        success: true,
        messageId: result.messageId,
      },
      meta: { request_id: requestId },
    });
  });

  /**
   * POST /outreach/sequences/:id/enroll
   * Enroll a creator in an automated outreach sequence.
   * Enforces minor_signal gating.
   */
  routes.post('/outreach/sequences/:id/enroll', async (c) => {
    const tenancy = c.get('tenancy') as TenancyContext;
    const requestId = c.get('requestId');
    const sequenceId = c.req.param('id');
    const body = await c.req.json();

    const { creatorId } = body ?? {};
    if (!creatorId) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'creatorId is required',
            request_id: requestId,
          },
        },
        400,
      );
    }

    const result = await outreachService.enrollInSequence(tenancy.workspaceId, creatorId, sequenceId);

    if (result.blocked) {
      return c.json(
        {
          error: {
            code: 'SEQUENCE_ENROLLMENT_BLOCKED',
            message: result.error ?? 'Sequence enrollment blocked for this creator',
            request_id: requestId,
          },
        },
        403,
      );
    }

    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'ENROLLMENT_FAILED',
            message: result.error ?? 'Failed to enroll creator in sequence',
            request_id: requestId,
          },
        },
        400,
      );
    }

    return c.json({
      data: {
        success: true,
        enrollmentId: result.enrollmentId,
      },
      meta: { request_id: requestId },
    });
  });

  return routes;
}
