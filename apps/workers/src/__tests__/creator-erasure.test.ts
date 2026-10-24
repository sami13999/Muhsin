/**
 * Creator Erasure Consumer & Meilisearch Sync Tests (Step 2B.2).
 * Verifies:
 * 1. Event consumption of CREATOR_ERASED using canonical creatorId.
 * 2. Idempotency on absent documents and repeated deliveries.
 * 3. Outbox guarantees: failures throw to prevent markEventProcessed.
 * 4. Worker integration: retry on transient failure, processed mark on success.
 * 5. PII sanitization: no sensitive data in logs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EVENT_TYPES } from '@mushin/events';
import { createCreatorErasureHandler } from '../handlers/creator-erasure.js';
import { EventWorker, type SQSClient, type SQSMessage } from '../worker.js';

describe('GDPR Erasure & Meilisearch Deletion Sync Handler (Step 2B.2)', () => {
  let mockMeilisearch: { deleteDocument: ReturnType<typeof vi.fn> };
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMeilisearch = {
      deleteDocument: vi.fn().mockResolvedValue({ status: 'success' }),
    };
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const baseEvent = {
    eventId: 'evt-gdpr-001',
    type: EVENT_TYPES.CREATOR_ERASED,
    schemaVersion: 1,
    scopeClass: 'GCP',
    workspaceId: null,
    actor: { type: 'staff', id: 'usr-admin-01' },
    correlationId: 'req-gdpr-corr-123',
    occurredAt: new Date(),
    payload: {
      creatorId: 'crt-canonical-uuid-999',
      reason: 'User right to be forgotten request under GDPR Article 17 with private health details',
      requestedBy: 'staff@mushin.app',
      erasedAt: new Date().toISOString(),
    },
  };

  it('subscribes to EVENT_TYPES.CREATOR_ERASED', () => {
    const handler = createCreatorErasureHandler(mockMeilisearch);
    expect(handler.eventTypes).toContain(EVENT_TYPES.CREATOR_ERASED);
    expect(handler.eventTypes).toContain('creator.erased');
  });

  it('deletes document from Meilisearch using canonical creatorId', async () => {
    const handler = createCreatorErasureHandler(mockMeilisearch);
    await handler.handle(baseEvent, {} as any);

    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledWith('crt-canonical-uuid-999');
  });

  it('supports snake_case creator_id payload while enforcing canonical key', async () => {
    const handler = createCreatorErasureHandler(mockMeilisearch);
    const snakeEvent = {
      ...baseEvent,
      payload: { creator_id: 'crt-canonical-snake-888' },
    };

    await handler.handle(snakeEvent as any, {} as any);

    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledWith('crt-canonical-snake-888');
  });

  it('CANONICAL KEY ENFORCEMENT: rejects payload missing creatorId without calling Meilisearch', async () => {
    const handler = createCreatorErasureHandler(mockMeilisearch);
    const brokenEvent = {
      ...baseEvent,
      payload: { id: 'crt-legacy-only', reason: 'Some reason' }, // Missing creatorId
    };

    await handler.handle(brokenEvent as any, {} as any);

    expect(mockMeilisearch.deleteDocument).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('CANONICAL KEY ENFORCEMENT: rejects empty or whitespace-only creatorId', async () => {
    const handler = createCreatorErasureHandler(mockMeilisearch);
    const emptyEvent = {
      ...baseEvent,
      payload: { creatorId: '   ' },
    };

    await handler.handle(emptyEvent as any, {} as any);

    expect(mockMeilisearch.deleteDocument).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('IDEMPOTENCY: succeeds without error when document was already deleted / absent', async () => {
    // When Meilisearch returns status 'success' for absent document (404 handled in adapter)
    mockMeilisearch.deleteDocument.mockResolvedValueOnce({ status: 'success' });

    const handler = createCreatorErasureHandler(mockMeilisearch);
    await expect(handler.handle(baseEvent, {} as any)).resolves.not.toThrow();

    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledWith('crt-canonical-uuid-999');
  });

  it('OUTBOX GUARANTEE & RETRY: throws Error when Meilisearch deletion fails with error status', async () => {
    mockMeilisearch.deleteDocument.mockResolvedValueOnce({
      status: 'error',
      error: 'Meilisearch service unavailable 503',
    });

    const handler = createCreatorErasureHandler(mockMeilisearch);

    await expect(handler.handle(baseEvent, {} as any)).rejects.toThrow(
      /Meilisearch document deletion failed for creatorId crt-canonical-uuid-999/,
    );
  });

  it('OUTBOX GUARANTEE & RETRY: throws Error when Meilisearch deletion is deferred (circuit open)', async () => {
    mockMeilisearch.deleteDocument.mockResolvedValueOnce({
      status: 'deletion_deferred',
      reason: 'Circuit breaker open (failures: 10)',
    });

    const handler = createCreatorErasureHandler(mockMeilisearch);

    await expect(handler.handle(baseEvent, {} as any)).rejects.toThrow(
      /Meilisearch document deletion deferred for creatorId crt-canonical-uuid-999/,
    );
  });

  it('PRIVACY AUDIT: logs never contain sensitive creator PII or request reasons', async () => {
    const handler = createCreatorErasureHandler(mockMeilisearch);
    await handler.handle(baseEvent, {} as any);

    // Collect all logged messages across log, error, and warn
    const allLogCalls = [
      ...logSpy.mock.calls.map((c) => String(c[0])),
      ...errorSpy.mock.calls.map((c) => String(c[0])),
      ...warnSpy.mock.calls.map((c) => String(c[0])),
    ];

    const joinedLogs = allLogCalls.join(' ');

    // Must NOT contain sensitive request reason or staff email
    expect(joinedLogs).not.toContain('private health details');
    expect(joinedLogs).not.toContain('staff@mushin.app');
    expect(joinedLogs).not.toContain('Article 17');

    // Canonical UUID and eventId are fine
    expect(joinedLogs).toContain('crt-canonical-uuid-999');
    expect(joinedLogs).toContain('evt-gdpr-001');
  });
});

describe('EventWorker & GDPR Erasure Integration (Step 2B.2)', () => {
  let mockDb: any;
  let mockSqs: SQSClient;
  let mockMeilisearch: { deleteDocument: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Not yet processed
        }),
      }),
      transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        });
      }),
    };

    mockSqs = {
      receiveMessages: vi.fn(),
      deleteMessage: vi.fn().mockResolvedValue(undefined),
    };

    mockMeilisearch = {
      deleteDocument: vi.fn().mockResolvedValue({ status: 'success' }),
    };
  });

  const sqsMessage: SQSMessage = {
    messageId: 'msg-sqs-001',
    receiptHandle: 'receipt-001',
    body: JSON.stringify({
      eventId: 'evt-gdpr-100',
      type: 'creator.erased',
      schemaVersion: 1,
      scopeClass: 'GCP',
      workspaceId: null,
      actor: { type: 'staff', id: 'usr-admin' },
      correlationId: 'corr-100',
      occurredAt: new Date().toISOString(),
      payload: {
        creatorId: 'crt-test-erased-456',
        reason: 'GDPR erasure request',
      },
    }),
  };

  it('processes creator.erased: calls deleteDocument, marks event processed, and deletes SQS message', async () => {
    mockSqs.receiveMessages = vi.fn().mockResolvedValue([sqsMessage]);

    const handler = createCreatorErasureHandler(mockMeilisearch);
    const worker = new EventWorker(
      {
        name: 'test-erasure-worker',
        queueUrl: 'https://sqs.mock/queue',
        batchSize: 1,
        visibilityTimeout: 30,
        waitTimeSeconds: 0,
      },
      mockSqs,
      mockDb,
      [handler],
    );

    const processed = await worker.poll();

    expect(processed).toBe(1);
    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledWith('crt-test-erased-456');
    // Marked processed in ledger via transaction
    expect(mockDb.transaction).toHaveBeenCalled();
    // Message deleted from SQS queue
    expect(mockSqs.deleteMessage).toHaveBeenCalledWith({
      queueUrl: 'https://sqs.mock/queue',
      receiptHandle: 'receipt-001',
    });
  });

  it('OUTBOX GUARANTEE ON FAILURE: transient Meilisearch error does NOT mark processed and does NOT delete SQS message', async () => {
    mockSqs.receiveMessages = vi.fn().mockResolvedValue([sqsMessage]);
    mockMeilisearch.deleteDocument.mockResolvedValueOnce({
      status: 'error',
      error: 'Connection reset by peer',
    });

    const handler = createCreatorErasureHandler(mockMeilisearch);
    const worker = new EventWorker(
      {
        name: 'test-erasure-worker',
        queueUrl: 'https://sqs.mock/queue',
        batchSize: 1,
        visibilityTimeout: 30,
        waitTimeSeconds: 0,
      },
      mockSqs,
      mockDb,
      [handler],
    );

    const processed = await worker.poll();

    expect(processed).toBe(0);
    expect(worker.getMetrics().failed).toBe(1);
    // CRITICAL: did NOT mark processed in ledger
    expect(mockDb.transaction).not.toHaveBeenCalled();
    // CRITICAL: did NOT delete message from SQS (SQS will retry after visibility timeout)
    expect(mockSqs.deleteMessage).not.toHaveBeenCalled();
  });

  it('IDEMPOTENCY: skips processing if event was already marked processed in ledger', async () => {
    mockSqs.receiveMessages = vi.fn().mockResolvedValue([sqsMessage]);
    // Simulate isEventProcessed returning true (already processed ledger row found)
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ eventId: 'evt-gdpr-100' }]),
      }),
    });

    const handler = createCreatorErasureHandler(mockMeilisearch);
    const worker = new EventWorker(
      {
        name: 'test-erasure-worker',
        queueUrl: 'https://sqs.mock/queue',
        batchSize: 1,
        visibilityTimeout: 30,
        waitTimeSeconds: 0,
      },
      mockSqs,
      mockDb,
      [handler],
    );

    const processed = await worker.poll();

    expect(processed).toBe(0);
    expect(worker.getMetrics().skipped).toBe(1);
    // Should NOT call deleteDocument again
    expect(mockMeilisearch.deleteDocument).not.toHaveBeenCalled();
    // Deletes redundant message from SQS
    expect(mockSqs.deleteMessage).toHaveBeenCalledWith({
      queueUrl: 'https://sqs.mock/queue',
      receiptHandle: 'receipt-001',
    });
  });

  it('LEDGER FAILURE & REDELIVERY: does NOT acknowledge SQS message if markEventProcessed fails; repeats deletion safely on redelivery', async () => {
    mockSqs.receiveMessages = vi.fn().mockResolvedValue([sqsMessage]);

    // First attempt: markEventProcessed fails (e.g. DB transaction deadlock on ledger write)
    mockDb.transaction = vi.fn().mockRejectedValueOnce(new Error('DB transaction deadlock on ledger'));

    const handler = createCreatorErasureHandler(mockMeilisearch);
    const worker = new EventWorker(
      {
        name: 'test-erasure-worker',
        queueUrl: 'https://sqs.mock/queue',
        batchSize: 1,
        visibilityTimeout: 30,
        waitTimeSeconds: 0,
      },
      mockSqs,
      mockDb,
      [handler],
    );

    // Poll 1: Meilisearch succeeds, but marking processed fails
    const processed1 = await worker.poll();

    expect(processed1).toBe(0);
    expect(worker.getMetrics().failed).toBe(1);
    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledTimes(1);
    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledWith('crt-test-erased-456');
    // CRITICAL: SQS message was NOT deleted/acknowledged!
    expect(mockSqs.deleteMessage).not.toHaveBeenCalled();

    // Poll 2: SQS redelivers the message after visibility timeout
    // Reset mockMeilisearch call count for clean assertion
    mockMeilisearch.deleteDocument.mockClear();

    // Second attempt: markEventProcessed succeeds
    mockDb.transaction = vi.fn().mockImplementationOnce(async (callback: any) => {
      return callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      });
    });

    const processed2 = await worker.poll();

    expect(processed2).toBe(1);
    expect(worker.getMetrics().processed).toBe(1);
    // Deletion repeats safely and idempotently without error
    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledTimes(1);
    expect(mockMeilisearch.deleteDocument).toHaveBeenCalledWith('crt-test-erased-456');
    // Now message IS acknowledged and deleted from SQS
    expect(mockSqs.deleteMessage).toHaveBeenCalledWith({
      queueUrl: 'https://sqs.mock/queue',
      receiptHandle: 'receipt-001',
    });
  });
});
