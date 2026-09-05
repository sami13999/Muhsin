# Document 25: Engineering Standards & Code Review Guidelines

**Status:** 🟡 Draft — Pending Approval
**Phase:** 8
**Depends on:** Doc 19 (Schema), Doc 20 (API), Doc 21 (Security), Doc 22 (Infrastructure), Doc 23 (Observability), Doc 24 (Testing)
**Governing ADRs:** ADR-017, ADR-019, ADR-020, ADR-022, ADR-026, ADR-028

---

## 1. Code Style & Formatting

### 1.1 Language & Toolchain

- **TypeScript everywhere** — monolith (Next.js) and worker fleet share one repo, one `tsconfig` base, one dependency graph (modular monolith, ADR-017). `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` are non-negotiable; `any` requires an inline justification comment and is lint-flagged.
- **Formatting is not reviewed — it is enforced.** Prettier (default config + 100-char width) runs on pre-commit and CI; a formatting diff in review is a tooling bug, never a discussion.
- **ESLint config layers:** base (typescript-eslint recommended-strict) + MUSHIN custom rules, which encode prior documents' invariants as lint:
  - `mushin/no-raw-sql` — string-built SQL banned (Doc 21 §4)
  - `mushin/no-advisory-session-lock` — Doc 22 §1.2 ban (allowlist: sweeper's `pg_try_advisory_xact_lock`)
  - `mushin/no-cross-plane-join` — query text joining `gcp.*` to `wp.*` outside the bridge repository (PATCH-001)
  - `mushin/metric-attribute-allowlist` — closed attribute sets, no `workspace_id` in metrics (Doc 23 R-OBS-003)
  - `mushin/no-c1-in-logs` — C1 field-name denylist in logger call sites (Doc 21 §3.1)
  - `mushin/adapter-import-boundary` — adapter classes importable only in worker-plane entry points (Doc 21 §3.2 IAM invariant mirrored at compile time)

### 1.2 Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Modules | `M<number>-<name>` directories | `modules/m5-discovery/` |
| Files | kebab-case | `credit-reservation.service.ts` |
| Types/classes | PascalCase; suffixes `Service`, `Repository`, `Adapter`, `Handler` | `LedgerRepository` |
| Functions/vars | camelCase; booleans prefixed `is/has/can` | `canSettleReservation` |
| DB entities | snake_case, singular tables (per Doc 19) | `workspace_creator_link` |
| Queue classes | `q-<domain>-<priority>` (Doc 22 §1.3) | `q-rescore-low` |
| Metrics | `mushin.<domain>.<metric>` (Doc 23 §2.1) | `mushin.credits.swept` |
| Error codes | Doc 20 catalogue families | `AUTHZ_WORKSPACE_MISMATCH` |
| Env vars | `MUSHIN_<SCOPE>_<NAME>` | `MUSHIN_LLM_API_KEY` |

**IDs:** prefixed ULIDs throughout (`wsp_`, `usr_`, `crt_`, `job_`, `rsv_`) — matching Doc 19/20; the prefix makes log lines and support tickets self-describing.

### 1.3 Comments & Documentation

- JSDoc required on: exported functions of every module's public surface, all adapter methods (documenting which ADR-022 obligation each satisfies), and any function marked `@TenancyExempt` (justification mandatory, reviewed).
- **Comment rule:** comments explain *why*, never *what*. A comment restating the code is deleted in review; a missing comment on non-obvious concurrency or ADR-driven behavior is a review blocker. Every workaround references its ticket or risk ID (`// R-INF-001: single-txn lock discipline`).

---

## 2. Git Workflow & Branching Strategy

- **Trunk-based:** `main` is always deployable (Doc 22 §6 pipeline). No long-lived develop branch, no release branches at S1/S2 — Vercel immutable deploys + worker image pinning provide rollback (Doc 24 §10.3); release branches add ceremony without benefit at our cadence.
- **Branch naming:** `feat/<module>-<slug>`, `fix/<module>-<slug>`, `hotfix/<slug>`, `chore/<slug>`, `migration/<slug>` (migration-only branches get extra CI gates, §5).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `perf:`, `refactor:`, `test:`, `chore:`, `migration:`) with module scope: `feat(m7-outreach): jumu'ah window boundary handling`. Enforced by commitlint. Changelog is generated, never hand-written.
- **MR process:**
  - MR template auto-populates the four review checklists (§3) as checkboxes plus: linked issue, risk register impact (yes/no + ID), rollback note.
  - **One approval minimum; two for:** ledger/billing code, consent/outreach scheduling, migrations, prompt promotions, anything `@TenancyExempt`, adapter contract changes. CODEOWNERS routes these automatically.
  - **Squash-merge to main** — one commit per MR, MR title becomes the commit message (commitlint applies to MR titles). Feature branches rebase on main; merge commits into feature branches are banned (linear history keeps bisect useful).
  - Draft MRs encouraged early; CI runs on drafts.

