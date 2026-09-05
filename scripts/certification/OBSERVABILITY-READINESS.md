# MUSHIN 2.0 — Observability Readiness Audit

**Date:** 2026-07-11
**Status:** Production observability stack design

---

## 1. Current State Assessment

### What Exists

| Component | Status | Evidence |
|-----------|--------|----------|
| Structured logging | **VERIFIED_CODE** | JSON output, C1/C2 redaction, correlation IDs |
| Health checks | **VERIFIED_RUNTIME** | Database + Meilisearch checks, liveness probe |
| Request ID propagation | **VERIFIED_CODE** | X-Request-ID header, UUID generation |
| Axiom transport | **VERIFIED_CODE** | HTTP POST to axiom.co, buffered writes |
| Sentry integration | **STUBBED** | Code exists but SDK commented out |

### What's Missing

| Component | Status | Impact |
|-----------|--------|--------|
| Metrics collection | **MISSING** | No Prometheus/StatsD |
| Distributed tracing | **MISSING** | No OpenTelemetry |
| Dashboards | **MISSING** | No Grafana |
| Alerting | **MISSING** | No PagerDuty/OpsGenie |
| Uptime monitoring | **MISSING** | No external health checks |
| Error tracking | **STUBBED** | Sentry not connected |

---

## 2. Recommended Production Stack

### Core Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| **Logs** | Axiom + Structured JSON | Centralized log aggregation |
| **Metrics** | Prometheus + Grafana | Time-series metrics and dashboards |
| **Traces** | OpenTelemetry + Jaeger | Distributed request tracing |
| **Errors** | Sentry | Error tracking and alerting |
| **Uptime** | Checkly or UptimeRobot | External health monitoring |
| **Alerts** | PagerDuty or OpsGenie | On-call alerting |

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                        MUSHIN API                           │
├─────────────────────────────────────────────────────────────┤
│  Request → Request ID → Handler → Response                  │
│     │         │            │          │                     │
│     ▼         ▼            ▼          ▼                     │
│  [Logs]   [Traces]    [Metrics]   [Errors]                 │
│     │         │            │          │                     │
│     ▼         ▼            ▼          ▼                     │
│  Axiom    Jaeger      Prometheus   Sentry                  │
│     │         │            │          │                     │
│     └─────────┴────────────┴──────────┘                     │
│                       │                                     │
│                       ▼                                     │
│                  Grafana Dashboards                         │
│                       │                                     │
│                       ▼                                     │
│                  PagerDuty Alerts                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Critical Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| API server down | Health check fails 3x | **PAGER** | Restart server, investigate |
| Database unreachable | Health check fails 2x | **PAGER** | Check Supabase status, failover |
| Meilisearch unreachable | Health check fails 3x | **WARNING** | Search degraded, investigate |
| Error rate > 5% | 5min window | **PAGER** | Investigate root cause |
| P99 latency > 2s | 5min window | **WARNING** | Investigate performance |
| Credit balance negative | Any occurrence | **PAGER** | Investigate ledger corruption |
| Webhook processing failures | > 10 in 5min | **WARNING** | Check Paddle connectivity |
| Worker heartbeat missed | > 5min | **WARNING** | Check worker process |

---

## 4. Warning Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Error rate > 1% | 15min window | **WARNING** | Monitor trend |
| P95 latency > 1s | 15min window | **WARNING** | Investigate slow queries |
| Meilisearch circuit open | Any occurrence | **WARNING** | Check Meilisearch health |
| LLM circuit open | Any occurrence | **WARNING** | Check Groq/Anthropic status |
| Redis fallback active | > 10min | **WARNING** | Check Redis connectivity |
| Disk usage > 80% | Any occurrence | **WARNING** | Clean up, expand |

---

## 5. Dashboard Metrics

### API Dashboard

| Metric | Description |
|--------|-------------|
| Request rate | Requests per second |
| Error rate | 4xx + 5xx per second |
| Latency (p50, p95, p99) | Response time distribution |
| Active connections | Current concurrent requests |
| Rate limit rejections | Per workspace |

### Business Dashboard

| Metric | Description |
|--------|-------------|
| Active workspaces | Workspaces with activity in 24h |
| Creator searches | Searches per hour |
| Credit consumption | Credits used per hour |
| New signups | Registrations per day |
| Subscription changes | Upgrades, downgrades, cancellations |

### Infrastructure Dashboard

| Metric | Description |
|--------|-------------|
| Database connections | Active connection pool |
| Database latency | Query response times |
| Meilisearch latency | Search response times |
| Meilisearch index size | Document count |
| Redis memory | Cache utilization |
| Queue depth | Pending events |

---

## 6. Implementation Priority

### Phase 1: MVP Launch (Week 1)

1. **Uncomment Sentry** — Enable error tracking
2. **Add Prometheus metrics** — Request rate, error rate, latency
3. **Configure Axiom** — Verify log ingestion
4. **Set up uptime monitoring** — External health checks

### Phase 2: Production Hardening (Week 2-3)

5. **Deploy Grafana** — Dashboards for API, business, infrastructure
6. **Configure alerting** — PagerDuty integration
7. **Add OpenTelemetry** — Distributed tracing
8. **Set up Jaeger** — Trace visualization

### Phase 3: Optimization (Week 4+)

9. **Custom business metrics** — Creator lookups, enrichment successes
10. **SLO monitoring** — Error budgets, burn rate
11. **Cost telemetry** — Per-action cost tracking
12. **Capacity planning** — Scaling thresholds

---

## 7. Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | 2-3 days | Sentry DSN, Axiom credentials |
| Phase 2 | 3-5 days | Grafana hosting, PagerDuty account |
| Phase 3 | 5-7 days | OpenTelemetry SDK integration |

**Total: 10-15 days**

---

## 8. Classification

| Component | Classification |
|-----------|---------------|
| Sentry (error tracking) | **MVP BLOCKER** |
| Uptime monitoring | **MVP BLOCKER** |
| Structured logging (Axiom) | **VERIFIED_CODE** |
| Prometheus metrics | **LAUNCH RECOMMENDED** |
| Grafana dashboards | **LAUNCH RECOMMENDED** |
| OpenTelemetry tracing | **POST-MVP** |
| PagerDuty alerting | **LAUNCH RECOMMENDED** |
| Custom business metrics | **POST-MVP** |
