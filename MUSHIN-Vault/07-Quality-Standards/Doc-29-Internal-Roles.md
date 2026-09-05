---
type: quality
doc-id: 29
status: draft
created: "2026-07-05"
---

# Doc-29: Internal Roles

## Overview

Team roles and responsibilities for MUSHIN platform development.

## Roles

| Role | Responsibilities | Owner |
|------|-----------------|-------|
| Tech Lead | Architecture decisions, code review | |
| Backend Engineer | API, workers, database | |
| Frontend Engineer | UI, client-side logic | |
| DevOps / SRE | Infrastructure, CI/CD, monitoring | |
| QA | Testing, quality assurance | |

## RACI Matrix

| Activity | Tech Lead | Backend | Frontend | DevOps | QA |
|----------|-----------|---------|----------|--------|-----|
| Architecture | R/A | C | C | C | I |
| API Design | A | R | C | I | I |
| Database Schema | A | R | I | C | I |
| CI/CD Pipeline | C | C | I | R/A | C |
| Testing Strategy | A | C | C | C | R |

## References

- [[07-Quality-Standards/Doc-25-Engineering-Standards|Engineering Standards]]
- [[06-Operations/Doc-27-Incident-Response|Incident Response]]
- [[01-Architecture/_Architecture-MOC|Architecture]]
