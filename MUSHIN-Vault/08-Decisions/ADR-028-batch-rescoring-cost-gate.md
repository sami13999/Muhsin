---
title: ADR-028 Batch Re-Scoring Cost Gate & Governance
type: adr
status: accepted
date: 2026-07-06
tags: [adr, decisions, cost, governance, doc-15, doc-17]
---

# ADR-028: Batch Re-Scoring Cost Gate & Governance

## Status
Accepted (2026-07-06)

## Context
In the Two-Brains architecture (ADR-016), creator profiles are ingested via Brain 2 (Serper → Apify / YouTube API → LLM M6 Scoring) and projected into Brain 1 (Meilisearch/Typesense) as structured attributes. 

Over time, prompt rubrics in the Prompt Registry (ADR-019), controlled niche vocabularies (Doc 18), or underlying LLM models (Groq/Anthropic/OpenAI) will be upgraded. When this occurs, existing creator profiles stored in GCP and the search index may require batch re-scoring to maintain analytical consistency and freshness.

However, executing batch re-scoring across an index of $10^5$ to $10^7$ creators using frontier reasoning models (Tier T-C) or mid-tier models (Tier T-B) introduces severe financial risk. Uncontrolled batch re-scoring could easily cause massive unexpected API expenditures, violating the mandatory **3× COGS margin guardrail** established in Doc 3 and operationalized in Doc 10 (FS-10.03).

## Decision
We adopt a mandatory governance gate and structural cost-control protocol for all batch re-scoring operations:

1. **Executive Cost Approval Gate:** Any batch re-scoring job affecting **>1,000 creators** MUST require explicit, written cost-approval from the Chief Product Officer (CPO) and Finance/CFO before execution. The request must include an automated cost estimate generated from pilot sampling.
2. **Archive-Only Ingestion (No Re-Scraping):** Batch re-scoring MUST execute exclusively against archived raw payload data stored in GCP (Doc 14/15). Re-scoring jobs are strictly prohibited from triggering live network re-scraping via Apify actors or the YouTube Data API v3.
3. **Semantic Deduplication:** Re-scoring pipelines MUST evaluate content-signature hashes across payload sections. Sections whose underlying raw data has not changed since the last scoring run MUST be skipped (Doc 15 Part D3).
4. **Model Tier Restraint:** Batch re-scoring jobs default strictly to Tier T-A (`llama-3.1-8b-instant` via Groq) or Tier T-B (`llama-3.3-70b-versatile` via Groq). Tier T-C frontier models (Claude 3.5 Sonnet / OpenAI o1) may NOT be used in batch re-scoring without an explicit override in the CPO approval document.

## Consequences

### Positive
- **Guaranteed Margin Protection:** Prevents accidental cloud/API budget blowouts and preserves the company-survival 3× COGS guardrail.
- **Decoupled Costs:** Allows prompt engineers to iterate on rubrics without creating immediate, unbounded operational liabilities.
- **High Performance:** Reading from GCP payload archives and leveraging Groq LPUs ensures batch re-scoring completes rapidly at minimal unit cost.

### Negative / Trade-offs
- **Administrative Friction:** Requires CPO/Finance sign-off before rolling out major rubric upgrades across the historical index.
- **Staleness Tolerance:** Profiles whose raw metrics haven't changed will retain older scores until a live refresh is triggered by a user or scheduled maintenance.

## References
- [[01-Architecture/two-brains-model|Two-Brains Architecture (ADR-016 / ADR-018)]]
- [[01-Architecture/Doc-15-AI-Intelligence-Layer|Doc 15: AI Intelligence & Search Architecture]]
- [[01-Architecture/Doc-10-Billing-Admin|Doc 10: Billing, Analytics & Administration (FS-10.03)]]
