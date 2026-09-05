# Incident Channel Template

**Channel Name:** `#inc-{{date}}-{{slug}}`

---

## Initial Situation Summary (Post within 15 min of ack)

```
🚨 INCIDENT DECLARED — Sev{{severity}}

**Time:** {{timestamp}}
**Incident Commander:** {{IC name}}
**Technical Lead:** {{TL name}}
**Communications Lead:** {{CL name}}

**Summary:** {{1-2 sentence description}}

**Impact:** {{who/what is affected, in customer terms}}

**Current Status:** Investigating

**Next Update:** {{time}}
```

---

## Status Update Template (Every 30 min for Sev1, 60 min for Sev2)

```
📋 STATUS UPDATE — {{timestamp}}

**Status:** {{Investigating | Identified | Monitoring | Resolved}}

**What we know:**
- {{finding 1}}
- {{finding 2}}

**What we're doing:**
- {{action 1}}
- {{action 2}}

**Customer impact:** {{description}}

**Next update:** {{time}}
```

---

## Resolution Template

```
✅ INCIDENT RESOLVED — {{timestamp}}

**Duration:** {{total duration}}
**Root Cause:** {{description}}
**Resolution:** {{what was done}}

**Customer Impact:**
- {{impact summary}}

**Follow-up:**
- [ ] PIR scheduled for {{date}}
- [ ] Action items tracked in {{ticket system}}
```

---

## Escalation Matrix

| Condition | Action |
|-----------|--------|
| Sev1 declared | Page IC + TL + CL |
| Data breach suspected | Engage legal (Doc 21 §8) |
| >15 min without update | Escalate to engineering manager |
| Customer data exposed | Begin breach notification clock |
| Multiple systems affected | Declare Sev1 |
