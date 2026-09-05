# PagerDuty Setup — MUSHIN 2.0

**Status:** Ready for execution
**Estimated time:** 1-2 hours

---

## Prerequisites

- PagerDuty account (free tier available)
- Grafana Cloud account (from T36)

---

## 1. Create PagerDuty Service

1. Go to Services → Service Directory → New Service
2. Name: `MUSHIN Production`
3. Integration Type: Events API v2
4. Escalation Policy: Create new (see §2)

---

## 2. Create Escalation Policy

1. Go to Escalation Policies → New Escalation Policy
2. Name: `MUSHIN On-Call`
3. Configure rotation:
   - **Schedule:** Weekly rotation (Monday-Sunday)
   - **Primary:** Engineering team member
   - **Secondary:** Another team member
   - **Tertiary:** CTO/Founder (for Sev1)

### Escalation Rules
| Rule | Delay | Action |
|------|-------|--------|
| 1 | 0 min | Page primary on-call |
| 2 | 15 min | Page secondary on-call |
| 3 | 30 min | Page tertiary (CTO/Founder) |

---

## 3. Create Integration

1. Go to Services → MUSHIN Production → Integrations
2. Click "New Integration"
3. Name: `Grafana Cloud`
4. Integration Type: Events API v2
5. Copy the Integration Key (routing key)

---

## 4. Configure Grafana → PagerDuty

### Option A: Grafana OnCall (Recommended)
1. Go to Grafana → Alerting → Contact points
2. Add new contact point: Type = PagerDuty
3. Enter Integration Key from step 3
4. Map severity levels:
   - Sev1/Sev2 → PagerDuty (page)
   - Sev3 → Slack/Email
   - Sev4 → Weekly digest

### Option B: Direct Integration
1. Go to Grafana → Alerting → Contact points
2. Add new contact point: Type = Webhook
3. URL: `https://events.pagerduty.com/v2/enqueue`
4. Method: POST
5. Headers:
   - `Content-Type: application/json`
   - `X-Routing-Key: YOUR_INTEGRATION_KEY`
6. Body template:
```json
{
  "routing_key": "YOUR_INTEGRATION_KEY",
  "event_action": "trigger",
  "payload": {
    "summary": "{{ .CommonAnnotations.summary }}",
    "source": "grafana",
    "severity": "{{ .CommonLabels.severity }}",
    "component": "mushin",
    "group": "mushin-alerts",
    "class": "monitoring",
    "custom_details": {
      "dashboard": "{{ .ExternalURL }}",
      "description": "{{ .CommonAnnotations.description }}"
    }
  }
}
```

---

## 5. Create Notification Policies

### Grafana Alerting → Notification Policies

| Policy | Match | Route To |
|--------|-------|----------|
| Sev1 | `severity=critical` | PagerDuty (page) |
| Sev2 | `severity=warning` | PagerDuty (page) |
| Sev3 | `severity=info` | Slack/Email |
| Sev4 | `severity=info` | Weekly digest |

---

## 6. Create Runbook Links

1. Go to Grafana → Alerting → Alert rules
2. For each alert rule, add annotation:
   - `runbook_url`: Link to corresponding runbook in vault
   - Example: `https://github.com/.../MUSHIN-Vault/06-Operations/runbooks/RB-tenancy-isolation.md`

---

## 7. Test Integration

1. Go to Grafana → Alerting → Alert rules
2. Create test alert rule:
   - Name: `Test Alert`
   - Condition: Always true
   - Notification policy: Sev1 (PagerDuty)
3. Verify PagerDuty receives the alert
4. Acknowledge and resolve in PagerDuty
5. Delete test alert rule

---

## 8. Environment Variables

Add to `.env`:
```bash
PAGERDUTY_INTEGRATION_KEY="your-integration-key"
PAGERDUTY_ROUTING_KEY="your-routing-key"
```

---

## 9. On-Call Schedule Setup

1. Go to PagerDuty → Schedules
2. Create schedule: `MUSHIN Engineering`
3. Add team members
4. Set rotation: Weekly (Mon-Sun)
5. Link to escalation policy

---

## Post-Setup Checklist

- [ ] PagerDuty service created
- [ ] Escalation policy configured
- [ ] Integration created with routing key
- [ ] Grafana → PagerDuty integration configured
- [ ] Notification policies mapped
- [ ] Test alert sent and received
- [ ] On-call schedule configured
- [ ] Runbook links added to alert rules
