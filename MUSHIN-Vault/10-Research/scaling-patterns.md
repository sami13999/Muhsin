---
type: research
section: scaling
sources: [layers.txt, layers2.txt, layers3.txt]
---

# Scaling Patterns

## Growth Stages (from Research)

### Stage 1: 100 Users / <10k entities
- Single region, monolithic DB, single search instance
- No caching needed
- Cost: $500-2K/month
- **MUSHIN Status:** Current stage. Single region, Supabase Postgres, Meilisearch Cloud.

### Stage 2: 1,000 Users / ~100k entities
- Add Redis cache, read replicas, separate search cluster
- Start multi-AZ
- Cost: $5K-20K/month
- **MUSHIN Status:** Partially ready — Redis exists (permission issues), read replicas available on Supabase.

### Stage 3: 10,000 Users / 1M entities
- Sharded search indices, model batching, queue with DLQ
- Tenant-level rate limits, dedicated auth service
- Multi-region for availability
- Cost: $40K-100K/month
- **MUSHIN Status:** Not ready — no sharding, no multi-region.

### Stage 4: 100,000 Users / 10M entities
- Database horizontal sharding, async replication
- Caching with fault-tolerant design
- AI inference pooled across regions
- Cost: $300K-1M/month
- **MUSHIN Status:** Not ready.

## Current Bottlenecks

| Bottleneck | Current State | Research Recommendation |
|-----------|---------------|------------------------|
| Database connections | 10 pool size | Add PgBouncer, increase to 50 |
| Search latency at scale | Tested to 50 users | Meilisearch Cloud auto-scaling or cluster |
| Queue throughput | Unknown | Measure with load test |
| Redis permissions | SET blocked | Fix or use REST API fallback |
| No read replicas | Single Supabase instance | Enable Supabase read replicas |
| No CDN | Vercel edge only | Add Cloudflare for static assets |

## Capacity Planning Triggers

| Metric | Trigger | Action |
|--------|---------|--------|
| DB connections | >80% usage | Add read replica |
| Search CPU | >80% | Scale Meilisearch cluster |
| Queue depth | >1000 messages | Add workers |
| Redis memory | >80% | Upgrade Upstash plan |
| API error rate | >1% | Investigate + scale |

## Related

- [[10-Research/Research-Insights-MOC|Research Insights MOC]]
- [[06-Operations/DOC-022-Infrastructure-Deployment|Infrastructure]]
- [[docs/scaling-guide|Scaling Guide]]
