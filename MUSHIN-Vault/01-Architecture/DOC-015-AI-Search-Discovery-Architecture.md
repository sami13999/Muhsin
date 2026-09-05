CC-003 ratification logged. "LLM as Engine" directive internalized — and it resolves ADR-SEARCH-001 cleanly. One architectural sharpening is applied throughout this document to keep the directive compatible with our binding constraints (FS-02.03 determinism, NFR-P01, 3× guardrail): **the LLM thinks on the write path; the read path stays deterministic** — all expensive reasoning happens at ingestion time and is stored as structured attributes; query time uses only fast index retrieval plus one cheap translation call.

---

#### DOC-015 — AI Intelligence Layer & Search/Discovery Architecture
**Status:** Draft v1.0 | **Phase:** 5 | **Owner:** Principal Architect (AI/Search) | **Consumes:** Doc 14 (M3/M5/M6 frames, Two Brains), Doc 8 (constraint funnel), ADR-016, "LLM as Engine" directive

---

#### Executive Summary

This document finalizes **ADR-SEARCH-001: Accepted — Hybrid, "LLM thinks / Index retrieves."** MUSHIN rejects hand-coded categorization, parsing, and scoring algorithms in favor of LLM APIs as the universal intelligence engine, while retrieval runs on a **Meilisearch/Typesense-class managed search index** for instant, deterministic, zero-marginal-cost queries. The load-bearing principle is **write-path intelligence (ADR-018)**: classification, authenticity reasoning, audience estimation, and summarization execute once at ingestion (Brain 2) and persist as structured attributes; Brain 1 queries touch no LLM except a single cheap, cached **query-translation call** that converts natural language into validated filter structures. The document specifies the model routing ladder (cheap classifier models → frontier reasoning, escalation-by-confidence), the **versioned Prompt Registry** with schema-constrained outputs and grounding validators (anti-fabrication enforcement from Doc 8 A4), the RAG context strategy for scoring, and five cost-control mechanisms that structurally protect the 3× COGS guardrail.

#### Purpose & Scope

Architecture of M3 (Search Coordinator internals), M5 (index projection), M6 (Intelligence & Scoring): index technology class and schema strategy, query translation pipeline, semantic/vector layer, ranking computation, LLM routing policy, prompt engineering governance, RAG assembly, evaluation harness, and cost optimization. Vendor *selection* (specific index host, LLM providers, embedding models) lands in Doc 17 against criteria fixed here.

#### Non-Goals

- Custom model training/fine-tuning — **prohibited** (ADR-002; frontier + open models via API only).
- Queue semantics/scaling (Doc 16); adapter contracts (Doc 17); schema DDL (Doc 19).
- Outreach AI (FS-03.03, S2) — routing policy applies, feature spec exists (Doc 8).
- Zero code / zero prompt text (prompts are governed artifacts, authored at implementation under Part D rules).

#### Objectives & Success Criteria

- Brain-1 query cost: **zero LLM tokens for filtered search; ≤1 cheap-model call for NL search** (testable).
- Identical query + index state → identical results and order (FS-02.03 determinism, testable).
- Every stored score reproducible from archived payload + prompt version + model version (auditability triple).
- Cost per live-discovery candidate and per enrichment bounded by per-job caps; guardrail dashboard (FS-10.03) can attribute cost to model × prompt × stage.

#### Detailed Content

**Part A — ADR-SEARCH-001: Final Decision Record**

