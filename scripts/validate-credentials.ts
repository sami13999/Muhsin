/**
 * Credential Provisioning Validation Script
 *
 * Checks all required credentials for MUSHIN 2.0 production deployment.
 * Reports: PRESENT, MISSING, PLACEHOLDER status for each credential.
 *
 * Usage: npx tsx scripts/validate-credentials.ts
 */
import { readFileSync } from 'fs';

// ── Load .env ──────────────────────────────────────────────────

function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(path, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
      if (match) {
        env[match[1]] = match[2];
      }
    });
  } catch {
    console.error(`Could not read ${path}`);
  }
  return env;
}

// ── Credential Definitions ─────────────────────────────────────

interface CredentialCheck {
  name: string;
  envKey: string;
  required: boolean;
  category: string;
  validate?: (value: string) => { valid: boolean; note?: string };
}

const CREDENTIALS: CredentialCheck[] = [
  // Database
  {
    name: 'DATABASE_URL',
    envKey: 'DATABASE_URL',
    required: true,
    category: 'Database',
    validate: (v) => ({
      valid: v.startsWith('postgresql://'),
      note: v.startsWith('postgresql://') ? undefined : 'Must be a PostgreSQL connection string',
    }),
  },
  {
    name: 'SUPABASE_URL',
    envKey: 'SUPABASE_URL',
    required: true,
    category: 'Database',
    validate: (v) => ({
      valid: v.includes('.supabase.co'),
      note: v.includes('.supabase.co') ? undefined : 'Must be a Supabase URL',
    }),
  },
  {
    name: 'SUPABASE_ANON_KEY',
    envKey: 'SUPABASE_ANON_KEY',
    required: true,
    category: 'Database',
    validate: (v) => ({
      valid: v.startsWith('eyJ'),
      note: v.startsWith('eyJ') ? undefined : 'Must be a JWT token',
    }),
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    envKey: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    category: 'Database',
    validate: (v) => ({
      valid: v.startsWith('eyJ'),
      note: v.startsWith('eyJ') ? undefined : 'Must be a JWT token',
    }),
  },

  // Auth
  {
    name: 'JWT_ISSUER',
    envKey: 'JWT_ISSUER',
    required: true,
    category: 'Auth',
  },
  {
    name: 'JWT_AUDIENCE',
    envKey: 'JWT_AUDIENCE',
    required: true,
    category: 'Auth',
  },
  {
    name: 'JWKS_URI',
    envKey: 'JWKS_URI',
    required: true,
    category: 'Auth',
    validate: (v) => ({
      valid: v.startsWith('https://'),
      note: v.startsWith('https://') ? undefined : 'Must be an HTTPS URL',
    }),
  },

  // Search
  {
    name: 'MEILISEARCH_HOST',
    envKey: 'MEILISEARCH_HOST',
    required: true,
    category: 'Search',
    validate: (v) => ({
      valid: v.startsWith('https://'),
      note: v.startsWith('https://') ? undefined : 'Must be an HTTPS URL',
    }),
  },
  {
    name: 'MEILISEARCH_API_KEY',
    envKey: 'MEILISEARCH_API_KEY',
    required: true,
    category: 'Search',
  },

  // AWS
  {
    name: 'AWS_ACCESS_KEY_ID',
    envKey: 'AWS_ACCESS_KEY_ID',
    required: true,
    category: 'AWS',
    validate: (v) => ({
      valid: v.startsWith('AKIA'),
      note: v.startsWith('AKIA') ? undefined : 'Must start with AKIA',
    }),
  },
  {
    name: 'AWS_SECRET_ACCESS_KEY',
    envKey: 'AWS_SECRET_ACCESS_KEY',
    required: true,
    category: 'AWS',
    validate: (v) => ({
      valid: v.length === 40,
      note: v.length === 40 ? undefined : 'Must be 40 characters',
    }),
  },
  {
    name: 'AWS_REGION',
    envKey: 'AWS_REGION',
    required: true,
    category: 'AWS',
  },
  {
    name: 'SQS_OUTBOX_QUEUE_URL',
    envKey: 'SQS_OUTBOX_QUEUE_URL',
    required: true,
    category: 'AWS',
    validate: (v) => ({
      valid: v.includes('sqs.'),
      note: v.includes('sqs.') ? undefined : 'Must be an SQS queue URL',
    }),
  },
  {
    name: 'SQS_DLQ_URL',
    envKey: 'SQS_DLQ_URL',
    required: true,
    category: 'AWS',
    validate: (v) => ({
      valid: v.includes('sqs.'),
      note: v.includes('sqs.') ? undefined : 'Must be an SQS queue URL',
    }),
  },

  // AI Providers
  {
    name: 'GROQ_API_KEY',
    envKey: 'GROQ_API_KEY',
    required: true,
    category: 'AI',
    validate: (v) => ({
      valid: v.startsWith('gsk_'),
      note: v.startsWith('gsk_') ? undefined : 'Must start with gsk_',
    }),
  },
  {
    name: 'ANTHROPIC_API_KEY',
    envKey: 'ANTHROPIC_API_KEY',
    required: false,
    category: 'AI',
  },

  // Discovery
  {
    name: 'SERPER_API_KEY',
    envKey: 'SERPER_API_KEY',
    required: true,
    category: 'Discovery',
  },
  {
    name: 'APIFY_TOKEN',
    envKey: 'APIFY_TOKEN',
    required: true,
    category: 'Discovery',
    validate: (v) => ({
      valid: v.startsWith('apify_api_'),
      note: v.startsWith('apify_api_') ? undefined : 'Must start with apify_api_',
    }),
  },
  {
    name: 'YOUTUBE_API_KEY',
    envKey: 'YOUTUBE_API_KEY',
    required: false,
    category: 'Discovery',
  },

  // Billing
  {
    name: 'PADDLE_API_KEY',
    envKey: 'PADDLE_API_KEY',
    required: true,
    category: 'Billing',
  },
  {
    name: 'PADDLE_WEBHOOK_SECRET',
    envKey: 'PADDLE_WEBHOOK_SECRET',
    required: true,
    category: 'Billing',
  },

  // Outreach
  {
    name: 'RESEND_API_KEY',
    envKey: 'RESEND_API_KEY',
    required: true,
    category: 'Outreach',
    validate: (v) => ({
      valid: v.startsWith('re_'),
      note: v.startsWith('re_') ? undefined : 'Must start with re_',
    }),
  },

  // Monitoring
  {
    name: 'SENTRY_DSN',
    envKey: 'SENTRY_DSN',
    required: true,
    category: 'Monitoring',
    validate: (v) => ({
      valid: v.includes('ingest.sentry.io'),
      note: v.includes('ingest.sentry.io') ? undefined : 'Must be a Sentry DSN',
    }),
  },
  {
    name: 'AXIOM_TOKEN',
    envKey: 'AXIOM_TOKEN',
    required: true,
    category: 'Monitoring',
  },
  {
    name: 'AXIOM_DATASET',
    envKey: 'AXIOM_DATASET',
    required: true,
    category: 'Monitoring',
  },

  // Deployment
  {
    name: 'VERCEL_TOKEN',
    envKey: 'VERCEL_TOKEN',
    required: true,
    category: 'Deployment',
  },
  {
    name: 'VERCEL_ORG_ID',
    envKey: 'VERCEL_ORG_ID',
    required: true,
    category: 'Deployment',
  },
  {
    name: 'VERCEL_PROJECT_ID',
    envKey: 'VERCEL_PROJECT_ID',
    required: true,
    category: 'Deployment',
  },

  // Cache
  {
    name: 'UPSTASH_REDIS_REST_URL',
    envKey: 'UPSTASH_REDIS_REST_URL',
    required: true,
    category: 'Cache',
    validate: (v) => ({
      valid: v.includes('upstash.io'),
      note: v.includes('upstash.io') ? undefined : 'Must be an Upstash URL',
    }),
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    envKey: 'UPSTASH_REDIS_REST_TOKEN',
    required: true,
    category: 'Cache',
  },
];