---

## 3. Code Review Checklist

The four checklists below are the canonical review artifact — embedded in the MR template, and the reviewer confirms each applicable item. "N/A" is a valid answer; an *unexamined* item is not.

### 3.1 Security (Doc 21 §8, mechanized where possible)

| Item | Enforcement |
|---|---|
| Tenancy predicate present, or `@TenancyExempt` with justification + second reviewer | Lint + human |
| No raw SQL; parameterized only | `mushin/no-raw-sql` + human |
| C1/C2 never logged; new fields registered with redaction middleware if PII-bearing | Lint + human |
| New endpoint registered in rate-limit config **and** Doc 20 inventory (auto-enrolls in tenancy sweep, Doc 24 §6.1) | CI inventory check |
| Webhook handlers verify-before-parse | Human + Doc 24 §6.4 test required |
| Adapter changes uphold all seven ADR-022 obligations | Conformance suite + human |
| Prompt changes: version bump + eval gates (§6) | Prompt Registry CI |
| New `wp.*` table ships RLS policy in same migration | Migration linter |
| Secrets: none in code/config; new secrets registered per-env in secret manager | Secret scan + human |

### 3.2 Performance

- `EXPLAIN` output attached for any new/changed query on NFR-P01/P02 paths or Timeline (PATCH-003 discipline); plan must show expected index usage.
- No N+1: repository methods returning collections must batch; review flags loops containing awaited repository calls.
- Unbounded collections paginated per Doc 20 (cursor vs. offset per contract) — no `findAll` without limit.
- New hot-path code: does it add an adapter call, LLM call, or lock acquisition inside a loop? If yes, justify against budget.

### 3.3 Testing (Doc 24 §10.1)

- Coverage ratchet green; touched invariant-dense domain → its property/patch suite updated; new endpoint → contract test present; new race surface → entry added to the §7 race matrix; new feature journey → E2E added or explicitly deferred with ticket.

### 3.4 Documentation & Observability

- Metrics per Doc 23 naming/cardinality conventions; every new alert rule ships with its runbook link (Doc 23 rule: no runbook, no alert); module manifest updated (§4); ADR written if a decision of record was made (§10.3); README delta if architecture moved.

**Review culture:** reviews respond within one business day; blocking comments cite the standard or document they enforce ("blocks per Doc 21 §2.2", not "I'd prefer"); style opinions not encoded in lint are non-blocking by definition.

---

## 4. Module Manifest Requirements

Every module `M1-M13` carries `manifest.yaml` at its root — a versioned, reviewed artifact:

```yaml
module: M6-billing
owner: "@eng-core"          # team or individual
coverage_gate: 95            # Doc 24 §2.1
depends_on:
  modules: [M1-identity]
  adapters: [paddle]
api_surface:                 # must match Doc 20 inventory
  - "POST /v1/credits/reserve"
  - "GET  /v1/ledger"
test_suites:
  unit: true
  integration: [PATCH-004, PATCH-005]
  property: [ledger-invariants]
metrics:
  - mushin.credits.reserved
  - mushin.ledger.lock_wait_ms
alerts_owned:
  - ledger-lock-p99          # runbook: docs/runbooks/ledger-lock.md
```

