# MUSHIN Security Policy

*Draft status: first-draft template for attorney/security review. `REVIEW_REQUIRED` appears more densely in this document than the others for a specific reason: a Security Policy that describes controls as active when they're actually only designed is a misrepresentation risk, not just an imprecise draft. Confirm current operational status of every section below before publishing.*

**Last updated:** [DATE]

---

## 1. Data Isolation

Customer data is isolated at the database level: each workspace's data is scoped by database-enforced row-level security policies, not application logic alone. `REVIEW_REQUIRED: confirm RLS coverage is complete across all tables and that the application/middleware layer enforcing tenancy context is actually deployed and active before stating this as a live control.`

## 2. Encryption

Sensitive credentials (e.g., connected mailbox authentication tokens) are stored using envelope encryption rather than in plaintext. Data in transit is encrypted via TLS. `REVIEW_REQUIRED: confirm encryption-at-rest coverage extends to all sensitive-data columns, not only the ones specifically named here.`

## 3. Access Controls

Staff access to production data is role-based and logged. `REVIEW_REQUIRED: confirm the audit-logging middleware is actually registered and active — architecturally designed and operationally active are not the same claim, and this document should only state the latter.`

## 4. Authentication

Customer accounts are protected by [password + REVIEW_REQUIRED: confirm current MFA status — do not state MFA is available unless it is actually implemented and offered].

## 5. Vulnerability Management

`REVIEW_REQUIRED: this section should describe an actual practice (dependency scanning cadence, patch timelines) — do not publish generic "we take security seriously" language without a real, followable process behind it.`

## 6. Incident Response

MUSHIN maintains internal runbooks for common failure and security scenarios. `REVIEW_REQUIRED: confirm an actual on-call/response process exists before describing incident response as operational, not just documented.`

## 7. Data Deletion

Deletion requests (Privacy Policy, Creator Data Usage Policy) are processed via [describe actual mechanism]. `REVIEW_REQUIRED: confirm the erasure mechanism's real behavior before publishing specifics.`

## 8. Subprocessors

See the Subprocessor List for security-relevant details of infrastructure providers.

## 9. Reporting a Vulnerability

Security researchers can report suspected vulnerabilities to [SECURITY EMAIL]. `REVIEW_REQUIRED: decide whether to formalize a safe-harbor/responsible-disclosure commitment before publishing this invitation — an open reporting channel without a stated safe harbor can create legal ambiguity for researchers acting in good faith.`

## 10. Contact

[SECURITY EMAIL]

---

*Next: Subprocessor List template.*