// ── Validation Logic ───────────────────────────────────────────

type Status = 'PRESENT' | 'MISSING' | 'PLACEHOLDER' | 'INVALID';

interface CheckResult {
  credential: CredentialCheck;
  value: string;
  status: Status;
  note?: string;
}

function checkCredential(env: Record<string, string>, cred: CredentialCheck): CheckResult {
  const value = env[cred.envKey] ?? '';

  if (!value || value === '' || value === '[YOUR-SECRET]') {
    return { credential: cred, value: '', status: cred.required ? 'MISSING' : 'PLACEHOLDER' };
  }

  if (cred.validate) {
    const result = cred.validate(value);
    if (!result.valid) {
      return { credential: cred, value: mask(value), status: 'INVALID', note: result.note };
    }
  }

  return { credential: cred, value: mask(value), status: 'PRESENT' };
}

function mask(value: string): string {
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

// ── Main ───────────────────────────────────────────────────────

function main() {
  const env = loadEnv('.env');

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       MUSHIN 2.0 — Credential Provisioning Audit       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const results = CREDENTIALS.map(cred => checkCredential(env, cred));

  // Group by category
  const categories = new Map<string, CheckResult[]>();
  for (const result of results) {
    const cat = result.credential.category;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(result);
  }

  let totalPresent = 0;
  let totalMissing = 0;
  let totalPlaceholder = 0;
  let totalInvalid = 0;

  for (const [category, checks] of categories) {
    console.log(`── ${category} ${'─'.repeat(50 - category.length)}`);

    for (const check of checks) {
      const icon = check.status === 'PRESENT' ? '✅' :
                   check.status === 'MISSING' ? '❌' :
                   check.status === 'PLACEHOLDER' ? '⚠️' : '🔴';

      const note = check.note ? ` (${check.note})` : '';
      console.log(`  ${icon} ${check.credential.name.padEnd(30)} ${check.status.padEnd(12)} ${check.value}${note}`);

      if (check.status === 'PRESENT') totalPresent++;
      else if (check.status === 'MISSING') totalMissing++;
      else if (check.status === 'PLACEHOLDER') totalPlaceholder++;
      else totalInvalid++;
    }
    console.log('');
  }

  // Summary
  console.log('══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  ✅ PRESENT:     ${totalPresent}`);
  console.log(`  ❌ MISSING:     ${totalMissing}`);
  console.log(`  ⚠️  PLACEHOLDER: ${totalPlaceholder}`);
  console.log(`  🔴 INVALID:     ${totalInvalid}`);
  console.log(`  📊 Total:       ${CREDENTIALS.length}`);
  console.log('');

  // Blockers
  const blockers = results.filter(r => r.status === 'MISSING' && r.credential.required);
  if (blockers.length > 0) {
    console.log('🚨 LAUNCH BLOCKERS (required credentials missing):');
    for (const b of blockers) {
      console.log(`   - ${b.credential.name} (${b.credential.category})`);
    }
    console.log('');
  }

  // Exit code
  const exitCode = blockers.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

main();
