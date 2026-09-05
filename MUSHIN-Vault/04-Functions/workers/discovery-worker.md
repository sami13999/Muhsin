---
type: worker
name: discovery-worker
status: draft
created: "2026-07-05"
---

# Discovery Worker

## Purpose

Process creator discovery jobs by searching external platforms for creators matching specified criteria.

## Trigger

- Polls [[02-Database/tables/wp/wp.discovery-job|wp.discovery_job]] for queued jobs
- Polling interval: 10 seconds

## Processing Logic

1. Dequeue job from [[02-Database/tables/wp/wp.discovery-job|wp.discovery_job]] WHERE status = 'queued'
2. Reserve credits via [[02-Database/tables/wp/wp.credit-reservation|wp.credit_reservation]]
3. Search external platforms (YouTube, Instagram, TikTok)
4. Create/update creators in [[02-Database/tables/gcp/gcp.creator|gcp.creator]]
5. Update [[02-Database/tables/gcp/gcp.profile|gcp.profile]] with enrichment data
6. Create [[02-Database/tables/gcp/gcp.enrichment-snapshot|gcp.enrichment_snapshot]] for audit
7. Classify niches via [[02-Database/tables/gcp/gcp.niche-classification|gcp.niche_classification]]
8. Update job status and result count

## Tables Accessed

| Table | Access | Purpose |
|-------|--------|---------|
| [[02-Database/tables/wp/wp.discovery-job\|wp.discovery_job]] | Read/Write | Job queue |
| [[02-Database/tables/gcp/gcp.creator\|gcp.creator]] | Read/Write | Creator registry |
| [[02-Database/tables/gcp/gcp.profile\|gcp.profile]] | Write | Extended profile data |
| [[02-Database/tables/gcp/gcp.enrichment-snapshot\|gcp.enrichment_snapshot]] | Write | Enrichment history |
| [[02-Database/tables/gcp/gcp.niche-classification\|gcp.niche_classification]] | Write | Niche assignments |
| [[02-Database/tables/gcp/gcp.inflight-url-lock\|gcp.inflight_url_lock]] | Read/Write | Duplicate URL prevention |
| [[02-Database/tables/wp/wp.credit-reservation\|wp.credit_reservation]] | Write | Credit holds |

## Error Handling

- Max 5 retries with exponential backoff
- Failed jobs timeout after 5 minutes
- Dead letter status for exhausted retries
- Credit reservations released on failure

## Observability

- Logs: Job ID, status transitions, platform search results
- Metrics: Jobs processed, success rate, processing duration
- Alerts: High failure rate, queue depth exceeding threshold
