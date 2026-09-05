---
type: architecture
doc-id: 17
status: draft
created: "2026-07-05"
---

# Doc-17: System Architecture

## Overview

High-level system architecture for MUSHIN platform, including the Two-Brains model and module structure.

## Components

- [[02-Database/_Database-MOC|Database Layer]] — Data persistence across gcp, wp, platform schemas
- [[03-API/_API-MOC|API Layer]] — RESTful endpoints with RBAC
- [[04-Functions/_Functions-MOC|Functions Layer]] — Workers and edge functions
- [[05-Security-Legal/Doc-21-Security-Privacy-Compliance|Security Layer]] — Auth, encryption, compliance

## Data Flow

1. API requests → [[03-API/_API-MOC|API endpoints]]
2. Business logic → [[04-Functions/_Functions-MOC|Workers]]
3. Events → [[02-Database/tables/platform/platform.outbox|Outbox pattern]]
4. Async processing → [[04-Functions/workers/outbox-relay|Outbox Relay]]

## Diagrams

<!-- Embed or link architecture diagrams -->

## References

- [[01-Architecture/Doc-18-Domain-Model|Domain Model]]
- [[01-Architecture/two-brains-model|Two Brains Model]]
- [[02-Database/Doc-19-Physical-Schema|Physical Schema]]
- [[03-API/Doc-20-API-Design|API Design]]
- [[04-Functions/_Functions-MOC|Functions]]
