# RB-queue-backlog

**Trigger:** Queue depth > 1000 for > 5 min, or `oldest_message_age_s` > 900
**Severity:** Sev3; escalates Sev2 at 30 min
**Impact:** Delayed processing — users see stale data, jobs take longer

## Diagnosis

1. Check queue depth and oldest message age:
   ```
   mushin.queue.depth by queue_class
   mushin.queue.oldest_message_age_s by queue_class
   ```

2. Identify which queue class is backing up

3. Check worker health and processing rate:
   ```
   mushin.jobs.completed by job_type
   mushin.jobs.failed by job_type
   ```

4. Check for provider outages (Meilisearch, LLM, Serper):
   ```
   mushin.adapter.circuit_state by adapter
   ```

5. Check for recent traffic spikes

## Remediation

1. **If provider outage:**
   - Circuit breakers should activate automatically
   - Monitor for provider recovery
   - Consider scaling workers for remaining queues

2. **If worker crash/restart:**
   - Verify workers are running
   - Check worker logs for errors
   - Restart workers if needed

3. **If traffic spike:**
   - Scale workers horizontally
   - Consider rate limiting new submissions
   - Monitor queue depth until normalized

4. **If queue misconfigured:**
   - Check SQS queue settings
   - Verify visibility timeout
   - Check message retention period

## Escalation

- If backlog > 30 min → escalate to Sev2
- If affecting billing/ledger → escalate to Sev1
- If multiple queue classes affected → page engineering

## Post-Incident

- [ ] Verify all backlogged messages processed
- [ ] Review worker scaling policies
- [ ] Add queue depth alerting at lower thresholds
