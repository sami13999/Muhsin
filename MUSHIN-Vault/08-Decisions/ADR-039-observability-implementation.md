---
type: adr
status: Accepted
date: 2026-07-09
module: Operations
related_docs: ["DOC-023", "ADR-036"]
tags: [adr, observability, metrics, slo, health-checks]
---

# ADR-039: Observability Implementation

## Context

DOC-023 defines the observability stack with metrics, logging, tracing, and alerting. ADR-036 defines SLO and error budget policy. Implementation needed to provide the foundation for production monitoring.

## Decision

### Metrics Collection
- In-memory metric store with flush-to-logger pattern
- 20+ metric emitters covering credits, queues, adapters, jobs, security, consent, outbox
- Bounded-cardinality attributes only (no workspace_id as metric attribute)
- Naming convention: `mushin.<domain>.<metric>`

### SLO Tracking
- 99.9% availability target for API layer
- Error budget calculation: 43.2 minutes/month downtime allowed
- Burn rate detection: >14.4x triggers paging alert (budget exhausted in <1 week)
- Latency percentiles tracked (p50, p95, p99)

### Health Checks
- Liveness check (process running)
- Readiness check (dependencies available)
- Component checks (database, Redis, queue depth)
- Aggregated status: healthy/degraded/unhealthy

### Alerting Rules
- 4 severity levels (Sev1-Sev4)
- Canonical alert set per DOC-023 §4.2
- Dashboard configuration documented

## Consequence

- Observability foundation is in place for production deployment
- Metrics can be exported to Grafana Cloud via OTel when configured
- SLO tracking enables error budget management per ADR-036
- Health checks enable load balancer integration

## Implementation

- `packages/shared/src/metrics.ts` — metric collection
- `packages/shared/src/slo.ts` — SLO tracking
- `packages/shared/src/health.ts` — health checks
- `docs/alerting-rules.md` — alerting configuration

## Related

- [[06-Operations/DOC-023-Monitoring-Logging-Observability|DOC-023]]
- [[08-Decisions/ADR-036-slo-error-budget|ADR-036]]
