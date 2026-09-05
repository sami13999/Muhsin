# Post-Incident Review (PIR) Template

**Incident ID:** {{ID}}
**Date:** {{date}}
**Severity:** {{Sev1/Sev2/Sev3}}
**Duration:** {{start time}} — {{end time}} ({{total duration}})
**Incident Commander:** {{name}}

---

## 1. Summary

{{1-2 paragraph summary of what happened, impact, and resolution}}

## 2. Timeline

| Time | Event | Actor |
|------|-------|-------|
| {{time}} | {{event}} | {{who}} |

## 3. Root Cause

{{Detailed root cause analysis}}

## 4. Impact

- **Users affected:** {{number/percentage}}
- **Duration of impact:** {{duration}}
- **Data loss:** {{yes/no — if yes, describe}}
- **Revenue impact:** {{estimated}}

## 5. What Went Well

- {{item 1}}
- {{item 2}}

## 6. What Went Wrong

- {{item 1}}
- {{item 2}}

## 7. Where We Got Lucky

- {{item 1}}

## 8. Action Items

| # | Action | Owner | Priority | Due Date | Status |
|---|--------|-------|----------|----------|--------|
| 1 | {{action}} | {{owner}} | {{P0/P1/P2}} | {{date}} | open |

## 9. Lessons Learned

{{Key takeaways for the team}}

## 10. Detection

- **How was it detected?** {{alert/customer report/monitoring}}
- **Time to detect:** {{duration}}
- **Could we have detected it sooner?** {{yes/no — how?}}

## 11. Response

- **Time to acknowledge:** {{duration}}
- **Time to mitigate:** {{duration}}
- **Time to resolve:** {{duration}}
- **Was the runbook followed?** {{yes/no — if no, why?}}

## 12. Prevention

- **What would prevent this from happening again?** {{description}}
- **Is this a systemic issue?** {{yes/no}}
- **Should we add monitoring for this?** {{yes/no — what?}}

---

**PIR Author:** {{name}}
**Review Date:** {{date}}
**Reviewers:** {{names}}
