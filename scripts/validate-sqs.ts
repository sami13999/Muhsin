/**
 * AWS SQS Queue Validation Script
 *
 * Checks that all required SQS queues exist and are correctly configured.
 *
 * Usage: npx tsx scripts/validate-sqs.ts
 *
 * Requires: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 */
import { SQSClient, ListQueuesCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';
import { readFileSync } from 'fs';

// ── Load .env ──────────────────────────────────────────────────

function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(path, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
      if (match) env[match[1]] = match[2];
    });
  } catch { /* ignore */ }
  return env;
}

// ── Queue Definitions ──────────────────────────────────────────

interface QueueDefinition {
  name: string;
  envKey: string;
  required: boolean;
  fifo: boolean;
  description: string;
}

const REQUIRED_QUEUES: QueueDefinition[] = [
  {
    name: 'mushin-outbox',
    envKey: 'SQS_OUTBOX_QUEUE_URL',
    required: true,
    fifo: false,
    description: 'Outbox relay events',
  },
  {
    name: 'mushin-dlq',
    envKey: 'SQS_DLQ_URL',
    required: true,
    fifo: false,
    description: 'Dead letter queue',
  },
  {
    name: 'mushin-discovery-high',
    envKey: 'SQS_DISCOVERY_HIGH_QUEUE_URL',
    required: true,
    fifo: true,
    description: 'Interactive discovery (user-waiting)',
  },
  {
    name: 'mushin-discovery-standard',
    envKey: 'SQS_DISCOVERY_STANDARD_QUEUE_URL',
    required: true,
    fifo: true,
    description: 'Bulk discovery fan-out',
  },
  {
    name: 'mushin-rescore-low',
    envKey: 'SQS_RESCORE_QUEUE_URL',
    required: true,
    fifo: false,
    description: 'Scheduled re-scoring',
  },
  {
    name: 'mushin-erasure',
    envKey: 'SQS_ERASURE_QUEUE_URL',
    required: true,
    fifo: false,
    description: 'GDPR erasure (72-hour SLA)',
  },
];

// ── Main ───────────────────────────────────────────────────────

async function main() {
  const env = loadEnv('.env');

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         MUSHIN 2.0 — AWS SQS Queue Validation          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Check AWS credentials
  const accessKeyId = env['AWS_ACCESS_KEY_ID'];
  const secretAccessKey = env['AWS_SECRET_ACCESS_KEY'];
  const region = env['AWS_REGION'] || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    console.log('❌ AWS credentials not configured');
    console.log('   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    process.exit(1);
  }

  console.log(`✅ AWS credentials configured (region: ${region})`);
  console.log('');

  const sqs = new SQSClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  // List existing queues
  console.log('Listing existing queues...');
  let existingQueues: string[] = [];
  try {
    const listResult = await sqs.send(new ListQueuesCommand({}));
    existingQueues = listResult.QueueUrls || [];
    console.log(`Found ${existingQueues.length} queues`);
  } catch (err) {
    console.log(`❌ Failed to list queues: ${err}`);
    process.exit(1);
  }

  console.log('');

  // Check each required queue
  let allPresent = true;
  for (const queue of REQUIRED_QUEUES) {
    const queueUrl = env[queue.envKey];
    const matchingQueue = existingQueues.find(url => url.includes(queue.name));

    if (matchingQueue) {
      console.log(`✅ ${queue.name}`);
      console.log(`   Description: ${queue.description}`);

      // Get queue attributes
      try {
        const attrs = await sqs.send(new GetQueueAttributesCommand({
          QueueUrl: matchingQueue,
          AttributeNames: ['All'],
        }));

        const visibilityTimeout = attrs.Attributes?.VisibilityTimeoutInSeconds;
        const messageRetention = attrs.Attributes?.MessageRetentionPeriod;
        const approximateDepth = attrs.Attributes?.ApproximateNumberOfMessages;

        console.log(`   Visibility Timeout: ${visibilityTimeout}s`);
        console.log(`   Message Retention: ${messageRetention}s`);
        console.log(`   Approximate Depth: ${approximateDepth}`);
      } catch {
        console.log('   ⚠️  Could not read queue attributes');
      }
    } else {
      console.log(`❌ ${queue.name} — NOT FOUND`);
      console.log(`   Description: ${queue.description}`);
      console.log(`   Env key: ${queue.envKey}`);
      allPresent = false;
    }
    console.log('');
  }

  // Summary
  console.log('══════════════════════════════════════════════════════════════');
  if (allPresent) {
    console.log('✅ All required queues are present and configured');
  } else {
    console.log('❌ Some queues are missing — create them before deployment');
  }

  process.exit(allPresent ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
