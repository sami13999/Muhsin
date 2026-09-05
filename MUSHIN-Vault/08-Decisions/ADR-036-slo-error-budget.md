---
type: adr
status: Proposed
date: 2026-07-09
module: Operations
related_docs: ["DOC-023", "DOC-024"]
tags: [adr, slo, error-budget, reliability]
---

# ADR-036: SLO and Error Budget Policy

## Context

NFRs are scattered across DOC-024 and other documents. No unified SLO set or behavioral consequence when targets are missed.

## Decision

**Availability target:** 99.9% for API layer (standard for B2B SaaS at this stage).

**Latency targets:** Inherit DOC-024's per-endpoint NFRs — this ADR ties them together, not redefines them.

**Error budget:** Monthly budget derived from availability target. Burn-rate alert (monthly budget burned in <1 week) is a paging event.

**Behavioral consequence:** When error budget exhausted, new feature work for affected module pauses in favor of reliability work until budget resets.

## Implementation

- Dashboard: Grafana with SLO burn-rate panel
- Alerting: PagerDuty/Slack on burn-rate threshold
- Monthly review: team discusses budget status and reliability priorities

## Related

- [[07-Quality-Standards/DOC-024-Testing-Strategy-QA|DOC-024]]
- [[06-Operations/DOC-023-Monitoring-Logging-Observability|DOC-023]]
