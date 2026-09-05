---
type: register
section: assumptions
---

# Assumptions Register

| ID | Assumption | Impact if Wrong | Owner | Status | Validated |
|----|-----------|-----------------|-------|--------|-----------|
| A-001 | Upstash Redis supports SET operations for rate limiting and caching | Rate limiting falls back to in-memory only; no shared state across instances | Engineering | BLOCKED | No — SET permission blocked |
| A-002 | Paddle sandbox is sufficient for pre-production billing testing | Billing flow untested with real payment processing | Business | open | Partial — sandbox works but real webhooks differ |
| A-003 | Supabase PITR (Point-in-Time Recovery) is sufficient for DR | No cross-region failover; RPO limited to WAL retention | Ops | open | No — backup/restore not tested |
| A-004 | Meilisearch Cloud handles 500 concurrent users at P95 < 500ms | Search degraded under load;用户体验受损 | Engineering | open | Partial — tested to 50 users only |
| A-005 | Vercel serverless is suitable for API layer | Long-running Brain 2 pipeline work exceeds execution limits | Engineering | open | Yes — worker fleet deploys separately per DOC-022 §1.6 |
| A-006 | JWT issuer at auth.mushin.io is operational | All auth fails; no users can log in | Security | open | No — auth provider not configured |
| A-007 | Serper API has sufficient credits for discovery pipeline | Discovery pipeline fails; no new creators discovered | Engineering | BLOCKED | No — no credits |
| A-008 | Resend sending domain (mushin.app) is verified | Transactional emails not delivered | Engineering | open | No — domain not verified |
| A-009 | AWS SQS queues are provisioned and accessible | Event delivery fails; outbox relay cannot publish | Ops | BLOCKED | No — no AWS credentials |
| A-010 | Staff JWT claims include role and amr fields | MFA validation and RBAC cannot function | Security | open | No — auth provider not configured |

## Related

- [[09-Registers/Risk-Register|Risk Register]]
- [[09-Registers/Patch-Register|Patch Register]]
- [[08-Decisions/_ADR-Index|ADR Index]]
