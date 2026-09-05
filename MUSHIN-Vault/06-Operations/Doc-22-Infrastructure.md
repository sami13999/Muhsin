---
type: operations
doc-id: 22
status: draft
created: "2026-07-05"
---

# Doc-22: Infrastructure

## Overview

Infrastructure stack, cloud services, and environments for MUSHIN platform.

## Environments

| Env | Purpose | Provider |
|-----|---------|----------|
| dev | Development | GCP |
| staging | Pre-production | GCP |
| prod | Production | GCP |

## Services

- **Compute** — Cloud Run, Cloud Functions
- **Database** — Cloud SQL (PostgreSQL)
- **Storage** — Cloud Storage
- **Messaging** — Pub/Sub
- **Observability** — Cloud Monitoring, Cloud Logging

## Networking

- VPC with private subnets
- Cloud CDN for static assets
- Cloud Armor for DDoS protection

## References

- [[06-Operations/Doc-23-Observability|Observability]]
- [[06-Operations/Doc-26-CICD|CI/CD]]
- [[04-Functions/_Functions-MOC|Functions]]
- [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security & Compliance]]
