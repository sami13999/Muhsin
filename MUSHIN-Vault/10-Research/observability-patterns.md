---
type: research
section: observability
sources: [layers.txt, layers2.txt, layers3.txt]
---

# Observability Patterns

## Three Pillars + Two More

### 1. Metrics (RED + USE)

**Pattern:** RED (Rate, Errors, Duration) for services. USE (Utilization, Saturation, Errors) for resources. Golden Signals: Latency, Traffic, Errors, Saturation. Business metrics: active tenants, queries per tenant.

**MUSHIN Status:** ✅ Implemented — 20+ metric emitters covering credits, queues, adapters, jobs, security.
**Code:** `packages/shared/src/metrics.ts`.
**Gap:** No USE metrics for infrastructure. No business metrics (active tenants, revenue).

### 2. Logs (Structured JSON)

**Pattern:** Structured JSON with correlation ID, tenant ID, user ID. PII scrubbed. Hot 30 days, cold 1 year. 7-year for audit.

**MUSHIN Status:** ✅ Implemented — Structured JSON logger with C1/C2 redaction.
**Code:** `packages/shared/src/logger.ts`.
**Gap:** No log aggregation backend configured (Axiom token missing). No cold storage.

### 3. Traces (OpenTelemetry)

**Pattern:** OTel SDK in every service. 100% sampling for errors/slow. Tail-based sampling at collector.

**MUSHIN Status:** ❌ Not implemented — No OTel SDK. No distributed tracing.
**Gap:** No trace propagation across services. No Tempo/Jaeger.

### 4. Dashboards (Three Tiers)

**Pattern:** Executive (SLO, revenue), Service owner (RED, budget burn), On-call (alerts, deployments).

**MUSHIN Status:** ❌ Not implemented — No Grafana dashboards provisioned.
**Gap:** No dashboards exist. Metrics emitted but not visualized.

### 5. Alerts (Multi-level)

**Pattern:** Page (SLO burn, service down), Ticket (capacity trends), Info (deployments). Every alert has runbook.

**MUSHIN Status:** ⚠️ Partial — Alert rules documented in `docs/alerting-rules.md`. No runbooks linked.
**Gap:** No PagerDuty integration. No runbooks. No alert routing.

## SLIs / SLOs / Error Budgets

**Pattern:** SLI = proportion of requests meeting target. SLO = 99.9% monthly. Error budget = 0.1%. Budget exhausted → freeze feature launches.

**MUSHIN Status:** ✅ Implemented — SLO tracking with burn rate detection.
**Code:** `packages/shared/src/slo.ts`.
**Gap:** No error budget policy enforcement. No feature freeze mechanism.

## Runbooks

**Pattern:** Every alert links to runbook. Auto-generated templates. Step-by-step procedures. Stored in Git.

**MUSHIN Status:** ❌ Not implemented — Runbooks directory empty.
**Gap:** No runbooks exist despite DOC-027 defining template.

## Related

- [[10-Research/Research-Insights-MOC|Research Insights MOC]]
- [[06-Operations/DOC-023-Monitoring-Logging-Observability|DOC-023]]
- [[08-Decisions/ADR-039-observability-implementation|ADR-039]]
