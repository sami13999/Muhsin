# RB-sweeper-rate

**Trigger:** `credits.swept` > 5/h
**Severity:** Sev3 (upstream settlement failures — PATCH-005 telemetry)
**Impact:** Credit reservations not being released — workspace credits locked

## Diagnosis

1. Check sweeper rate:
   ```
   mushin.credits.swept
   ```

2. Check for stale reservations:
   ```
   SELECT COUNT(*) FROM wp.credit_reservation
   WHERE status = 'active' AND created_at < NOW() - INTERVAL '1 hour'
   ```

3. Check sweeper worker health:
   ```
   mushin.jobs.completed by job_type = 'reservation-sweeper'
   mushin.jobs.failed by job_type = 'reservation-sweeper'
   ```

4. Check for subscription state issues:
   ```
   SELECT workspace_id, subscription_status FROM wp.workspace
   WHERE subscription_status != 'active'
   ```

5. Check for TTL configuration (should be 30 min)

## Remediation

1. **If sweeper worker down:**
   - Restart sweeper worker
   - Verify cron schedule is correct
   - Check worker logs

2. **If high stale reservation count:**
   - Check if sweeper is running
   - Verify TTL threshold (30 min default)
   - Manual sweeper trigger if needed

3. **If subscription state issue:**
   - Verify Paddle webhook processing
   - Check subscription state machine
   - Manual state correction if needed

4. **If TTL too short:**
   - Increase TTL threshold
   - Monitor sweeper rate after change

## Escalation

- If sweeper rate > 20/h → page engineering
- If credits locked for > 1 hour → escalate to Sev2
- If affecting multiple workspaces → page on-call

## Post-Incident

- [ ] Verify all stale reservations released
- [ ] Check credit balance accuracy
- [ ] Review sweeper TTL configuration