**CI cross-checks the manifest:** declared API surface diffed against the Doc 20 inventory; declared metrics against actual emission (a declared-but-never-emitted metric fails, as does emitted-but-undeclared); declared patch suites must exist and be green. The manifest is thus the module's *contract with the rest of the documentation set*, kept honest mechanically. Manifest changes require the module owner's approval.

---

## 5. Migration Authoring Standards (Doc 22 §6.2)

- **Format:** Flyway-class versioned SQL — `V<yyyymmddHHMM>__<slug>.sql`, forward-only; no down-migrations (rollback = expand-contract guarantees + PITR, never reverse SQL).
- **Expand-contract mandatory:** additive change → deploy code reading both shapes → backfill → contract in a *later* migration (minimum one release between expand and contract). The contract migration's MR must link the expand MR.
- **Linter rules (CI-blocking):**
  1. Any statement class acquiring `ACCESS EXCLUSIVE` requires `SET lock_timeout = '5s'` preamble and a retry note.
  2. All index creation uses `CREATE INDEX CONCURRENTLY` (and therefore lives in its own non-transactional migration).
  3. New `wp.*` table without an RLS policy in the same file → fail (R-SEC-008).
  4. `ALTER TABLE ... ADD COLUMN` with volatile default, table rewrites on partitioned parents, and type-narrowing changes → fail with pattern guidance.
  5. Touching `workspace_credit_balance`, `interaction_timeline`, or `workspace_creator_link` → requires two approvals (CODEOWNERS) and the relevant patch suite in the MR pipeline.
- **Partitioning:** monthly partition pre-creation job (3 months ahead) is the *only* creator of Timeline partitions; migrations never create partitions ad hoc. Deploy-gate check for next-month partition (Doc 22 §6.2) stays as the backstop.
- **Testing:** every migration runs against previous-schema + representative-data snapshot; previous app version's repository suite passes post-migration (Doc 24 §3.2).

---

## 6. Prompt Engineering Standards (ADR-019)

### 6.1 Registry Workflow

Prompts are code: they live in the repo under `prompts/<stage>/<name>/`, with `prompt.md` (template), `schema.json` (output schema), `evals/` (golden + injection sets), and `meta.yaml` (version, model compatibility, cost profile).

**Change flow:** edit → **version bump mandatory** (CI fails on content change without bump — Doc 24 §2.4 snapshot enforcement) → eval pipeline runs:
1. Output-schema conformance on golden set (< 0.5% violation, Doc 24 §8)
2. Quality regression vs. current version (±2% aggregate tolerance, Doc 24 §11.2)
3. **Injection eval set pass** (Doc 21 §8 — gate precedes cost consideration)
4. Cost delta report: measured cost-per-score (Doc 23 §5.1 attribution) old vs. new + batch re-scoring estimate for the affected snapshot population
5. **CPO cost-gate approval** (ADR-028) recorded in the MR — promotion without the recorded approval is blocked by a required MR label check
6. Promotion → PATCH-010 campaign enqueued to `q-rescore-low`

### 6.2 Prompt Structure Rules

- Scraped/user content appears **only** in fenced, schema-bound data sections — never interpolated into instruction text (Doc 21 §3.4 structural isolation). Lint: template variables are only legal inside registered data fences.
- Output must be schema-parseable; prompts must instruct nothing that the grounding validator can't verify (every claim field pairs with an evidence-span field).
- Model version pinned in `meta.yaml`; a model change is a version bump with the full eval flow — the `(prompt_version, model_version)` provenance triple (PATCH-010) is honest only if both dimensions are governed.

### 6.3 Review

Prompt MRs require: one engineer (schema/pipeline correctness) + the prompt steward (quality/eval judgment). The reviewer checks eval diffs, not vibes: which golden cases changed and why.

---

## 7. Adapter Development Standards (ADR-022)