- **Context:** Docs 1/7/8 constraint funnel — sub-second filters, NL + transliteration, semantic capability, explainable deterministic ranking, long-tail fairness (T5), per-query cost visibility; ADR-016 Two Brains topology; directive to avoid the custom-algorithm engineering trap.
- **Decision:** Hybrid. (1) Managed search index (Meilisearch/Typesense-class) as the sole query-time retrieval engine over GCP projections. (2) LLMs as the exclusive intelligence layer in three roles — **Translator** (NL→filters), **Analyst** (authenticity/audience/summaries from payloads), **Classifier** (niche taxonomy assignment) — all executing on the write path except translation. (3) Vector/semantic layer for similarity and semantic recall (S2), never replacing structured retrieval.
- **Alternatives rejected:** pure algorithmic backend (brittle, every scenario hand-built — the trap named in the directive; transliteration/NL essentially unsolvable by hand at our team size); pure LLM retrieval ("ask the model to find creators") — non-deterministic, slow, expensive, unrankable at scale; vector-only search — poor at hard filters (follower bands, geo shares), opaque ranking, violates explainability.
- **Consequences:** accepted dependency on LLM API pricing/availability (mitigated: routing ladder + open-model substitution path); scoring quality is now a prompt+eval engineering discipline (Part D/E) rather than an algorithm-maintenance one; index and attributes must be re-projectable (reprocessability via payload archive).
- **Status: Accepted** (supersedes "Proposed" from Doc 1; macro-resolution from ADR-016 incorporated).

**Part B — Brain 1: Database Search Architecture**

**B1. Index technology & schema strategy**
- Engine class: Meilisearch/Typesense-class managed index — selection criteria for Doc 17: typo/transliteration tolerance quality (A3 test set), filterable-attribute performance at 10^5-10^7 documents, faceting, geo support, managed hosting SLA, cost curve.
- Index document = flattened creator projection: identity fields (with **transliteration variant expansions generated by cheap LLM at ingestion** — A3 solved as data, not query logic), platform metrics, LLM-derived attributes (niche categories from controlled vocabulary, authenticity band + score, quality score, audience estimate summary fields incl. PK/GCC/diaspora shares per CC-003, language mix), freshness timestamps.
- Projection is rebuildable from GCP at any time (index is disposable state; recovery story for Doc 24).

**B2. Query translation pipeline (the only query-time LLM)**
- NL query → cheap-model call → **schema-constrained structured output** (filter set + ranking hints + confidence) validated against the filter vocabulary; invalid output → one retry → fallback to keyword mode with honest chip ("interpreted as keywords"). Output renders as editable chips (FS-02.02) *before* retrieval (Doc 12 ordering).
- **Interpretation cache:** normalized-query → interpretation, TTL 24h, shared across users within language (not workspace-scoped — no tenant data in queries; privacy check: any query containing detected personal context skips cache). Cache hit = zero-token NL search. Chip edits bypass translation entirely (edited chips are already structured — power users converge to zero-LLM searching).
- Urdu/Roman-Urdu queries: same call, same schema; the model normalizes to vocabulary values (this is precisely where LLM-as-Translator beats hand-coded parsing).

**B3. Ranking (FS-02.03) — computed, not generated**
- Fit score assembled at query time by the Coordinator from **precomputed attributes**: index relevance signal, criteria-match distance, authenticity band weight, quality score, freshness decay, and the T5 long-tail fairness term (size-band normalization so 15k-follower creators compete within, not against, 1M-follower creators). Weights are configuration (flag-tunable, versioned), **not** per-query LLM output — this preserves determinism, zero query cost, and CC-001 explanations (each ranking factor is citable because each is a stored value).
- Ranking explanation badges derive from the same factor values — explanation is a rendering of the computation, never a post-hoc LLM narrative (anti-fabrication by construction).

**B4. Semantic/vector layer (S2: FR-02.05 similarity + semantic recall)**
- Embeddings computed at ingestion (write-path rule) over normalized content signatures (bio + niche + content-topic digest); stored in the index's vector capability or an adjacent managed vector store (Doc 17 selects; criteria: co-location with filters for hybrid queries).
- "More like this" = vector neighborhood **intersected with structured filters** (hybrid query), then ranked by B3 — semantic expands recall, never overrides deterministic ranking. Embedding model pinned + versioned; re-embedding is a batch job over archives (reprocessability).

**Part C — Brain 2: Live Discovery Intelligence (M6)**

**C1. Model routing ladder (binding policy)**

