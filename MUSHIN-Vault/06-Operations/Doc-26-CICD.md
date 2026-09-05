---
type: operations
doc-id: 26
status: draft
created: "2026-07-05"
---

# Doc-26: CI/CD

## Overview

Build, test, and deploy pipeline for MUSHIN platform.

## Pipeline Stages

1. **Lint** — Code quality checks
2. **Test** — Unit, integration, E2E tests
3. **Build** — Docker image creation
4. **Deploy** — Environment promotion

## Environments

| Stage | Target | Approval |
|-------|--------|----------|
| dev | Auto-deploy on merge | None |
| staging | Manual promotion | Tech lead |
| prod | Manual promotion | Team lead |

## Rollback

- Automatic rollback on health check failure
- Manual rollback via Cloud Run revisions
- Database migrations are forward-only

## References

- [[06-Operations/Doc-22-Infrastructure|Infrastructure]]
- [[07-Quality-Standards/Doc-24-Testing-Strategy|Testing Strategy]]
- [[07-Quality-Standards/Doc-25-Engineering-Standards|Engineering Standards]]
- [[06-Operations/Doc-23-Observability|Observability]]
