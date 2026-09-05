# MUSHIN Subprocessor List

*Draft status: template populated with the providers established across this project's architecture. `REVIEW_REQUIRED`: confirm current provider list against actual production configuration before publishing — providers named in architecture documents aren't automatically the same as providers under signed contract.*

**Last updated:** [DATE]. This list is maintained on an ongoing basis; Customers are notified of additions per the Data Processing Agreement.

| Subprocessor | Purpose | Data Categories | Location | DPA/SCC in place? |
|---|---|---|---|---|
| Paddle.com Market Ltd | Payment processing, Merchant of Record | Billing/contact info | UK | `REVIEW_REQUIRED` |
| Supabase | Database and core infrastructure | Customer Data, Creator Data | `REVIEW_REQUIRED: confirm hosting region` | `REVIEW_REQUIRED` |
| Meilisearch Cloud | Search indexing | Creator Data (indexed/derived) | `REVIEW_REQUIRED: confirm region` | `REVIEW_REQUIRED` |
| Apify | Public-data collection infrastructure | Creator Data (source collection) | EU | `REVIEW_REQUIRED` |
| Serper | Search-result retrieval for discovery | Creator Data (source discovery) | `REVIEW_REQUIRED` | `REVIEW_REQUIRED` |
| LLM providers (per the routing ladder — confirm current roster) | Content analysis, scoring, classification | Creator Data (content analyzed) | `REVIEW_REQUIRED` | `REVIEW_REQUIRED` |
| Cloudflare | Object storage, CDN | Creator Data (archived), static assets | Global/`REVIEW_REQUIRED` | `REVIEW_REQUIRED` |
| AWS (SQS) | Queue infrastructure | Event/job metadata | `REVIEW_REQUIRED: confirm region` | `REVIEW_REQUIRED` |
| Resend | Transactional/outreach email delivery | Customer Data, Creator contact data (outreach) | `REVIEW_REQUIRED` | `REVIEW_REQUIRED` |
| Vercel | Application hosting | Customer Data (in transit) | Global/`REVIEW_REQUIRED` | `REVIEW_REQUIRED` |
| Upstash | Caching, rate-limit counters (pending ADR-033 confirmation) | Minimal — counters, cache keys | `REVIEW_REQUIRED` | `REVIEW_REQUIRED` |

## Notes

- This list should be generated from an actual, maintained internal register (ideally the same one referenced in `architecture-state.json`), not re-typed by hand each time it's needed — drift between this page and reality is exactly the kind of gap this whole project has been built to avoid.
- Every `REVIEW_REQUIRED` cell needs an actual answer before this is publishable; a Subprocessor List with unresolved placeholders in the "DPA/SCC in place?" column is a compliance gap in itself, not just an incomplete document.

---

*This completes the 12-document set: Terms of Service, Privacy Policy, Cookie Policy, Refund Policy, Acceptable Use Policy, Data Processing Agreement, Creator Data Usage Policy, AI Usage Disclosure, Copyright Policy, DMCA Policy, Security Policy, and this Subprocessor List.*
