# RB-database-outage

**Trigger:** Database connectivity loss, health check failure, connection errors spike
**Severity:** Sev1 (total outage)
**Impact:** All write operations fail, reads may serve stale data

## Diagnosis

1. Check database connectivity:
   ```
   mushin.health.checks.database
   ```

2. Check Supabase dashboard for status:
   - Go to Supabase dashboard → Health
   - Check connection count, CPU, memory

3. Check for connection pool exhaustion:
   ```
   SELECT count(*) FROM pg_stat_activity
   ```

4. Check for long-running transactions:
   ```
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes'
   ```

5. Check for replication lag (if read replicas exist)

## Remediation

1. **If connection pool exhaustion:**
   - Kill long-running queries
   - Increase pool size temporarily
   - Identify and fix query causing exhaustion

2. **If Supabase outage:**
   - Check Supabase status page
   - Enable degraded mode (serve from cache)
   - Notify users of potential delays

3. **If our code issue:**
   - Check recent deployments
   - Rollback if needed
   - Fix connection handling

4. **If hardware failure:**
   - Supabase handles failover automatically
   - Monitor for recovery
   - Verify data consistency after recovery

## Escalation

- If outage > 5 min → page engineering
- If outage > 15 min → escalate to Sev1
- If data loss suspected → engage legal (Doc 21 §8)

## Post-Incident

- [ ] Verify data consistency post-recovery
- [ ] Check for missed events in outbox
- [ ] Verify credit ledger accuracy
- [ ] Review connection pool configuration
