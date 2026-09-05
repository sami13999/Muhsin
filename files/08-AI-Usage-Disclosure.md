# MUSHIN AI Usage Disclosure

*Draft status: first-draft template for attorney review.*

**Last updated:** [DATE]

---

## 1. Where AI Is Used in the Service

- **Cross-platform identity matching** — determining whether profiles on different platforms (Instagram, TikTok, YouTube) likely represent the same real creator.
- **Content and audience analysis** — authenticity scoring, audience-quality estimation, and niche/category classification of public creator content.
- **Natural-language search** — translating a plain-English search query into structured filters against the creator database.

## 2. How Identity Matching Works

Identity matches are produced by a deterministic, rule-based scoring system, not a black-box model: specific evidence (shared verified contact information, matching linked websites, similar usernames, and others) each contribute a defined, published weight toward a confidence score from 0–100. Matches scoring 90 or above are applied automatically; matches scoring 60–89 are held for human review before being applied; matches below 60 are not applied. Every match includes a breakdown of exactly which evidence contributed to the score, available to MUSHIN staff for audit and, on request, summarized for a Creator who asks about their own listing.

## 3. How Content Scoring Works

Authenticity, audience-quality, and niche-classification scores are generated using machine-learning/LLM-based analysis of public profile and content data. Each score is versioned to the specific model and prompt configuration used to produce it, so scores can be explained, audited, and reprocessed if the underlying method is later updated.

## 4. Limitations

These scores are estimates based on publicly available signals, not verified facts. They can be wrong, particularly for creators with limited public data, non-English content, or unusual account histories. Customers should treat scores as one input to a decision, not a substitute for their own judgment.

## 5. Automated Decision-Making

`REVIEW_REQUIRED — important: assess whether any of these scores could be found to produce "legal or similarly significant effects" on a Creator under GDPR Article 22 or equivalent provisions — for example, if a low authenticity score is the primary or sole basis for excluding a creator from opportunities at scale. If so, additional safeguards (a right to request human review of a specific score, a right to an explanation) likely need to be built and disclosed here, not just described in the abstract as "available on request."`

## 6. Not Used to Train Third-Party Models

Creator data and content are used to power MUSHIN's own scoring and search systems. They are not sent to third-party AI providers (whether used for inference within the Service or otherwise) for the purpose of training or improving those providers' general-purpose or foundation models — MUSHIN's use of third-party AI providers is limited to using their models to analyze specific creator content within the Service, under MUSHIN's own data-handling terms with those providers. `REVIEW_REQUIRED — repeating this document set's standing flag one more time because it's the document where it matters most: confirm whether Creator Data, in any form, is used to improve or retrain MUSHIN's own internal models, and state that accurately here specifically, since this is the disclosure a regulator or journalist would go looking for first.`

## 7. Human Oversight

Identity matches in the 60–89% confidence range require human review before being applied (Section 2). MUSHIN staff can review the evidence behind any score. `REVIEW_REQUIRED: confirm whether a similar human-review pathway exists (or should exist) for content-scoring disputes, not just identity matches.`

## 8. Contact

Questions about how a specific score was generated: [PRIVACY/CREATOR REQUEST EMAIL].

---

*Next: Copyright Policy.*
