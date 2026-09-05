# RB-tenancy-isolation

**Trigger:** `authz.workspace_mismatch` > 0 sustained (>5 in 5 min from one principal)
**Severity:** Sev1 (single events Sev3-logged; burst pattern pages)
**Impact:** Potential cross-tenant data leakage — customer data exposed to wrong workspace

## Diagnosis

1. Check Axiom for `authz.workspace_mismatch` events:
   ```
   source:mushin level:warn message:"AUTHZ_WORKSPACE_MISMATCH"
   | stats count by actor_id, workspace_id
   ```

2. Identify the offending principal (user_id from JWT claims)

3. Check if the principal has legitimate multi-workspace access:
   ```
   SELECT * FROM wp.membership WHERE user_id = '<actor_id>' AND status = 'active'
   ```

4. Check for automated scraping or bot activity on the affected endpoints

5. Review recent deployments that may have affected tenancy middleware

## Remediation

1. **Immediate (if active attack):**
   - Disable the offending user account: `UPDATE wp.membership SET status = 'suspended' WHERE user_id = '<actor_id>'`
   - Block IP at Cloudflare WAF level

2. **If legitimate multi-workspace user:**
   - Verify the user is targeting the correct workspace
   - Check if X-Workspace-ID header is being set correctly by frontend
   - Review tenancy middleware for bugs

3. **If middleware bug:**
   - Rollback to previous deploy
   - Hotfix tenancy middleware if needed
   - Deploy fix via canary

## Escalation

- If data breach confirmed → escalate to Sev1, engage legal (Doc 21 §8)
- If user account compromised → rotate credentials, notify user
- If systematic bug → page engineering lead

## Post-Incident

- [ ] Verify no data was actually leaked (check GCP table access logs)
- [ ] Notify affected users if data exposure confirmed
- [ ] File incident report
- [ ] Add regression test for the failure mode
