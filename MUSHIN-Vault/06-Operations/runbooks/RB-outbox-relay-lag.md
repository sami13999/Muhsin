# RB-outbox-relay-lag

**Trigger:** Oldest unrelayed row > 5 min in platform.outbox
**Severity:** Sev2 (ADR-020 — everything downstream depends on this)
**Impact:** Events delayed — search index stale, analytics delayed, billing affected

## Diagnosis

1. Check outbox relay lag:
   ```
   mushin.outbox.relay_lag_s
   ```

2. Check outbox row count and age:
   ```
   SELECT COUNT(*), MIN(created_at) FROM platform.outbox
   WHERE dispatched_at IS NULL
   ```

3. Check relay worker health:
   ```
   mushin.jobs.completed by job_type = 'outbox-relay'
   mushin.jobs.failed by job_type = 'outbox-relay'
   ```

4. Check SQS queue depth for outbox queue:
   ```
   mushin.queue.depth by queue_class = 'q-outbox-relay'
   ```

5. Check for recent deployments affecting relay

## Remediation

1. **If relay worker down:**
   - Restart relay worker
   - Verify SQS connectivity
   - Check IAM permissions

2. **If SQS issue:**
   - Check SQS queue health
   - Verify queue permissions
   - Check message retention

3. **If outbox table bloat:**
   - Check for old undispatched rows
   - Verify dispatch_attempts < maxAttempts
   - Consider partitioning outbox table

4. **If high event volume:**
   - Scale relay instances
   - Increase batch size
   - Monitor processing rate

## Escalation

- If lag > 15 min → page engineering
- If lag > 30 min → escalate to Sev1
- If affecting billing → page on-call immediately

## Post-Incident

- [ ] Verify all events processed
- [ ] Check for duplicate processing
- [ ] Review relay performance metrics
