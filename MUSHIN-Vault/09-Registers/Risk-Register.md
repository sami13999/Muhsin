---
type: register
section: risks
---

# Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner | Status |
|----|------|-----------|--------|------------|-------|--------|
| R-001 | Outreach dispatch is placeholder (no real email/WhatsApp sending) | Certain | CRITICAL — users cannot send outreach | Replace stub with real Resend adapter; implement WhatsApp via WABA | Engineering | open |
| R-002 | 54% of tests are stubs providing false confidence | Certain | HIGH — regressions undetected | Replace stubs with real assertions per DOC-024 | Engineering | open |
| R-003 | Missing production credentials (DATABASE_URL, Paddle, AWS, Sentry, Axiom) | Certain | HIGH — cannot deploy | Provision all credentials per validation script | Ops | open |
| R-004 | No DR backup/restore testing | High | HIGH — data loss unrecoverable | Execute quarterly DR drill per DOC-027 | Ops | open |
| R-005 | Upstash Redis SET permission blocked | High | MEDIUM — caching layer unusable | Contact Upstash support or use REST API fallback | Engineering | open |
| R-006 | A-032 Paddle Pakistan-entity onboarding unresolved | Medium | EXISTENTIAL — blocks billing | BillingProvider interface built provider-agnostic; monitor Paddle status | Business | open |
| R-007 | Analytics outreach metrics return zeros | Certain | MEDIUM — reporting inaccurate | Integrate with interaction_timeline | Engineering | open |
| R-008 | No Grafana dashboards provisioned | Certain | MEDIUM — blind operation | Create dashboard JSON, provision via CI | Ops | open |
| R-009 | No runbooks exist despite DOC-027 defining them | Certain | HIGH — incident response chaotic | Create 8 core runbooks per alert rules | Ops | open |
| R-010 | GDPR erasure not implemented | High | HIGH — legal non-compliance | Implement erasure endpoint + worker per ADR-025 | Engineering | open |
| R-011 | Cost circuit breaker not implemented (ADR-037) | Medium | MEDIUM — cost runaway uncontrolled | Implement per-workspace and per-provider breakers | Engineering | open |
| R-012 | ADR index out of sync (ADR-038, ADR-039 missing) | Certain | LOW — documentation drift | Update index | Engineering | open |
| R-013 | No incident response procedures operationalized | High | HIGH — chaotic incident handling | Create templates, escalation matrix, PIR process | Ops | open |
| R-014 | Entitlements hardcoded in tenancy middleware | Medium | LOW — plan changes require code deploy | Move to database-backed entitlements | Engineering | open |
| R-015 | No SAST/DAST in CI pipeline | Medium | MEDIUM — vulnerabilities undetected | Add Semgrep/ZAP to CI | Security | open |

## Related

- [[06-Operations/Doc-27-Incident-Response|Incident Response]]
- [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]
- [[09-Registers/Assumptions-Register|Assumptions Register]]
- [[09-Registers/Patch-Register|Patch Register]]
