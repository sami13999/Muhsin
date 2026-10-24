/**
 * Worker Lifecycle, Routing & Queue Verification Tests (Step 2B.2.2).
 * Verifies:
 * 1. Exactly one worker registration per configured queue URL.
 * 2. Dedicated regulatory erasure worker on SQS_ERASURE_QUEUE_URL.
 * 3. Safe fallback to single worker on SQS_OUTBOX_QUEUE_URL when erasure queue is omitted or identical.
 * 4. Graceful shutdown and in-flight drain behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWorkers } from '../bootstrap.js';
import { EventWorker, type SQSClient } from '../worker.js';

describe('Worker Lifecycle & Queue Registration (Step 2B.2.2)', () => {
  let mockSqs: SQSClient;
  let mockDb: any;
  let mockMeilisearch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSqs = {
      receiveMessages: vi.fn().mockResolvedValue([]),
      deleteMessage: vi.fn().mockResolvedValue(undefined),
    };
    mockDb = {
      select: vi.fn(),
      transaction: vi.fn(),
    };
    mockMeilisearch = {
      deleteDocument: vi.fn(),
    };
  });

  it('SINGLE QUEUE: registers exactly 1 worker on SQS_OUTBOX_QUEUE_URL with all handlers when SQS_ERASURE_QUEUE_URL is not set', () => {
    const workers = buildWorkers(
      {
        outboxQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
      },
      { sqs: mockSqs, db: mockDb, meilisearch: mockMeilisearch },
    );

    expect(workers).toHaveLength(1);
    const mainWorker = workers[0]!;
    expect((mainWorker as any).config.name).toBe('mushin-event-worker');
    expect((mainWorker as any).config.queueUrl).toBe(
      'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
    );
    // Main worker includes creator.erased handler for single-queue deployments
    expect((mainWorker as any).handlers.has('creator.erased')).toBe(true);
  });

  it('DEDICATED ERASURE QUEUE: registers exactly 2 distinct workers when SQS_ERASURE_QUEUE_URL is configured', () => {
    const workers = buildWorkers(
      {
        outboxQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
        erasureQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/q-erasure',
      },
      { sqs: mockSqs, db: mockDb, meilisearch: mockMeilisearch },
    );

    expect(workers).toHaveLength(2);

    const [mainWorker, erasureWorker] = workers;
    expect((mainWorker as any).config.name).toBe('mushin-event-worker');
    expect((mainWorker as any).config.queueUrl).toBe(
      'https://sqs.us-east-1.amazonaws.com/123/q-outbox-relay',
    );

    expect((erasureWorker as any).config.name).toBe('mushin-erasure-worker');
    expect((erasureWorker as any).config.queueUrl).toBe(
      'https://sqs.us-east-1.amazonaws.com/123/q-erasure',
    );
    // Dedicated erasure worker has erasure handler
    expect((erasureWorker as any).handlers.has('creator.erased')).toBe(true);
  });

  it('QUEUE DEDUPLICATION: does NOT create duplicate worker when erasureQueueUrl === outboxQueueUrl', () => {
    const sameQueueUrl = 'https://sqs.us-east-1.amazonaws.com/123/q-shared-events';
    const workers = buildWorkers(
      {
        outboxQueueUrl: sameQueueUrl,
        erasureQueueUrl: sameQueueUrl,
      },
      { sqs: mockSqs, db: mockDb, meilisearch: mockMeilisearch },
    );

    // Exactly 1 worker registered for the queue, preventing duplicate polling
    expect(workers).toHaveLength(1);
    expect((workers[0] as any).config.queueUrl).toBe(sameQueueUrl);
  });

  it('NO QUEUES CONFIGURED: returns 0 workers safely without throwing', () => {
    const workers = buildWorkers(
      {},
      { sqs: mockSqs, db: mockDb, meilisearch: mockMeilisearch },
    );

    expect(workers).toHaveLength(0);
  });

  it('GRACEFUL SHUTDOWN & DRAIN: stop() waits for in-flight messages to drain before resolving', async () => {
    let messageFinished = false;
    mockSqs.receiveMessages = vi.fn().mockResolvedValue([
      {
        messageId: 'msg-inflight-01',
        receiptHandle: 'handle-01',
        body: JSON.stringify({
          eventId: 'evt-01',
          type: 'creator.erased',
          payload: { creatorId: 'crt-test' },
        }),
      },
    ]);

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockMeilisearch.deleteDocument.mockImplementation(async () => {
      // Simulate 50ms async processing
      await new Promise((resolve) => setTimeout(resolve, 50));
      messageFinished = true;
      return { status: 'success' };
    });

    const [worker] = buildWorkers(
      { outboxQueueUrl: 'https://sqs.mock/queue' },
      { sqs: mockSqs, db: mockDb, meilisearch: mockMeilisearch },
    );

    worker!.start();

    // Trigger poll
    const pollPromise = worker!.poll();

    // Immediately call stop with drain timeout
    const stopPromise = worker!.stop(1000);

    await Promise.all([pollPromise, stopPromise]);

    expect(messageFinished).toBe(true);
    expect(worker!.getMetrics().isRunning).toBe(false);
  });
});
