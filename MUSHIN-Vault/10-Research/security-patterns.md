---
type: research
section: security
sources: [layers.txt, layers2.txt, layers3.txt]
---

# Security Patterns

## 1. Authentication (OIDC/JWT)

**Pattern:** Short-lived JWTs (15 min) with refresh token rotation. Service-to-service uses mTLS. Staff uses separate IdP with hardware MFA.

**MUSHIN Status:** ✅ Implemented — JWT/JWKS verification, workspace membership check.
**Code:** `packages/api/src/middleware/tenancy.ts`.
**Gap:** No refresh token rotation, no MFA for customers, staff IdP not configured.

## 2. RBAC & ABAC

**Pattern:** RBAC for coarse permissions, ABAC for fine-grained. Policies versioned in Git, tested in CI.

**MUSHIN Status:** ✅ Implemented — Staff RBAC with permission matrix per DOC-029.
**Code:** `packages/api/src/middleware/staff-rbac.ts`, `packages/shared/src/types/staff.ts`.
**ADR:** ADR-038.
**Gap:** No ABAC for customer roles. Customer RBAC is basic (Owner/Admin/Member/Viewer).

## 3. MFA

**Pattern:** WebAuthn as primary, TOTP as fallback. SMS prohibited for staff. Step-up auth for sensitive actions.

**MUSHIN Status:** ✅ Implemented — MFA validation for staff (WebAuthn for admin, TOTP for support).
**Code:** `packages/shared/src/types/mfa.ts`.
**Gap:** No MFA for customers. No step-up auth for billing changes.

## 4. Secret Management

**Pattern:** Vault as single source of truth. Secrets injected at runtime. Dynamic database credentials. Rotation automated.

**MUSHIN Status:** ⚠️ Partial — Secrets in environment variables. No Vault integration. No dynamic credentials.
**Gap:** No HashiCorp Vault. No secret rotation. No break-glass credentials.

## 5. Encryption

**Pattern:** TLS 1.3 everywhere. mTLS internally. AES-256 at rest. Column-level encryption for PII. Per-tenant CMKs.

**MUSHIN Status:** ⚠️ Partial — TLS via Vercel/Supabase. No column-level encryption. No per-tenant keys.
**Gap:** No C1 column-level encryption (DOC-021 §3.1). No field-level encryption for PII.

## 6. Audit Logs

**Pattern:** Immutable append-only for all actions. Shipped to SIEM. 7-year retention. Tamper detection.

**MUSHIN Status:** ✅ Implemented — Audit logging middleware with immutable records.
**Code:** `packages/api/src/middleware/audit-log.ts`, `packages/shared/src/types/audit.ts`.
**Gap:** No SIEM integration. No tamper detection. No customer-facing audit API.

## 7. Tenant Isolation

**Pattern:** RLS in DB as defense-in-depth. Per-tenant encryption keys. Per-tenant rate limits. Network policies.

**MUSHIN Status:** ✅ Implemented — RLS on all 11 WP tables. Workspace-scoped queries.
**Code:** `supabase/migrations/V005__rls_policies.sql`.
**Gap:** No per-tenant encryption keys. No network policies.

## 8. API Security

**Pattern:** OWASP Top 10. Schema validation. Per-endpoint rate limits. Payload size limits. API versioning.

**MUSHIN Status:** ⚠️ Partial — Rate limiting implemented. No schema validation. No payload size limits.
**Gap:** No Zod validation on API inputs. No payload size limits. No API versioning.

## 9. Supply Chain Security

**Pattern:** SBOM generation. Container scanning. Signed artifacts. Dependency pinning. Private registry.

**MUSHIN Status:** ⚠️ Partial — Gitleaks in CI. No SBOM. No container scanning. No signed artifacts.
**Gap:** No Trivy/Grype scanning. No Sigstore signing. No Renovate for dependency updates.

## 10. GDPR Compliance

**Pattern:** Right to erasure. Data residency. DPA. DPIA. DPO.

**MUSHIN Status:** ⚠️ Partial — ADR-025 defines erasure strategy. Not implemented.
**Gap:** No erasure endpoint. No erasure worker. No data residency controls.

## Related

- [[10-Research/Research-Insights-MOC|Research Insights MOC]]
- [[05-Security-Legal/DOC-021-Security-Privacy-Compliance|DOC-021]]
- [[08-Decisions/ADR-038-staff-rbac-implementation|ADR-038]]
