---
type: operations
doc-id: 23
status: draft
created: "2026-07-05"
---

# Doc-23: Observability

## Overview

Logging, metrics, and tracing strategy for MUSHIN platform.

## Logging

- Structured JSON logs
- Log aggregation via Cloud Logging
- Retention: 30 days hot, 1 year cold

## Metrics

- **API** — Request rate, latency, error rate
- **Workers** — Job duration, success rate, queue depth
- **Database** — Query latency, connection pool, replication lag

## Tracing

- Distributed tracing via Cloud Trace
- Trace ID propagated through all services

## Alerts

- **P1** — Full outage, data loss
- **P2** — Degraded service, high error rate
- **P3** — Performance degradation, non-critical failures

## References

- [[06-Operations/Doc-22-Infrastructure|Infrastructure]]
- [[06-Operations/Doc-27-Incident-Response|Incident Response]]
- [[04-Functions/_Functions-MOC|Functions]]
- [[02-Database/_Database-MOC|Database]]
