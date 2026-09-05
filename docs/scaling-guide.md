# Scaling Guide — MUSHIN 2.0

## Current Architecture

### Database (Supabase Postgres)
- **Tables:** 18+ across 3 schemas (gcp, wp, platform)
- **Indexes:** IVFFlat for pgvector, composite indexes for common queries
- **RLS:** Enforced on all 11 WP tables
- **Partitioning:** credit_ledger_entry and interaction_timeline by month

### Search (Meilisearch Cloud)
- **Index:** Single global creator index (GCP plane)
- **Current capacity:** 50 concurrent users at P95 < 450ms
- **Scaling:** Auto-scaling available on Meilisearch Cloud

### Cache (Upstash Redis)
- **Usage:** Rate limiting, hot-path caching
- **Current:** Token bucket for rate limiting
- **Scaling:** Upstash scales automatically

### Queue (AWS SQS)
- **Queues:** 6 (outbox, DLQ, discovery-high, discovery-standard, rescore-low, erasure)
- **Scaling:** SQS scales automatically with message volume

---

## Scaling Strategies

### 1. Database Scaling

#### Current Bottlenecks
- High-read queries on creator table (search, similarity)
- Write contention on credit ledger (SELECT FOR UPDATE)
- Timeline queries spanning partitions

#### Optimization Steps

**Step 1: Index Optimization**
```sql
-- Verify index usage
EXPLAIN ANALYZE SELECT * FROM gcp.creator WHERE primary_niche = 'fashion';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_creator_platform_niche 
  ON gcp.creator (platform, primary_niche);

CREATE INDEX CONCURRENTLY idx_creator_followers 
  ON gcp.creator (follower_count DESC);
```

**Step 2: pgvector Index Migration**
```sql
-- Current: IVFFlat (good for < 1M rows)
-- Migration to HNSW for > 1M rows:

-- 1. Create HNSW index
CREATE INDEX CONCURRENTLY idx_creator_embedding_hnsw 
  ON gcp.creator USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- 2. Verify index
EXPLAIN ANALYZE 
  SELECT creator_id FROM gcp.creator 
  ORDER BY embedding <=> '[...]' LIMIT 10;

-- 3. Drop old IVFFlat index
DROP INDEX IF EXISTS idx_creator_embedding_ivfflat;
```

**Step 3: Connection Pooling**
```typescript
// Current: DATABASE_POOL_SIZE=10
// For production: Use PgBouncer or Supabase connection pooling
// Recommended: 20-50 connections per service instance
```

**Step 4: Read Replicas**
- Use Supabase read replicas for analytics queries
- Route read-heavy queries (search, analytics) to replicas
- Keep writes on primary

### 2. Search Scaling

#### Current State
- Meilisearch Cloud handles 50 concurrent users
- P95 latency < 450ms

#### Scaling Path

**Step 1: Index Optimization**
```json
{
  "filterableAttributes": ["platform", "primary_niche", "follower_count", "quality_score"],
  "sortableAttributes": ["follower_count", "quality_score", "engagement_rate"],
  "searchableAttributes": ["display_name", "primary_handle", "bio", "primary_niche"],
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": { "oneTypo": 4, "twoTypos": 8 }
  }
}
```

**Step 2: Caching Layer**
```typescript
// Cache hot search results in Redis
const SEARCH_CACHE_TTL = 300; // 5 minutes

async function cachedSearch(query: string, filters: Record<string, unknown>) {
  const cacheKey = `search:${hashQuery(query, filters)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const results = await meilisearch.search(query, filters);
  await redis.set(cacheKey, JSON.stringify(results), { ex: SEARCH_CACHE_TTL });
  return results;
}
```

**Step 3: Meilisearch Cluster**
- For > 100 concurrent users, consider Meilisearch cluster
- Or switch to self-hosted Meilisearch with read replicas

### 3. Redis Caching

#### Current State
- Upstash Redis for rate limiting
- Token has permission issues (SET blocked)

#### Scaling Path

**Step 1: Fix Redis Permissions**
- Contact Upstash support to enable SET permission
- Or use REST API for read-only operations

**Step 2: Implement Caching Layer**
```typescript
// packages/shared/src/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached as string);
  
  const result = await fetcher();
  await redis.set(key, JSON.stringify(result), { ex: ttl });
  return result;
}
```

**Step 3: Cache Invalidation**
- Use cache tags for related keys
- Implement TTL-based expiration
- Add cache warming for hot queries

### 4. Queue Scaling

#### Current State
- 6 SQS queues
- 3 event consumers + 2 scheduled jobs

#### Scaling Path

**Step 1: Worker Autoscaling**
```typescript
// Scale workers based on queue depth
const WORKER_SCALING_CONFIG = {
  'q-discovery-high': { min: 2, max: 10, scaleAt: 10 },
  'q-discovery-standard': { min: 1, max: 5, scaleAt: 50 },
  'q-rescore-low': { min: 1, max: 2, scaleAt: 100 },
};
```

**Step 2: Priority-Based Polling**
```typescript
// Weighted polling: high priority drained first
const POLL_WEIGHTS = {
  'q-discovery-high': 0.5,
  'q-discovery-standard': 0.3,
  'q-rescore-low': 0.2,
};
```

**Step 3: Dead Letter Queue Monitoring**
- Alert on DLQ depth > 0
- Implement DLQ redrive automation
- Track DLQ metrics for capacity planning

### 5. Horizontal Scaling

#### API Layer
- Deploy to Vercel with automatic scaling
- Each serverless function scales independently
- No state on API servers (stateless design)

#### Worker Layer
- Deploy to Railway/Fly.io with autoscaling
- Scale based on queue depth metrics
- Each worker processes one queue class

#### Database Layer
- Use Supabase connection pooling
- Read replicas for analytics
- Partitioning for time-series data

---

## Load Testing Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API P95 Latency | < 500ms | Unknown | Needs testing |
| API P99 Latency | < 1000ms | Unknown | Needs testing |
| Search P95 Latency | < 500ms | < 450ms | ✅ |
| Concurrent Users | 500 | 50 | Needs scaling |
| Queue Throughput | 100 msg/s | Unknown | Needs testing |
| Error Rate | < 1% | Unknown | Needs testing |

---

## Capacity Planning

### Current Capacity
- **Database:** 10 connections, ~1000 QPS
- **Search:** 50 concurrent users
- **Queue:** ~10 msg/s per worker
- **Cache:** 1000 ops/s (Upstash free tier)

### Scaling Triggers
- **Database:** > 80% connection usage → add read replica
- **Search:** > 80% CPU → scale Meilisearch cluster
- **Queue:** > 1000 messages depth → add workers
- **Cache:** > 80% memory → upgrade Upstash plan

---

## Cost Optimization

### Current Monthly Estimates
- **Supabase:** $25 (Pro plan)
- **Meilisearch Cloud:** $30
- **Upstash Redis:** $0 (free tier)
- **AWS SQS:** $0.40 per million requests
- **Vercel:** $0 (Hobby plan)

### Optimization Opportunities
1. **Meilisearch:** Use filterable attributes to reduce index size
2. **Redis:** Cache hot queries to reduce DB load
3. **SQS:** Batch messages to reduce API calls
4. **Database:** Use connection pooling to reduce connections

---

## Monitoring Checklist

- [ ] Database connection pool usage
- [ ] Query latency (p50, p95, p99)
- [ ] Index usage statistics
- [ ] Search latency and throughput
- [ ] Queue depth and processing rate
- [ ] Redis memory usage
- [ ] API error rates
- [ ] Cost tracking per provider
