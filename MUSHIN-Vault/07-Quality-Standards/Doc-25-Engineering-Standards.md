---
type: quality
doc-id: 25
status: draft
created: "2026-07-05"
---

# Doc-25: Engineering Standards

## Overview

Coding standards, review process, and quality gates for MUSHIN platform.

## Code Style

- ESLint for TypeScript/JavaScript
- Prettier for formatting
- Language-specific conventions per module

## Code Review

- Minimum 1 approval required
- Checklist: Security, performance, testing, documentation
- See [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]

## Quality Gates

- All tests pass
- Code coverage meets target (see [[07-Quality-Standards/Doc-24-Testing-Strategy|Testing Strategy]])
- No critical linting errors
- Documentation updated

## Documentation Standards

- API documentation via [[03-API/Doc-20-API-Design|API Design]]
- Architecture docs in [[01-Architecture/_Architecture-MOC|Architecture]]
- Database schema in [[02-Database/_Database-MOC|Database]]

## References

- [[07-Quality-Standards/Doc-24-Testing-Strategy|Testing Strategy]]
- [[07-Quality-Standards/Doc-29-Internal-Roles|Internal Roles]]
- [[06-Operations/Doc-26-CICD|CI/CD]]
- [[00-Meta/Conventions|Conventions]]
