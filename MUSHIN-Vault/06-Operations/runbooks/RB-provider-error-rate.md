# RB-provider-error-rate

**Trigger:** `adapter.errors`/`adapter.calls` > 5% over 5 min per adapter
**Severity:** Sev3; Sev2 if circuit opens on Paddle or LLM
**Impact:** Degraded functionality — search, discovery, or billing affected

## Diagnosis

1. Check adapter error rates:
   ```
   mushin.adapter.errors by adapter
   mushin.adapter.calls by adapter
   ```

2. Check circuit breaker states:
   ```
   mushin.adapter.circuit_state by adapter
   ```

3. Check provider status pages:
   - Meilisearch: status.meilisearch.com
   - Groq: status.groq.com
   - Paddle: status.paddle.com
   - Apify: status.apify.com
   - Serper: status.serper.dev
   - Resend: status.resend.com

4. Check if errors are transient or persistent

5. Check for API key issues or quota exhaustion

## Remediation

1. **If provider outage:**
   - Wait for provider recovery (check status page)
   - Circuit breakers should activate automatically
   - Monitor for recovery

2. **If API key/quota issue:**
   - Rotate API key if compromised
   - Add credits if quota exhausted
   - Contact provider support

3. **If our code bug:**
   - Check recent deployments
   - Review adapter code for issues
   - Rollback if needed

4. **If rate limiting by provider:**
   - Reduce request rate
   - Implement request queuing
   - Contact provider for limit increase

## Escalation

- If Paddle circuit open → Sev2 (billing affected)
- If LLM circuit open → Sev2 (AI features affected)
- If multiple providers affected → page engineering

## Post-Incident

- [ ] Verify all affected requests recovered
- [ ] Review adapter retry logic
- [ ] Add provider health dashboard