Every adapter implements the seven obligations; the shared conformance suite (Doc 24 §8.2) is the acceptance test. Implementation standards per obligation:

| # | Obligation | Standard |
|---|---|---|
| 1 | **Credential management** | KMS-wrapped, per-env (Doc 22 §4); constructed only in worker plane (`mushin/adapter-import-boundary`); credentials never appear in adapter method signatures or thrown errors |
| 2 | **Retry discipline** | Exponential backoff + jitter from the shared retry util (no hand-rolled loops); retries only on idempotent-safe operations — each method declares `idempotent: boolean` and the base class refuses to retry unsafe ones |
| 3 | **Circuit breaker** | Shared breaker util; thresholds in adapter config (error-rate %, latency p99, window); state transitions emit `adapter.circuit_state` (Doc 23 §2.2) |
| 4 | **Cost emission** | `cost_event` per billable call (Doc 23 §5.1) with full attribution; a new adapter without cost mapping fails conformance |
| 5 | **Health reporting** | Success rate, latency, quota headroom emitted per Doc 23 §6 field conventions |
| 6 | **Degraded-mode contract** | Named degraded states enumerated in the adapter's manifest (e.g., `apify.instagram: STALE_CACHE_OK`, `llm: QUEUE_FOR_RETRY`); callers switch on named states, never on error strings; Doc 20's degraded-behavior endpoint mapping consumes these names |
| 7 | **Sandbox parity** | Conformance fake (scriptable failures) + provider-sandbox config ship with the adapter; nightly sandbox run wired before first production use |

**New adapter checklist:** manifest entry, conformance suite green against fake and sandbox, cost model documented, degraded states mapped in Doc 20 terms, canary/health panel added (Doc 23 §6), secret registered per-env.

---

## 8. Error Handling Standards

- **All thrown application errors are `MushinError` subclasses** carrying a Doc 20 catalogue code; throwing raw `Error` on an API path is lint-flagged. Unknown/unexpected exceptions map to `INTERNAL_ERROR` at the boundary with full trace capture — never leak internals in the envelope.
- **Envelope (Doc 20):** `{ error: { code, message, request_id, details? } }` — `message` is the user-facing string; `details` is machine-readable and PII-free.
- **User-facing messages:** plain language, actionable, no jargon or internal identifiers ("Your workspace doesn't have enough credits for this discovery. Add credits or reduce the job size." — not "reservation failed: insufficient usable_balance"). Urdu-market tone guidance per Doc 12; messages live in a copy catalogue, not inline strings, for future localization.
- **Logging pairing:** every `error`-level log line carries the catalogue code (`error_code` field, Doc 23 §2.1 closed set) — dashboards slice by code family.
- **Swallowed errors are banned:** empty catch blocks fail lint; intentional suppression uses `suppressError(err, reason)` which logs at `warn` with the reason.

---

## 9. Dependency Management

