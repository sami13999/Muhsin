---
type: operations
doc-id: 27
status: draft
created: "2026-07-05"
---

# Doc-27: Incident Response

## Overview

Incident management process for MUSHIN platform.

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| SEV1 | Critical — full outage | 15 min |
| SEV2 | Major — degraded service | 1 hour |
| SEV3 | Minor — non-critical | 4 hours |

## On-Call

- Primary and secondary on-call rotations
- Escalation path: On-call → Team lead → Engineering manager

## Runbooks

- [[06-Operations/runbooks/|Runbooks directory]]

## Post-Mortem Template

- Blameless post-mortems within 48 hours
- Action items tracked in [[09-Registers/Risk-Register|Risk Register]]

## References

- [[06-Operations/Doc-23-Observability|Observability]]
- [[06-Operations/Doc-22-Infrastructure|Infrastructure]]
- [[04-Functions/workers/outbox-relay|Outbox Relay]]
- [[04-Functions/workers/discovery-worker|Discovery Worker]]
- [[07-Quality-Standards/Doc-24-Testing-Strategy|Testing Strategy]]