| Tier | Model class | Assigned tasks | Escalation rule |
|---|---|---|---|
| T-A (cheap/fast; Groq LPU inference) | `llama-3.1-8b-instant` (via Groq API) | Niche classification (controlled vocabulary), language detection, transliteration variant generation, payload field extraction/normalization, query translation (B2) | Confidence below threshold or schema-validation failure ×2 → T-B |
| T-B (mid; Groq LPU inference) | `llama-3.3-70b-versatile` (via Groq API) | Creator summaries (FS-03.01), audience estimation (CC-003), standard authenticity evidence assembly on complete payloads | Sparse/conflicting payload, evidence contradictions, borderline authenticity band → T-C |
| T-C (frontier reasoning) | Frontier models (e.g., Claude 3.5 Sonnet / GPT-4o via fallback adapters) | Authenticity reasoning on ambiguous/high-stakes cases (band boundary, diaspora calibration per R-PRD-006), dispute re-evaluation, low-confidence audience estimates | Terminal; unresolved → honest "insufficient data" state (never guess upward) |

- Routing decisions + confidence logged per task (FS-10.03 attribution: model × prompt × stage). Escalation rate is a monitored economic metric — rising T-C share = cost alarm and/or payload-quality alarm.
- Open-model substitution: T-A tasks are deliberately simple enough that hosted open models (HF-class inference) can compete on cost; adapter-level A/B against eval sets (Part E) governs substitution — never vibes.

**C2. Prompt engineering architecture (governed artifacts)**
- **Prompt Registry:** every prompt is a versioned artifact — ID, version, task, model tier, input schema, **output JSON schema**, eval-set linkage, changelog. Prompt changes follow code review (Qwen reviews prompts like code; Mimo may not inline ad-hoc prompts — lintable rule: M6 calls reference registry IDs only).
- **Schema-constrained outputs everywhere:** every LLM task returns validated structured output; free-text exists only inside designated fields (summary text, evidence statements). Validation failure → retry → tier escalation → task failure with honest state (Doc 8 fallbacks). No unvalidated LLM output ever reaches GCP.
- **Grounding validator (A4 anti-fabrication, mechanized):** evidence-bearing outputs must reference payload field paths for each claim; a post-processor verifies the referenced data exists and is consistent in direction (e.g., claimed "engagement dropped 40%" must match archived metrics within tolerance). Validator failure = output rejected + prompt-quality telemetry. This converts the release-blocking rule (Doc 8) into a runtime guarantee.

**C3. RAG context strategy for scoring**
- Context assembled per task from three bounded sources: (1) **normalized payload extract** sourced via the Two Brains adapter layer (Doc 17: Apify actor profiles/comments for IG/TikTok + YouTube Data API v3 native responses; relevant sections only — engagement scoring gets metrics + comment samples, not full post archive; per-task context budgets enforced), (2) **reference frames**: PK/category benchmark medians (FS-01.01 requirement) and the diaspora-calibration guidance derived from the ground-truth panel (A-049/R-PRD-006 — encoded as retrieved reference context, not fine-tuning), (3) **task rubric** from the registry.
- No cross-creator or cross-workspace data in scoring context (GCP-plane inputs only; privacy + fairness). Retrieval of benchmarks is keyed lookup, not vector search (deterministic context = reproducible scores).
- Reproducibility triple: archived payload + prompt version + pinned model version → re-derivable score (Objectives). Model deprecations trigger batch re-scoring from archives.

**Part D — Cost Architecture (3× guardrail protection)**

1. **Write-path exclusivity (ADR-018):** the structural control — intelligence cost scales with *ingestion volume* (metered, credit-funded per Doc 8 A5), never with *query volume* (free-tier-abusable). The economically dangerous surface is simply absent.
2. **Prompt caching:** registry prompts structured for shared static prefixes (rubrics, schemas, benchmarks) to exploit provider prefix caching; interpretation cache (B2); embedding cache keyed on content signature.
3. **Semantic deduplication:** unchanged payload sections (content-signature hash) skip re-scoring on refresh — only deltas re-enter the ladder; full re-score forced past a staleness horizon.
4. **Payload archiving (Doc 14):** re-scoring, re-embedding, and prompt-improvement backfills run from archives at LLM-only cost, never re-scraping cost.
5. **Hard budgets:** per-job candidate caps and per-stage token ceilings (M4); adapter circuit breakers (FS-10.03) as the terminal backstop; per-action unit-cost telemetry feeds the guardrail dashboard with explicit stage attribution (`serper`, `apify`, `llm` Groq/Anthropic, `youtube_api`) and model×prompt tracking so a regressing prompt version or runaway scraper is *visible as a margin event*.