- **Security patches:** Renovate auto-MRs; critical CVEs merged within 48 h (pipeline green required, but review may be expedited single-approver).
- **Feature updates:** batched weekly Renovate MRs; major-version bumps require a named owner and a migration note.
- **Vulnerability scanning:** per-CI dependency scan (Doc 21 §8); a new critical vuln in the lockfile blocks merges repo-wide until triaged (accept-with-ticket or patch).
- **License compliance:** allowlist (MIT, Apache-2.0, BSD, ISC); copyleft additions require explicit sign-off; CI license check on lockfile changes.
- **Lockfile:** `pnpm-lock.yaml` committed always; `pnpm` frozen-lockfile in CI; lockfile-only diffs reviewed for unexpected transitive additions (supply-chain hygiene — R-TEC-007's cousin in our own dependency tree).
- **Pinning:** direct dependencies pinned exact; no `^` ranges — Renovate owns movement, humans own approval.

---

## 10. Documentation Standards

### 10.1 READMEs

Per-module README template: purpose (one paragraph), manifest summary link, local dev/test commands, key invariants with ADR references, "things that will bite you" section (required — institutional memory is a deliverable).

### 10.2 API Documentation

OpenAPI spec is **generated from code** (route schema declarations) and CI-diffed against the Doc 20 inventory — the spec, the inventory, and the tenancy sweep (Doc 24 §6.1) share one source of truth. Spec publication pipeline lands in Doc 26.

### 10.3 ADR Workflow

- New ADRs use the established template (Context / Decision / Consequences / Status), numbered sequentially after ADR-028, committed under `docs/adr/`.
- **Trigger rule:** any MR that (a) forecloses a future option, (b) contradicts or amends an existing ADR, or (c) selects a provider/pattern others must follow → ADR required. Reviewers ask "is there a decision of record hiding in this MR?"
- Amendments reference the amended ADR (as ADR-016 amends ADR-002); ADRs are never edited in place after acceptance.

### 10.4 Runbooks

Template (full set in Doc 27): trigger (which alert), impact, diagnosis steps (with exact Axiom/Grafana queries), remediation, escalation, verification. Doc 23's "no runbook, no alert" rule makes runbook authoring part of feature DoD, not an ops afterthought.

---

## 11. Risk Register Updates

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| **R-ENG-001 (new)** | Engineering | Custom lint rules drift from the documents they encode (rule exists, invariant evolved) | M | M | Lint rules carry doc-section references in their metadata; doc-change checklist includes "update encoded lint?"; quarterly standards review |
| **R-ENG-002 (new)** | Engineering | Two-approver domains bottleneck on a small team | M-H | M | CODEOWNERS lists ≥2 eligible reviewers per domain; founder/CTO is universal fallback; measure MR cycle time, revisit at S2 |
| **R-ENG-003 (new)** | Engineering | Manifest/CI cross-checks become ceremony and get rubber-stamped | M | M | Cross-checks are *mechanical* (CI fails, not humans nag); checklist items without enforcement are candidates for deletion in quarterly review |
| **R-ENG-004 (new)** | Supply chain | Malicious transitive dependency enters via lockfile churn | L-M | H | Exact pinning, Renovate-only movement, lockfile diff review, CI vuln scan; worker egress allowlist (Doc 24 §6.2) limits blast radius |
| **R-ENG-005 (new)** | Engineering | Prompt steward becomes single point of failure for LLM quality judgment | M | M | Eval gates are automated floors; steward judgment is additive; second steward trained by S2 |

---

## 12. Assumptions & Dependencies

**New assumptions:**

| ID | Description | Confidence |
|---|---|---|
| A-079 | Team size at S1 (~3-5 eng) can sustain the two-approver domains without cycle-time collapse | Med (R-ENG-002 monitoring resolves) |
| A-080 | Route-schema-to-OpenAPI generation covers 100% of Doc 20 surface without hand-written spec patches | Med-High (spike in first CI build-out) |
| A-081 | Custom ESLint rules (cross-plane join, C1-in-logs) are implementable with acceptable false-positive rates | Med-High (AST patterns are tractable; human checklist is the fallback) |
| A-082 | Conventional Commits + squash discipline holds without a dedicated release manager | High |

**Dependencies:** Doc 26 (CI realization of every gate named here: lint, manifest cross-checks, migration linter, prompt eval pipeline, OpenAPI publication), Doc 27 (runbook template consumption), Doc 24 (checklists §3.3 reference its gates), Doc 29 (CODEOWNERS domains align with staff role boundaries where staff-plane code is touched).

**Open questions:**
1. Monorepo tooling choice (Turborepo vs. Nx) for module-scoped CI — affects how manifest-driven test selection is implemented; decide in Doc 26.
2. Whether prompt steward role needs formal definition in Doc 29's permission matrix (leaning yes — prompt promotion is a cost-bearing capability, adjacent to ADR-028's CPO gate).
3. Copy catalogue tooling for §8 user-facing messages (simple JSON catalogue vs. i18n framework now) — recommend JSON catalogue at S1, framework decision deferred to first localization milestone.

---

**End of Document 25.**

[AWAITING APPROVAL]