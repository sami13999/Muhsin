# RB-webhook-signature-failure

**Trigger:** `webhook.signature_failures` > 10 in 5 min per source
**Severity:** Sev2 (possible forged webhooks — R-SEC-007)
**Impact:** Billing events not processed, or forged events being accepted

## Diagnosis

1. Check webhook signature failure rate:
   ```
   mushin.webhook.signature_failures by source
   ```

2. Identify the source (Paddle, etc.)

3. Check if failures are from:
   - Legitimate webhooks with wrong signature (config issue)
   - Forged webhooks (security incident)
   - Webhook secret rotation not completed

4. Check webhook payload contents (if available in logs)

5. Verify webhook secret is correctly configured:
   ```
   PADDLE_WEBHOOK_SECRET should match Paddle dashboard
   ```

## Remediation

1. **If config issue:**
   - Verify webhook secret matches provider dashboard
   - Check for trailing whitespace or encoding issues
   - Update environment variable

2. **If webhook secret rotated:**
   - Update secret in both provider dashboard and environment
   - Verify new secret works
   - Old webhooks during rotation window are expected to fail

3. **If forged webhooks detected:**
   - DO NOT process the webhook
   - Block source IP
   - Investigate source
   - Escalate to security team

4. **If provider issue:**
   - Check provider status page
   - Contact provider support
   - Monitor for resolution

## Escalation

- If forged webhooks confirmed → Sev1, engage security
- If billing affected → page on-call
- If multiple sources affected → page engineering

## Post-Incident

- [ ] Verify no forged events were processed
- [ ] Review webhook verification logic
- [ ] Add webhook source IP logging
