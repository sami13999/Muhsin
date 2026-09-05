# Alerting Rules — DOC-023 §4.2 compliant

## Severity Ladder

| Sev | Definition | Channel | Ack SLA |
|-----|------------|---------|---------|
| **Sev1** | Data breach, tenancy leak, ledger corruption, total outage | PagerDuty (page) | 15 min |
| **Sev2** | Credential leak, provider hard-down, payment/webhook pipeline stalled, erasure SLA breach imminent | PagerDuty (page) | 30 min |
| **Sev3** | Degraded pipeline, queue backlog, elevated error rates | Slack #mushin-alerts | Business hours |
| **Sev4** | Cost anomalies, quota trends, canary warnings | Slack digest | Weekly review |

## Alert Rules

### Sev1 (Critical)

| Alert | Threshold | Source |
|-------|-----------|--------|
| Cross-workspace access spike | `authz.workspace_mismatch` > 5 in 5 min from one principal | Security |
| Tenancy canary failure | Continuous tenancy probe fails | Security |
| Ledger anomaly | Balance reconciliation mismatch OR `ledger.lock_wait_ms` p99 > 2s | Billing |
| Total outage | API availability < 99% over 5 min | SLO |

### Sev2 (High)

| Alert | Threshold | Source |
|-------|-----------|--------|
| Webhook signature failures | > 10 in 5 min per source | Security |
| DLQ non-empty | `queue.dlq_depth` > 0 for > 1 min (prod queues) | Queue |
| Provider hard-down | Circuit breaker open on Paddle or LLM | Adapter |
| Erasure SLA breach | Tier 2 request open > 48h | Compliance |
| Outbox relay lag | Oldest unrelayed row > 5 min | Events |
| Burn rate paging | Error budget burn rate > 14.4 | SLO |

### Sev3 (Medium)

| Alert | Threshold | Source |
|-------|-----------|--------|
| Queue backlog | Depth > 1000 for > 5 min OR `oldest_message_age_s` > 900 | Queue |
| Sweeper rate elevated | `credits.swept` > 5/h | Billing |
| Projection retries | > 10/h OR any row pending > 1h | Pipeline |
| Provider error rate | `adapter.errors`/`adapter.calls` > 5% over 5 min | Adapter |
| Consent gate block spike | `consent.last_gate_blocks` > 20/h | Consent |

### Sev4 (Low)

| Alert | Threshold | Source |
|-------|-----------|--------|
| Cost anomalies | Non-runaway cost spikes | Cost |
| Quota trends | YouTube quota consumption trending up | Adapter |
| Canary warnings | Canary workspace anomalies | Ops |

## Dashboard Configuration

### Grafana Dashboards (Provisioned as Code)

1. **Cost & Margin Dashboard**
   - Per-provider spend (LLM, Apify, Serper)
   - Margin by action type
   - 3x COGS status band (green/amber/red)

2. **Queue & Pipeline Health Dashboard**
   - Per-class depth/age
   - DLQ status
   - Sweeper rate
   - Projection retry/heal rates
   - Outbox relay lag

3. **Provider Health Dashboard**
   - Per-adapter success rate
   - Latency percentiles (p50, p95, p99)
   - Circuit states
   - Quota headroom

4. **Security Posture Dashboard**
   - `authz.workspace_mismatch` timeline
   - Webhook signature failures
   - Refresh-token reuse detections
   - Impersonation session count
   - Erasure SLA tracker

## Metric cardinality rules

- `workspace_id` is NEVER a metric attribute (unbounded)
- Use bounded sets: `queue_class`, `adapter`, `module`, `job_type`, `error_code`
- Workspace-level analysis happens in logs/traces, not metrics

## Alert hygiene

- Every rule has an owning runbook link
- Any alert firing >3x in a week without action is tuned or deleted
- Noisy alerting is treated as an incident class