**Part E — Evaluation Harness (the quality counterpart to Part D)**

- **Golden sets:** (1) PK validation panel with ground-truth labels (authenticity from A-049 panel, niche labels, known audience compositions where obtainable) — doubles as the A-047/48/49 spike instrument; (2) query-translation set (NL + Urdu/Roman-Urdu → expected filter structures, built from UF-00 telemetry over time); (3) grounding adversarial set (payloads engineered to tempt fabrication).
- **Gates:** any prompt version change, model swap, or tier substitution must meet or beat current eval scores before rollout (flag-staged). Score drift monitoring in production: sampled re-evals weekly.
- Chip-edit rate (Doc 8 trigger: >40% = interpretation failure) and evidence-dispute reports are the live quality signals wired to M12 alerting.

#### Dependency Mapping

- **Depends on:** Doc 14 (module frames, adapter layer, archive), Doc 8 (A2–A5, FS-02.x/03.x behaviors), ADR-016, CC-003, Doc 3 guardrail.
- **Enables:** Doc 17 (vendor selection criteria: index engine, LLM providers, embedding + inference hosts), Doc 16 (scoring-job load model), Doc 19 (attribute/vector persistence), Doc 26 (eval harness = test infrastructure; determinism/grounding assertions), Mimo M3/M5/M6 build.
- **Blocks:** Live-discovery credit pricing (OD-001 adjacent) pends Part D telemetry from the spike; nothing else.

#### Assumptions & Constraints

| ID | Description | Confidence | Validation | Impact if False |
|---|---|---|---|---|
| A-052 | Cheap-tier models achieve ≥95% schema-valid, ≥90% correct query translation (incl. Roman Urdu) | Medium | Golden set #2 on spike | Route translation to T-B; cost per NL search rises (cache mitigates) |
| A-053 | Meilisearch/Typesense-class engines handle transliteration variance via variant-expansion data strategy (B1) | Med-High | A3 test set on candidates | Query-time variant expansion by T-A model (small added cost) |
| A-054 | Audience estimation (CC-003) achieves usable accuracy bands from public signals | Low-Med | Golden set #1 vs. known compositions | Estimate scope narrowed (language/geo only); filters relabeled accordingly |
| A-055 | Provider prefix caching + dedup yields ≥40% effective token cost reduction at steady state | Medium | Spike telemetry | Guardrail pressure → credit price recalibration (OD-001) |
| A-056 | Escalation-by-confidence keeps T-C share <10% of scoring tasks | Medium | Routing telemetry | Rubric/threshold tuning; payload-quality investment (M5 gates) |

#### Classified Risk Register

