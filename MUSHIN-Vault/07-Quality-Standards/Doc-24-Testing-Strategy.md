---
type: quality
doc-id: 24
status: draft
created: "2026-07-05"
---

# Doc-24: Testing Strategy

## Overview

Testing philosophy, coverage targets, and test pyramid for MUSHIN platform.

## Test Types

| Type | Scope | Tool | Coverage Target |
|------|-------|------|-----------------|
| Unit | Functions, classes | Jest | 80% |
| Integration | API endpoints | Supertest | 70% |
| E2E | User flows | Playwright | Critical paths |

## Test Environments

- **Local** — Developer machine
- **CI** — GitHub Actions
- **Staging** — Pre-production environment

## Test Data

- Fixtures for unit tests
- Seed data for integration tests
- Synthetic data for E2E tests

## References

- [[07-Quality-Standards/Doc-25-Engineering-Standards|Engineering Standards]]
- [[06-Operations/Doc-26-CICD|CI/CD]]
- [[02-Database/_Database-MOC|Database]]
- [[03-API/_API-MOC|API]]
