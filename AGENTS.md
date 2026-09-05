# AGENTS.md — MUSHIN Engineering Constitution
*Loaded automatically at the start of every Mimo session. This file is authoritative for process; DOC-0xx and the ADRs listed in Section 1 are authoritative for architecture and domain facts.*

**v2.1** — adds the original-vs-current stack reference, a full rewrite of the restraint/minimalism principles, and folder-structure tracking alongside the Obsidian rules.

---

## 0. Stack: Original vs. Current (ADR-033)

| Layer | DOC-017/022 (original) | Current directive | Status |
|---|---|---|---|
| Database | Neon Postgres | Supabase Postgres | Treated as cosmetic — both managed Postgres; DDL is portable. Supabase's own auth/storage/realtime are *not* used (Identity & Tenancy Kernel and file storage stay custom per DOC-014) |
| Search | Meilisearch Cloud | pgvector | **Not a drop-in swap** — different tools for different jobs (keyword/filter/facet vs. vector similarity). Recommendation: keep Meilisearch for the search surface DOC-015 already designed; add pgvector alongside it for similarity features, not instead of it |
| LLM routing | Groq → Claude/GPT-4o → o1 ladder | OpenAI/Ollama | Keep the ladder's *architecture* (confidence-based escalation behind a provider-agnostic Adapter); treat "OpenAI/Ollama" as which providers currently sit in it. Ollama specifically implies self-hosted inference DOC-022 never scoped — hold off until there's an actual cost/latency reason |
| Cache | *(none specified)* | Upstash Redis | New. Scope: rate-limit counters, hot-path caching (facet counts, entitlement checks). Not the outbox, not the ledger — nothing durability-sensitive lives here |

DOC-015/017/022 haven't been formally revised to match — until they are, this table plus ADR-033 (Master Implementation Plan preamble) is the tiebreaker for stack questions specifically; everything else in those documents still governs.

---

## 1. Documentation Precedence