| ID | Category | Risk | L | I | Mitigation |
|---|---|---|---|---|---|
| R-TEC-009 | Technical | LLM output instability (schema drift, provider model updates) silently degrades scoring | M | H | Pinned model versions; eval gates on any change; schema validation + grounding validator; weekly drift sampling |
| R-FIN-010 | Financial | LLM provider price/ToS changes break unit economics | M | H | Routing ladder portability; open-model substitution path (T-A); multi-provider adapters (Doc 17); Part D budgets |
| R-PRD-010 | Product | Niche classification drift fragments the controlled vocabulary (same creator, shifting categories) | M | M | Vocabulary is fixed data (Doc 18); classifier outputs constrained to it; re-classification only on content change (dedup rule) |
| R-PRD-011 | Product | Ranking-weight tuning becomes opaque "algorithm politics" internally | L | M | Weights versioned + changelogged; CC process for changes affecting CC-001 explanations |
| R-SEC-006 | Security | Prompt injection via scraped content (bios/comments containing adversarial instructions) manipulates scoring | M | H | Payload treated as data-only in prompt structure (rubric/data separation); grounding validator catches fabricated conclusions; adversarial golden set #3; injection findings → M12 alerting |
| R-TEC-010 | Technical | Index/GCP projection drift (stale attributes served) | M | M | Projection versioning + rebuild capability; freshness stamps surfaced in UX (staleness chips already spec'd) |

#### Alternatives Considered & Trade-offs

- **Hand-coded ranking/classification algorithms** — rejected per directive and on merits (maintenance trap, transliteration/NL infeasible at team scale). Trade-off: quality becomes prompt/eval discipline — accepted with Part E as the counterweight.
- **Query-time LLM ranking ("re-rank top 100 with the model")** — rejected: breaks determinism (FS-02.03), adds per-query cost and latency, makes CC-001 explanations narrative rather than computational. Revisit trigger logged (S3, if precomputed ranking hits quality ceiling — would require a determinism-preserving design).
- **Fine-tuning models on our data** — rejected (ADR-002); RAG reference frames + rubrics capture domain knowledge portably.
- **Elasticsearch-class heavy engine** — rejected v1: ops weight vs. Meilisearch/Typesense simplicity at our scale; criteria allow revisiting at 10^7+ docs (Doc 16 trigger).
- **Embedding-first architecture (vector as primary store)** — rejected: hard filters and explainable ranking are the product's spine; vectors are an S2 recall enhancer.

#### Gap Analysis Report

- Controlled niche vocabulary (flagged Doc 8) still undefined — now **blocking** T-A classifier rubrics; assigned to Doc 18 with PK-relevant categories; interim spike may use a provisional 40-category list.
- Diaspora-calibration reference frame content (C3 source 2) depends on ground-truth panel completion — sequenced with the spike.
- Similarity search (S2) UX ("more like this" entry points) not yet in Doc 11 flows — minor; log to Doc 13 matrix-first rule when S2 scoping starts.
- Prompt Registry tooling (storage, review workflow) unspecified — Doc 25 (engineering standards) to place it in the repo/review pipeline.
- Eval-harness runtime (where evals execute in CI) → Doc 26.

#### Cross-References & Decision Traceability

**ADR-SEARCH-001 — Accepted (final; Living Thread closed at macro and micro level). ADR-018 (write-path intelligence / read-path determinism) — Accepted. ADR-019 (Prompt Registry: prompts as versioned, schema-bound, eval-gated artifacts) — Accepted.** Implements Doc 8 constraint funnel in full: NFR-P01/02 (B1/B2), determinism (B3), A3 (B1 variant strategy + B2), A4 (C2 grounding mechanization), A5/3× guardrail (Part D), T5 fairness (B3), CC-001 (computational explanations), CC-003 (C1 T-B task + A-054). R-PRD-004 now mechanically enforced (grounding validator). Directive traceability: Translator = B2, Analyst = C1/C3, Classifier = T-A tasks, Hybrid execution = ADR-018 + B1.

#### Open Questions & External Dependencies

1. Spike results across golden sets (A-052/053/054) — the project's gating technical evidence.
2. Index engine + LLM provider + inference-host selection (Doc 17, criteria fixed here).
3. Niche vocabulary v1 (Doc 18, interim list for spike).
4. Embedding model choice + vector co-location (Doc 17, S2 timeline).
5. OD-001 pricing interaction: live-search credit price awaits Part D spike telemetry.

#### Future Revision Triggers

Eval-gate failures on model swaps; T-C escalation >10% sustained (A-056); chip-edit rate >40%; injection incident (R-SEC-006); index scale approaching engine limits; query-time re-ranking revisit trigger (S3 quality ceiling); provider pricing shift >25% (R-FIN-010).

#### Review Checklist & Validation Criteria

- [ ] ADR-SEARCH-001 finalized with context/decision/alternatives/consequences/status. ✅
- [ ] Zero LLM tokens on filtered search; ≤1 cheap call on NL search. ✅
- [ ] All LLM outputs schema-validated; evidence mechanically grounded. ✅
- [ ] Every score reproducible (payload + prompt version + model version). ✅
- [ ] Cost controls structural (write-path exclusivity + budgets), not aspirational. ✅
- [ ] Zero code, zero prompt text (governed artifacts deferred to registry). ✅
- [ ] Sign-off: Principal Architects (AI/Search, Software, Data), CPO (ranking-weight governance), Engineering Director; Qwen review of prompt-governance and determinism assertions.

---

[AWAITING APPROVAL]
