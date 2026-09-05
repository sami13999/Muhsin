# RB-dlq-nonempty

**Trigger:** `queue.dlq_depth` > 0 for > 1 min (prod business queues)
**Severity:** Sev2 (prod queues); Sev3 (q-rescore-low)
**Impact:** Events failing to process — potential data inconsistency, delayed actions

## Diagnosis

1. Check DLQ depth in Axiom/Grafana:
   ```
   mushin.queue.dlq_depth
   ```

2. Identify which queue class has DLQ messages:
   ```
   SELECT queue_class, COUNT(*) FROM dead_letter_messages
   GROUP BY queue_class
   ```

3. Check recent error rates on workers:
   ```
   mushin.adapter.errors by adapter, error_code
   ```

4. Check for recent deployments that may have broken event handlers

5. Review DLQ message contents (payload, error, stack trace)

## Remediation

1. **If transient provider error:**
   - Wait for provider recovery
   - Replay DLQ messages after fix

2. **If handler bug:**
   - Fix the bug
   - Deploy fix
   - Replay DLQ messages

3. **If poison message:**
   - Quarantine the message
   - Fix the payload format
   - Replay after fix

4. **If queue class misconfigured:**
   - Verify queue permissions
   - Check IAM policies
   - Fix configuration

## Escalation

- If DLQ depth > 100 → page engineering
- If DLQ growing continuously → page on-call
- If affecting billing/ledger → escalate to Sev1

## Post-Incident

- [ ] Verify all DLQ messages processed or quarantined
- [ ] Add monitoring for DLQ growth rate
- [ ] Review handler error handling