1. DOC-025 — Engineering Standards
2. DOC-014 — Software Architecture
3. DOC-018 — Domain Model (finalized; ADR-030's E4 section provisional pending sign-off)
4. DOC-019 — Physical Schema (+ Security Addendum: RLS, OAuth/WABA storage)
5. DOC-020 — API Contracts
6. DOC-021 — Security & Compliance
7. DOC-022 — Infrastructure (see Section 0 stack note)
8. Remaining documents
9. This file

**On conflict:** stop. Document the conflict (both sources, both sections). Apply the higher-precedence source. Log it in `architecture-state.json`. Never silently pick one and move on.

---

## 2. Immutable Architectural Invariants

- GCP/WP plane separation is inviolable. No cross-plane foreign keys (ADR-024).
- Workspace isolation via RLS at the database level — `FORCE ROW LEVEL SECURITY`, not just application filtering.
- Events published *only* via the transactional outbox. No direct queue publishing from API handlers.
- Every external dependency lives behind an Adapter. Provider SDKs never appear in business logic.
- Expand-contract migrations only. No `DROP COLUMN`/`DROP TABLE`, ever.
- Ledger and Timeline records are immutable and append-only.
- Event contracts are additive-only.
- Module extraction thresholds (DOC-016 F3) are numeric and pre-agreed.
- Creator records flagged `minor_signal = true` (ADR-029) have contact-reveal, campaign-add, and outreach-enrollment closed by default — an invariant, not a feature flag.
- Cross-workspace system jobs run under `mushin_system_worker`, the only `BYPASSRLS` role, audit-logged. Nothing else bypasses RLS.

---

## 3. Engineering Principles — "Ponytail Mode" (Restraint-First Decision Order)

*Same seven-step philosophy you pasted in — rewritten in MUSHIN's own words rather than reproduced verbatim, per your own earlier instruction that this should be treated as a philosophy to extract, not a prompt to copy.*

Default posture: code is a cost, not an achievement. Every line added is something that can break, needs a test, needs a reviewer, needs a maintainer, and will eventually need debugging at an inconvenient hour. The goal isn't how much gets built — it's how little needed to be built to actually solve the problem.

Before writing any code, work through this order and stop at the first step that resolves the need:

1. **Is this actually needed right now?** Distinguish a real, current requirement from a hypothetical future one. If it's speculative, say so and decline to build it rather than building it "just in case."
2. **Can subtraction fix it?** Check whether deleting something, reusing an existing feature, or writing a config value solves the problem before writing new code.
3. **Does it already exist in this codebase?** Search for existing helpers, utilities, hooks, and patterns first — a duplicate is a search failure, not a coding task.
4. **Does the language's standard library already solve this?** Don't hand-roll what the standard library already does correctly.
5. **Does the platform already solve this?** Native HTML inputs, browser validation, CSS layout, SQL constraints and indexes are already maintained by someone else — use them before writing an app-level equivalent.
6. **Does an existing project dependency already solve this?** Use what's already there before adding a new package or building a wrapper.
7. **Only once 1–6 are exhausted, write the smallest thing that works** — plain functions over classes, composition over inheritance, data over objects, the obvious approach over the clever one. No abstraction for a single implementation, no extension point for a future that isn't specified yet.

**Never introduce, absent an actual need:** manager/service-locator classes, a repository layer nobody asked for, an interface with exactly one implementation, configuration for a hypothetical future, a generic solution to a one-off problem, a wrapper around a wrapper, a bespoke validation library where the ecosystem already has one, or a service extracted before any DOC-016 F3 threshold is actually hit.

**What minimalism never cuts:** authentication, authorization, input validation, sanitization, rate limiting, error handling, logging/observability, accessibility. Skipping any of these to keep something small isn't restraint — it's a bug with better PR copy.

**Reporting format when code is genuinely needed:** why it needs to exist (one sentence) → why the cheaper options above didn't cover it (up to three bullets) → the implementation itself, sized to the actual requirement → what you deliberately chose not to build (the abstraction, dependency, or layer left out on purpose). That last part is worth writing down — "I didn't add X" is a decision, not an absence of one.

**Verify, don't assume.** Before citing a DOC/ADR/assumption ID, confirm it actually says what you think it says — this project has already shipped one 43-line domain model with a table of contents for content that didn't exist, and ten assumption IDs that quietly meant two different things. Grep before you cite.

**Pre-flight checklist (before writing code):**
- [ ] Worked through steps 1–6 above and confirmed step 7 is actually necessary
- [ ] Checked `architecture-state.json` for related open decisions or blocking items
- [ ] Confirmed which DOC(s)/ADR(s) govern this change, and that the cited section actually exists
- [ ] Written the one-sentence "why this needs to exist" statement

---

## 4. Mimo Agent Operating Procedure

**Load Context** (Section 9) -> **Read docs** -> **Implementation proposal** (Section 3's reporting format) -> **Implementation** -> **Migration** (if applicable) -> **Unit tests** -> **Integration tests** -> **Security tests** -> **Regression tests** -> **Performance tests** (hot paths only) -> **Architecture validation** (Section 2, explicitly) -> **Documentation update** (Section 8) -> **`architecture-state.json` update** -> **Supervisor review flag** -> **Merge**.

---

## 5. Coding Standards

- Strict TypeScript. No `any` — use `unknown` + narrowing, or a proper generic.
- Exhaustive typing on discriminated unions (e.g., `NormalizedBillingEvent`) — a missing case should be a compile error, not a runtime surprise.
- Explicit error handling — no silently-swallowed catches.
- Structured logging (JSON), never string-concatenated log lines.
- Correlation: every request carries `request_id`; async chains preserve it into `trace_id` (DOC-023).
- Idempotency keys on every mutation a retry or duplicate delivery could re-trigger.
- Explicit retry and timeout policies on every external call.
- Rate limiting at the boundary, matching DOC-020's catalog.

---

## 6. Forbidden Patterns

- Direct Paddle/Apify/Serper/LLM-provider SDK calls outside their Adapter.
- Direct queue writes from API handlers (outbox only).
- Provider webhooks reaching domain logic unparsed.
- Any query against `wp.*`/`gcp.*` tables from frontend components — always through the API layer.
- Bypassing RLS outside `mushin_system_worker`, ever.
- Storing plaintext credentials anywhere.
- Creating a duplicate creator entity when identity resolution (ADR-029) already has a >=60% match without routing through candidate/review.
- Hidden side effects.
- Mutating an audit or ledger record after the fact — append a correction record instead.
- Citing a `Doc-N section X` reference without having opened Doc N and confirmed that section exists.
- Introducing a new global ID sequence without checking the existing max first.
- Everything listed under Section 3's "never introduce absent an actual need."

---

## 7. Required Tests (every module)

- **Unit:** happy path, validation failures, permission failures, boundary conditions, error handling.
- **Integration:** API contract conformance, DB writes, outbox event emission, queue interactions, idempotency.
- **Security:** tenant isolation, RBAC, auth-bypass attempts, injection attempts, rate limiting.
- **Regression:** old endpoints, migrations, and event contracts still work.
- **Performance (hot paths only):** latency, throughput, queue concurrency, worker scaling, against DOC-016 F1's load envelope.

---

## 8. Obsidian & Repository Documentation Rules

Documentation drift is a defect, not a follow-up task. Before a module is marked complete:
- [ ] ADR references updated/added
- [ ] Schema notes match the shipped migration
- [ ] API docs match the shipped contract
- [ ] Worker docs match actual trigger/retry/side-effect behavior
- [ ] Dependency graph updated
- [ ] `architecture-state.json` updated
- [ ] Changelog entry written
- [ ] MOC pages updated, wikilinks resolve
- [ ] **Repository folder structure documentation updated** — the vault's repo-map/structure note reflects any new directory, moved module, or renamed boundary in the same PR. A folder structure that only lives in `git log` is exactly the kind of drift this project has already been burned by twice (DOC-018, the Doc-27 references) — the fix is the same: update the record when the thing it describes changes, not on a separate cleanup pass later.

**Recommended:** a CI job that greps every `Doc N section X` / `Doc N Part Y` citation across the vault and fails the build if the target doesn't exist — DOC-025 Section 4 already does this for API/metrics manifests.

---

## 9. Context Loading Strategy

Never load all 29 documents simultaneously. Load: this file, the ADRs relevant to the current module, the target module's own doc(s), the relevant schema slice, the relevant API contract slice, and `architecture-state.json`. Max scope = current module + adjacent dependencies + shared invariants (Section 2).

---

## 10. Decision Authority Matrix

**AI autonomous:** internal implementation details, query optimization, index choices, caching strategy, worker concurrency, retry policy, batch sizes, internal DTO shape.

**Human approval required:** credit pricing changes, subscription behavior changes (ADR-030's approval status), legal implications, user-visible workflow changes, new paid features, breaking API changes, cross-module architectural changes, anything touching `minor_signal` gating.

**Escalate immediately:** architectural invariant violation, missing business decision, irreconcilable schema conflict, identified security vulnerability, infrastructure cost inflation, ambiguity not covered by an existing doc.

**Otherwise: continue autonomously, module by module, without waiting for additional approval.**

---

## 11. Definition of Done

1. Code implements the ticket, resolving any doc conflict per Section 1
2. Required tests (Section 7) pass in CI
3. Documentation (Section 8), including folder-structure notes, updated in the same PR
4. No known regressions
5. `architecture-state.json` reflects the new state
6. Any accepted technical debt is explicitly logged, not silent

---

## 12. Active Open Items

- **A-032** — Paddle Pakistan-entity onboarding. Existential.
- **Child-creator policy** — `minor_signal` is a safe default standing in for a real product/legal decision that's still open.
- **ADR-030** — proposed, awaiting sign-off.
- **ADR-033** — stack pivot (Section 0), DOC-015/017/022 not yet formally reconciled.
- **DOC-030 / ADR-032** — Feedback & Product Intelligence module, not yet written.
- **Docs 4/6 geography revalidation** — see the standalone remediation brief.

---

## 13. Changelog

- **v2.1** — Added Section 0 stack table, rewrote Section 3 as the Restraint-First Decision Order, added folder-structure tracking to Section 8.
- **v2.0** — Full rewrite following the architecture review, ADR-029/030/031, and DOC-019 security addendum.
- **v0.1** — Initial scaffold, written before any of the 29 documents existed.

---

## 14. Verification Intelligence — Reality Over Intent

The agent must verify system behavior, not trust implementation claims, documentation, or visual appearance.

A feature is not complete because:
- the code compiles
- tests pass
- the UI renders
- the API returns 200
- documentation says it exists

A feature is complete only when the entire behavior chain is proven:
User action → API boundary → authorization → domain logic → persistence → events → async processing → external effects → user-visible result.

---

## 14.1 Evidence-Based Debugging

When investigating defects:

1. Reproduce the issue before proposing a fix.
2. Capture evidence:
   - logs
   - database state
   - network requests
   - API responses
   - browser console output
   - queue state
   - event history
3. Separate:
   - Observed facts
   - Likely causes
   - Required verification
4. Fix the root cause, not the visible symptom.

Never say:
"this should work"

Prefer:
"this was verified by X evidence."

---

## 14.2 State Verification

For every important workflow, verify consistency across layers.

Examples:

Authentication:
- session exists
- user identity resolves
- workspace membership validates
- RLS permits intended access

Payments:
- provider event received
- signature verified
- ledger updated
- entitlement changed
- duplicate events handled

Credits:
- deduction recorded
- balance calculated from ledger
- failed operations do not consume credits

Enrichment:
- job created
- worker executes
- external provider response stored
- profile state transitions correctly

---

## 14.3 AI-Generated Code Audit

Treat all generated code as untrusted until verified.

Before accepting generated implementation:

Check:
- Does it match existing architecture?
- Does it introduce duplicate logic?
- Does it bypass adapters?
- Does it weaken security boundaries?
- Does it create fake completeness?
- Does it handle failure states?

Generated code should be reviewed as if written by an unfamiliar contributor.

---

## 14.4 Hidden Failure Detection

Actively search for:

- silent failures
- race conditions
- stale state
- incorrect assumptions
- partial transactions
- duplicate execution
- missing retries
- incorrect cache invalidation
- authorization gaps
- misleading UI states

A green test suite is evidence, not proof.

---

## 14.5 Production Reality Check

Before marking production-ready, answer:

"What happens when this fails?"

Document:

- failure mode
- detection mechanism
- recovery path
- user impact
- operational owner

No critical workflow should depend on an invisible failure.

---

## 14.6 Verification Loop

Every implementation follows:

Understand → Inspect → Change → Test → Observe → Challenge → Accept

The final question before completion:

"How do we know this works in reality, not just in theory?"


---

## 15. Mimo Agent Skill Registry

The agent is expected to operate with specialized engineering skills. Skills define capabilities; Sections 1–14 define constraints and authority.

A skill does not override architectural invariants, documentation precedence, security requirements, or decision authority rules.

---

# 15.1 Core Engineering Skills

## Codebase Intelligence
Ability to:
- Navigate unfamiliar codebases quickly.
- Identify module boundaries and ownership.
- Trace execution flow across frontend, backend, database, workers, and external services.
- Understand existing patterns before introducing new ones.

## Root Cause Analysis
Ability to:
- Investigate failures from evidence.
- Separate symptoms from causes.
- Reproduce issues before fixing.
- Identify systemic problems rather than local patches.

## Change Impact Analysis
Ability to:
- Map affected components before modification.
- Identify downstream dependencies.
- Predict migration, testing, and operational impact.

## Safe Refactoring
Ability to:
- Improve code quality without changing behavior.
- Reduce duplication.
- Remove unnecessary complexity.
- Preserve contracts and invariants.

---

# 15.2 Verification Skills

## Reality Verification
Ability to verify that implementations work beyond compilation and tests.

Verify:

- User action
- API request
- Authentication
- Authorization
- Domain processing
- Database state
- Events
- Background jobs
- External effects
- Final user-visible result

A passing test is evidence, not proof.

## Production Readiness Review
Ability to evaluate:

- Failure scenarios
- Monitoring coverage
- Rollback capability
- Security risks
- Cost implications
- Operational complexity

## Regression Detection
Ability to identify:

- Existing behavior changes
- Contract violations
- Data corruption risks
- Hidden side effects

---

# 15.3 SaaS Engineering Skills

## Multi-Tenant SaaS Design
Ability to reason about:

- Workspace isolation
- Tenant boundaries
- Permissions
- User lifecycle
- Subscription states

## Billing and Entitlement Systems
Ability to maintain:

- Credit systems
- Usage tracking
- Subscription states
- Feature access rules
- Payment provider integrations

Financial state must always be explainable from records.

## Product Engineering
Ability to connect:

- User problems
- Product workflows
- Technical implementation
- Business outcomes

Avoid building technically impressive features with unclear user value.

---

# 15.4 Database Skills

## PostgreSQL Engineering
Ability to:

- Design schemas
- Optimize queries
- Analyze query plans
- Design indexes
- Handle transactions
- Manage migrations safely

## Data Integrity
Ability to protect:

- Constraints
- Referential integrity
- Immutable records
- Audit trails
- Historical accuracy

## Security Database Practices
Ability to implement:

- Row Level Security
- Least privilege access
- Secure queries
- Tenant isolation verification

---

# 15.5 Backend Engineering Skills

## API Engineering
Ability to:

- Design stable contracts.
- Validate inputs.
- Handle failures explicitly.
- Maintain backwards compatibility.

## Distributed Systems
Ability to reason about:

- Async jobs
- Queues
- Retries
- Idempotency
- Race conditions
- Event ordering

## External Integration Engineering
Ability to build resilient adapters for:

- APIs
- Webhooks
- Providers
- Third-party services

Never assume external systems are reliable.

---

# 15.6 Search and Discovery Skills

## Search Engineering
Ability to improve:

- Retrieval quality
- Ranking
- Filtering
- Query understanding
- Semantic similarity

Evaluate search by:

- Relevance
- Coverage
- Trust
- User action after results

## Entity Resolution
Ability to:

- Match identities.
- Detect duplicates.
- Handle uncertain matches.
- Preserve data lineage.

---

# 15.7 Data Intelligence Skills

## Data Quality Engineering
Ability to maintain:

- Source attribution
- Freshness tracking
- Confidence scoring
- Validation pipelines
- Accuracy monitoring

Never convert uncertain data into false certainty.

## Fraud Detection
Ability to evaluate:

- Suspicious patterns
- Engagement anomalies
- Authenticity signals
- Confidence levels

---

# 15.8 AI Engineering Skills

## LLM System Design
Ability to:

- Design AI workflows.
- Control hallucinations.
- Evaluate outputs.
- Manage cost and latency.

## AI Output Verification
AI-generated results require:

- Validation rules
- Confidence scores
- Human escalation paths when necessary

Models assist decisions; they do not replace system truth.

---

# 15.9 Frontend Engineering Skills

## React and TypeScript
Ability to:

- Build maintainable components.
- Preserve type safety.
- Manage state correctly.
- Optimize rendering.

## UX Engineering
Ability to consider:

- User workflows
- Error states
- Loading states
- Accessibility
- Trust signals

A UI that looks correct but misrepresents system state is a defect.

---

# 15.10 Infrastructure Skills

## Production Operations
Ability to:

- Debug deployments.
- Understand environments.
- Monitor services.
- Investigate incidents.

## Observability
Ability to implement:

- Structured logs
- Metrics
- Tracing
- Alerts
- Operational dashboards

Systems should explain their own failures.

---

# 15.11 Security Skills

Ability to perform:

- Threat modeling
- Permission auditing
- Authentication review
- Authorization testing
- Input validation review
- Secret management review
- Abuse prevention analysis

Security boundaries must be verified, not assumed.

---

# 15.12 Mushin Domain Skills

The agent must understand Mushin as:

A creator intelligence platform where trust in data is the core product.

Domain capabilities:

- Influencer discovery workflows
- Creator profile enrichment
- Social platform data modeling
- Campaign workflows
- Creator scoring
- Engagement analysis
- Fraud signals
- Marketing decision support

Technical correctness alone is insufficient; outputs must be useful to marketers.

---

# 15.13 Skill Selection Rule

Before starting work:

1. Identify the required skills.
2. Load only relevant context.
3. Apply the smallest sufficient skill set.
4. Verify against reality.
5. Document decisions.

Do not activate complexity without need.

---