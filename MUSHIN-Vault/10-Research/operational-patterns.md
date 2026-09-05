---
type: research
section: operations
sources: [layers.txt, layers2.txt, layers3.txt]
---

# Operational Patterns

## 1. Admin & Staff Users

**Pattern:** Internal IdP separate from customer. Role-based access. JIT elevation with approval. All actions audit-logged.

**MUSHIN Status:** ✅ Implemented — Staff RBAC with admin/support roles. Audit logging. MFA validation.
**Code:** `packages/api/src/middleware/staff-rbac.ts`, `packages/api/src/middleware/audit-log.ts`.
**Gap:** No JIT elevation. No admin panel UI (scaffolded but not connected).

## 2. Support Tooling

**Pattern:** Customer 360 view. Impersonation with consent. Diagnostic tools. Feature flag override.

**MUSHIN Status:** ⚠️ Partial — Admin panel scaffolded. No real data queries. No impersonation.
**Gap:** No customer 360 view. No impersonation tooling. No diagnostic tools.

## 3. Billing Operations

**Pattern:** Double-entry ledger. Metering pipeline. Dispute handling. Refund authority tiers.

**MUSHIN Status:** ⚠️ Partial — Credit ledger with reserve/commit/release. No refund tooling. No dispute handling.
**Gap:** No admin billing UI. No refund API. No dispute workflow.

## 4. Incident Management

**Pattern:** Auto-create channels. IC role. Status page. Customer comms templates. Postmortem system.

**MUSHIN Status:** ❌ Not operationalized — DOC-027 defines process but no tools configured.
**Gap:** No PagerDuty. No incident channel templates. No status page. No PIR system.

## 5. Feature Flags

**Pattern:** LaunchDarkly/Unleash. Release, experiment, ops, permission flags. Kill switches.

**MUSHIN Status:** ❌ Not implemented — Unleash referenced in .env.example but not configured.
**Gap:** No feature flag system. No kill switches. No rollout capability.

## 6. Customer Success

**Pattern:** Health scores. Churn prediction. Usage dashboards. Onboarding checklists.

**MUSHIN Status:** ❌ Not implemented.
**Gap:** No customer health scoring. No churn prediction.

## 7. On-Call Rotation

**Pattern:** Weekly primary + secondary. Escalation path. Handoff checklist.

**MUSHIN Status:** ❌ Not configured — No PagerDuty. No rotation calendar.
**Gap:** No on-call system. No escalation matrix.

## Related

- [[10-Research/Research-Insights-MOC|Research Insights MOC]]
- [[06-Operations/DOC-027-Operational-Runbooks|DOC-027]]
- [[06-Operations/DOC-022-Infrastructure-Deployment|Infrastructure]]
