# MUSHIN 2.0 — Disaster Recovery Audit

**Date:** 2026-07-11
**Status:** DR procedures and recovery planning

---

## 1. Current State Assessment

### What Exists

| Component | Status | Evidence |
|-----------|--------|----------|
| Database backups | **INFRASTRUCTURE** | Supabase PITR available |
| Migration versioning | **VERIFIED_CODE** | 9 migrations with version tracking |
| Worker graceful shutdown | **VERIFIED_CODE** | SIGTERM/SIGINT handling, 10s timeout |
| Health checks | **VERIFIED_RUNTIME** | Database + Meilisearch checks |

### What's Missing

| Component | Status | Impact |
|-----------|--------|--------|
| Backup verification | **NOT TESTED** | No restore testing |
| DR runbook | **DOCUMENTED_ONLY** | DOC-027 exists but not tested |
| Recovery testing | **NOT TESTED** | No DR drills |
| RTO/RPO definition | **DOCUMENTED_ONLY** | Not measured |

---

## 2. Recovery Targets

### RTO (Recovery Time Objective)

| Component | Target | Justification |
|-----------|--------|---------------|
| API Server | 5 minutes | Container restart or redeploy |
| Database | 15 minutes | Supabase PITR restore |
| Meilisearch | 30 minutes | Index rebuild from Postgres |
| Redis | 5 minutes | Ephemeral, rebuilds automatically |
| Workers | 5 minutes | Container restart |

### RPO (Recovery Point Objective)

| Component | Target | Justification |
|-----------|--------|---------------|
| Database | 5 minutes | Supabase PITR (continuous backup) |
| Meilisearch | 1 hour | Rebuild from Postgres snapshots |
| Redis | 0 (lossy) | Cache only, no durability required |
| Outbox events | 5 minutes | Same as database RPO |

---

## 3. Backup Procedures

### Database (Supabase Postgres)

| Procedure | Status | Details |
|-----------|--------|---------|
| Automated backups | **ACTIVE** | Supabase PITR (continuous) |
| Point-in-time recovery | **AVAILABLE** | Restore to any point in last 7 days |
| Manual backup | **AVAILABLE** | pg_dump via Supabase dashboard |
| Cross-region backup | **NOT CONFIGURED** | Single region (ap-south-1) |

**Backup command:**
```bash
# Via Supabase CLI
supabase db dump --db-url $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Meilisearch

| Procedure | Status | Details |
|-----------|--------|---------|
| Snapshot backup | **NOT CONFIGURED** | No automated snapshots |
| Rebuild from Postgres | **AVAILABLE** | Projection function exists |
| Index export | **AVAILABLE** | Meilisearch API supports dump |

**Recovery procedure:**
1. Recreate `creators` index via API
2. Configure filterable/sortable/searchable attributes
3. Run `projectCreatorsToIndex()` for all creators
4. Verify search functionality

### Redis (Upstash)

| Procedure | Status | Details |
|-----------|--------|---------|
| Persistence | **NOT REQUIRED** | Cache only, no durability needed |
| Recovery | **AUTOMATIC** | Rebuilds from API calls |
| Rate limit state | **LOSSY** | Falls back to in-memory |

---

## 4. Restore Procedures

### Database Restore

```bash
# 1. Stop API server
# 2. Restore from backup
psql $DATABASE_URL < backup-20260711.sql

# 3. Or use Supabase PITR
# Via dashboard: Database → Backups → Restore to specific time

# 4. Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM gcp.creator;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM wp.workspace;"

# 5. Restart API server
```

### Meilisearch Restore

```bash
# 1. Create index
curl -X POST "https://ms-99e619050387-51371.sgp.meilisearch.io/indexes" \
  -H "Authorization: Bearer $MEILISEARCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"uid":"creators","primaryKey":"id"}'

# 2. Configure settings
curl -X PATCH "https://ms-99e619050387-51371.sgp.meilisearch.io/indexes/creators/settings" \
  -H "Authorization: Bearer $MEILISEARCH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"filterableAttributes":["platform","followerCount","primaryNiche","authenticityBand"],...}'

# 3. Reproject from Postgres
# Run projectCreatorsToIndex() for all creators
```

### Worker Recovery

```bash
# 1. Workers auto-restart via process manager
# 2. Scheduled jobs resume on timer
# 3. SQS messages remain in queue ( visibility timeout )
# 4. Outbox events remain in database
```

---

## 5. Recovery Testing

### Test Scenarios

| Scenario | Test Method | Expected Result |
|----------|-------------|-----------------|
| Database failover | Supabase dashboard | Automatic, < 1 min |
| Database restore | pg_dump/restore | Data intact, < 15 min |
| Meilisearch rebuild | Index recreation | Search functional, < 30 min |
| API server restart | Kill + restart | Health checks pass, < 5 min |
| Worker restart | Kill + restart | Scheduled jobs resume |
| Redis failure | Disconnect | Rate limiting falls back to memory |

### DR Drill Schedule

| Frequency | Test | Owner |
|-----------|------|-------|
| Monthly | Database backup verification | SRE |
| Quarterly | Full restore test | SRE |
| Quarterly | Meilisearch rebuild test | Engineering |
| Annually | Full DR simulation | Team |

---

## 6. Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **SEV1** | Service down, data loss risk | 15 min | Founder immediately |
| **SEV2** | Service degraded, major feature broken | 1 hour | Founder within 1 hour |
| **SEV3** | Minor feature broken, workaround exists | 4 hours | Next business day |
| **SEV4** | Cosmetic issue, enhancement request | 24 hours | Sprint backlog |

### Communication Templates

**SEV1 - Service Down:**
```
[MUSHIN Status] Service Disruption

We're experiencing a service disruption affecting [feature].
Our team is investigating and working to restore service.

Updates: [status page URL]
Estimated resolution: [time]
```

**SEV2 - Service Degraded:**
```
[MUSHIN Status] Performance Issue

We're experiencing [issue] that may affect [feature].
Some users may experience [symptom].

We're working to resolve this. Updates: [status page URL]
```

---

## 7. Classification

| Component | Classification |
|-----------|---------------|
| Database backups (PITR) | **INFRASTRUCTURE** (Supabase) |
| Database restore | **VERIFIED_CODE** (procedure exists) |
| Meilisearch rebuild | **VERIFIED_CODE** (procedure exists) |
| Worker recovery | **VERIFIED_CODE** (graceful shutdown) |
| DR runbook | **DOCUMENTED_ONLY** (DOC-027) |
| DR testing | **NOT TESTED** |
| RTO/RPO targets | **DOCUMENTED_ONLY** |
| Incident response | **DOCUMENTED_ONLY** |

---

## 8. Recommendations

### For MVP Launch
1. Verify Supabase PITR is enabled
2. Document restore procedure in runbook
3. Test database restore on staging

### For Production Hardening
1. Set up DR drills (quarterly)
2. Implement automated backup verification
3. Configure cross-region backup
4. Add Meilisearch snapshot backups

### Estimated Effort

| Task | Effort |
|------|--------|
| PITR verification | 0.5 days |
| Restore procedure testing | 1 day |
| DR runbook refinement | 1 day |
| DR drill setup | 1 day |
| **Total** | **3.5 days** |
