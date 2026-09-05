# Credential Setup Guide — MUSHIN 2.0

**Status:** Ready for execution
**Estimated time:** 2-4 hours

---

## Prerequisites

- Supabase account (project created)
- Paddle account (sandbox)
- AWS account
- Sentry account
- Axiom account
- Vercel account

---

## 1. Database (Supabase)

### Required
```bash
# From Supabase Dashboard → Settings → Database → Connection string
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

### Validation
```bash
psql "$DATABASE_URL" -c "SELECT 1"
```

### Notes
- Use pooler connection string (port 6543) for connection pooling
- Use direct connection (port 5432) for migrations only

---

## 2. Paddle (Billing)

### Required
```bash
# From Paddle Dashboard → Developer → API Keys
PADDLE_API_KEY="your-paddle-api-key"
PADDLE_WEBHOOK_SECRET="your-paddle-webhook-signing-secret"
PADDLE_ENVIRONMENT="sandbox"  # Change to "production" for live
```

### Validation
```bash
curl -H "Authorization: Bearer $PADDLE_API_KEY" \
  "https://sandbox-api.paddle.com/subscriptions?per_page=1"
```

### Notes
- Start with sandbox for testing
- Webhook URL: `https://your-domain.com/api/webhooks/paddle`
- Configure webhook in Paddle Dashboard → Developer → Webhooks

---

## 3. AWS (SQS)

### Required
```bash
# From AWS Console → IAM → Users → Create access key
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"

# Queue URLs (from SQS Console)
SQS_OUTBOX_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-outbox"
SQS_DLQ_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-dlq"
SQS_DISCOVERY_HIGH_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-discovery-high.fifo"
SQS_DISCOVERY_STANDARD_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-discovery-standard.fifo"
SQS_RESCORE_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-rescore-low"
SQS_ERASURE_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-erasure"
```

### Queue Creation
```bash
# Standard queues
aws sqs create-queue --queue-name mushin-outbox
aws sqs create-queue --queue-name mushin-dlq
aws sqs create-queue --queue-name mushin-rescore-low
aws sqs create-queue --queue-name mushin-erasure

# FIFO queues
aws sqs create-queue --queue-name mushin-discovery-high.fifo --attributes '{"FifoQueue":"true","ContentBasedDeduplication":"true"}'
aws sqs create-queue --queue-name mushin-discovery-standard.fifo --attributes '{"FifoQueue":"true","ContentBasedDeduplication":"true"}'
```

### Validation
```bash
aws sqs list-queues --region us-east-1
```

---

## 4. Sentry (Error Tracking)

### Required
```bash
# From Sentry Dashboard → Settings → Projects → Client Keys
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_AUTH_TOKEN="your-sentry-auth-token"
SENTRY_ORG="your-org"
SENTRY_PROJECT="mushin"
```

### Validation
```bash
curl -X POST "$SENTRY_DSN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","level":"info"}'
```

---

## 5. Axiom (Log Aggregation)

### Required
```bash
# From Axiom Dashboard → Settings → API Tokens
AXIOM_TOKEN="your-axiom-token"
AXIOM_DATASET="mushin-production"
```

### Validation
```bash
curl -X POST "https://api.axiom.co/v1/datasets/$AXIOM_DATASET/ingest" \
  -H "Authorization: Bearer $AXIOM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"test":"validation","timestamp":"2026-07-09T00:00:00Z"}]'
```

---

## 6. Vercel (Deployment)

### Required
```bash
# From Vercel Dashboard → Settings → Tokens
VERCEL_TOKEN="your-vercel-token"
VERCEL_ORG_ID="your-org-id"
VERCEL_PROJECT_ID="your-project-id"
```

### Validation
```bash
vercel whoami --token $VERCEL_TOKEN
```

---

## 7. Resend (Email)

### Required
```bash
# From Resend Dashboard → API Keys
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@mushin.app"
RESEND_FROM_ADDRESS="noreply@mushin.app"
RESEND_FROM_NAME="MUSHIN"
```

### Notes
- Verify sending domain in Resend Dashboard → Domains
- DNS records: SPF, DKIM, DMARC

### Validation
```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@mushin.app","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

---

## 8. Upstash Redis (Cache)

### Already Configured
```bash
UPSTASH_REDIS_REST_URL="https://boss-racer-79284.upstash.io"
UPSTASH_REDIS_REST_TOKEN="gQAAAAAAATW0AAIncDFhZjE4ODY3MjkwMTI0ZGE2YjUxMWYzOTBiNjBiNTBlY3AxNzkyODQ"
```

### Issue
- SET permission blocked
- Contact Upstash support or use REST API fallback

---

## Quick Validation Script

```bash
# Run all validations
npx tsx scripts/validate-credentials.ts
```

---

## Environment Separation

| Environment | DATABASE_URL | Paddle | SQS | Sentry |
|-------------|-------------|--------|-----|--------|
| Development | Local Supabase | Sandbox | Local dev | DSN only |
| Staging | Supabase staging | Sandbox | Staging queues | Staging project |
| Production | Supabase production | Production | Production queues | Production project |

---

## Post-Setup Checklist

- [ ] All 14 credentials validated
- [ ] Paddle webhook configured
- [ ] Resend domain verified
- [ ] AWS SQS queues created
- [ ] Sentry project created
- [ ] Axiom dataset created
- [ ] Vercel project configured
- [ ] Environment separation verified
