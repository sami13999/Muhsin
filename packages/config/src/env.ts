import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().default(10),

  // Auth (Supabase)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Auth (JWT/JWKS — used by tenancy middleware)
  JWT_ISSUER: z.string().default('https://auth.mushin.io'),
  JWT_AUDIENCE: z.string().default('mushin-api'),
  JWKS_URI: z.string().url(),

  // AWS
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SQS_OUTBOX_QUEUE_URL: z.string().url().optional(),
  SQS_DLQ_URL: z.string().url().optional(),
  SQS_DISCOVERY_QUEUE_URL: z.string().url().optional(),
  SQS_RESCORE_QUEUE_URL: z.string().url().optional(),
  SQS_ERASURE_QUEUE_URL: z.string().url().optional(),

  // Meilisearch (Brain 1)
  MEILISEARCH_HOST: z.string().url(),
  MEILISEARCH_API_KEY: z.string(),

  // LLM — Groq (T-A)
  GROQ_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // External APIs
  SERPER_API_KEY: z.string().optional(),
  APIFY_TOKEN: z.string().optional(),

  // Billing (Paddle)
  PADDLE_API_KEY: z.string().optional(),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),

  // Idempotency
  IDEMPOTENCY_TTL_HOURS: z.coerce.number().default(24),

  // CORS
  CORS_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  _env = envSchema.parse(process.env);
  return _env;
}

export function getEnvSafe(): Partial<Env> {
  return envSchema.partial().parse(process.env);
}
