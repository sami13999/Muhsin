/**
 * SQS Publisher & Queue Routing Unit Tests (Step 2B.2.1).
 * Verifies:
 * 1. Queue routing for creator.erased to q-erasure when configured.
 * 2. Safe fallback routing to q-outbox-relay when q-erasure is not configured.
 * 3. Error throwing when neither specific queue nor fallback queue is configured.
 * 4. Deduplication attributes and message body format.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SQSPublisher, type OutboxEvent } from '../index.js';

const mockSend = vi.fn().mockResolvedValue({ MessageId: 'msg-123' });

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  SendMessageCommand: vi.fn().mockImplementation((params) => params),
}));

describe('SQSPublisher & Outbox Queue Routing (Step 2B.2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleErasureEvent: OutboxEvent = {
    outboxId: 'obx-001',
    eventId: 'evt-erasure-uuid-1',
    eventType: 'creator.erased',
    schemaVersion: '1',
    scopeClass: 'gcp',
    workspaceId: null,
    actorType: 'staff',
    actorId: 'usr-admin-01',
    correlationId: 'req-corr-1',
    causationId: null,
    payload: {
      creatorId: 'crt-test-uuid-001',
      reason: 'GDPR Right to Erasure',
      requestedBy: 'usr-admin-01',
      erasedAt: new Date().toISOString(),
    },
    occurredAt: new Date(),
  };

  it('routes creator.erased to dedicated q-erasure queue when configured', async () => {
    const publisher = new SQSPublisher({
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      queueUrls: {
        'q-erasure': 'https://sqs.us-east-1.amazonaws.com/123/q-erasure',
        'q-outbox-relay': 'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
      },
    });

    await publisher.publish(sampleErasureEvent);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q-erasure',
        MessageGroupId: 'creator.erased',
        MessageDeduplicationId: 'evt-erasure-uuid-1',
      }),
    );
  });

  it('SAFE FALLBACK: routes creator.erased to q-outbox-relay when q-erasure is unconfigured', async () => {
    const publisher = new SQSPublisher({
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      queueUrls: {
        // q-erasure omitted intentionally
        'q-outbox-relay': 'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
      },
    });

    await publisher.publish(sampleErasureEvent);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
        MessageGroupId: 'creator.erased',
        MessageDeduplicationId: 'evt-erasure-uuid-1',
      }),
    );
  });

  it('ERROR: throws Error if neither specific queue nor fallback q-outbox-relay is configured', async () => {
    const publisher = new SQSPublisher({
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      queueUrls: {},
    });

    await expect(publisher.publish(sampleErasureEvent)).rejects.toThrow(
      /No queue URL configured for q-erasure/,
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('serializes canonical creatorId payload into SQS MessageBody', async () => {
    const publisher = new SQSPublisher({
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      queueUrls: {
        'q-outbox-relay': 'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
      },
    });

    await publisher.publish(sampleErasureEvent);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0]![0];
    const parsedBody = JSON.parse(callArgs.MessageBody);

    expect(parsedBody.eventId).toBe('evt-erasure-uuid-1');
    expect(parsedBody.eventType).toBe('creator.erased');
    expect(parsedBody.payload.creatorId).toBe('crt-test-uuid-001');
  });
});
