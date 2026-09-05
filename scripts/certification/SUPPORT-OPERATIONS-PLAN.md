# MUSHIN 2.0 — Support Operations Plan

**Date:** 2026-07-11
**Status:** Customer support operations design

---

## 1. Support Channels

### Channel Strategy

| Channel | Priority | Status | Setup Effort |
|---------|----------|--------|--------------|
| **Email** (support@mushin.app) | HIGH | **MISSING** | 0.5 days |
| **In-app feedback** | HIGH | **VERIFIED_CODE** | Already implemented |
| **Help center / Knowledge base** | MEDIUM | **MISSING** | 5-7 days |
| **Live chat** | LOW | **MISSING** | Post-MVP |
| **Phone support** | LOW | **MISSING** | Enterprise only |

### Email Setup Requirements

1. Create support@mushin.app mailbox
2. Configure auto-reply with ticket number
3. Route to ticketing system (or manual triage initially)
4. Set up forwarding to founder's primary email

---

## 2. Ticketing Workflow

### Current State

| Component | Status | Evidence |
|-----------|--------|----------|
| Feedback service | **VERIFIED_CODE** | 5 report types, priority scoring |
| Support ticket schema | **VERIFIED_CODE** | `wp.support_ticket` table |
| Admin review queue | **VERIFIED_CODE** | `wp.admin_review_queue` table |
| Staff RBAC | **VERIFIED_CODE** | `ticket.view` permission |

### Ticket Lifecycle

```
┌─────────────┐
│  Submitted   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Triaged    │ ← Priority assigned
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  In Progress │ ← Being worked
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Waiting     │ ← Awaiting customer/response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Resolved    │ ← Issue fixed
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Closed     │ ← No further action
└─────────────┘
```

### Priority Scoring

| Report Type | Base Score | Boost |
|-------------|------------|-------|
| Bug report | 70 | +10 if creator ID provided |
| Feature request | 40 | +5 if evidence provided |
| General feedback | 30 | +5 if attachment provided |
| Incorrect data | 60 | +15 if page URL provided |
| Fraud report | 90 | +20 if evidence provided |

### Classification: **VERIFIED_CODE**

---

## 3. SLA Tiers

### Response Time SLAs

| Priority | First Response | Resolution | Channel |
|----------|---------------|------------|---------|
| **Critical** (SEV1) | 1 hour | 4 hours | Email + In-app |
| **High** (SEV2) | 4 hours | 24 hours | Email + In-app |
| **Medium** (SEV3) | 24 hours | 72 hours | Email |
| **Low** (SEV4) | 48 hours | 1 week | Email |

### SLA Targets (MVP)

| Metric | Target |
|--------|--------|
| First response time | < 4 hours (business hours) |
| Resolution time | < 48 hours |
| Customer satisfaction | > 80% |
| Ticket reopen rate | < 10% |

### Classification: **MISSING** (no SLA tracking implemented)

---

## 4. Escalation Process

### Escalation Matrix

| Level | Trigger | Owner | Response |
|-------|---------|-------|----------|
| **L1** | Initial ticket | Support | Triage, basic troubleshooting |
| **L2** | Complex technical issue | Engineering | Deep investigation |
| **L3** | Service outage / data loss | Founder | Immediate response |
| **L4** | Legal / compliance issue | Legal counsel | External escalation |

### Escalation Triggers

- Customer explicitly requests escalation
- SLA breach imminent
- Multiple customers affected
- Data security concern
- Revenue-impacting issue

### Classification: **MISSING** (no formal escalation process)

---

## 5. Incident Communication

### Communication Channels

| Channel | Purpose | Status |
|---------|---------|--------|
| **Status page** | Public incident updates | **MISSING** |
| **Email** | Customer notifications | **MISSING** |
| **In-app banner** | Active incident display | **MISSING** |
| **Twitter/X** | Public updates | **MISSING** |

### Communication Templates

**Incident Declared:**
```
Subject: [MUSHIN] Service Disruption - [Brief Description]

We're currently experiencing [issue] affecting [feature].

Impact: [description]
Start time: [time]
Estimated resolution: [time]

We're working to resolve this and will provide updates every [interval].

Status page: [url]
```

**Incident Resolved:**
```
Subject: [MUSHIN] Service Restored - [Brief Description]

The issue affecting [feature] has been resolved.

Duration: [time]
Root cause: [brief description]
Impact: [description]

We'll publish a full post-incident report within 48 hours.

Thank you for your patience.
```

### Classification: **MISSING** (templates exist in DOC-027, not implemented)

---

## 6. Status Page

### Requirements

| Feature | Priority | Status |
|---------|----------|--------|
| Public status page | HIGH | **MISSING** |
| Component status | HIGH | **MISSING** |
| Incident history | MEDIUM | **MISSING** |
| Subscribe to updates | MEDIUM | **MISSING** |
| API status endpoint | HIGH | **VERIFIED_RUNTIME** (`/health`) |

### Recommended Tools

| Tool | Cost | Features |
|------|------|----------|
| **Instatus** | Free tier available | Status page, incidents, subscribers |
| **Statuspage** | $29/mo | Industry standard, Atlassian integration |
| **Cachet** | Free (self-hosted) | Open source, requires hosting |

### Classification: **LAUNCH RECOMMENDED**

---

## 7. Knowledge Base

### Required Content

| Category | Articles | Priority |
|----------|----------|----------|
| **Getting Started** | 5-7 | HIGH |
| - Account setup | 1 | |
| - Workspace creation | 1 | |
| - First search | 1 | |
| - Understanding credits | 1 | |
| - Team collaboration | 1 | |
| **Features** | 10-15 | HIGH |
| - Creator search guide | 1 | |
| - Natural language search | 1 | |
| - List management | 1 | |
| - Analytics dashboard | 1 | |
| - Billing & subscriptions | 1 | |
| **Troubleshooting** | 5-10 | MEDIUM |
| - Login issues | 1 | |
| - Search not working | 1 | |
| - Billing questions | 1 | |
| **API Documentation** | 5-10 | LOW |
| - Authentication | 1 | |
| - Endpoints | 1 | |
| - Rate limits | 1 | |

### Classification: **LAUNCH RECOMMENDED**

---

## 8. Customer Onboarding

### Onboarding Flow

```
┌─────────────┐
│   Signup     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Email       │ ← Welcome email with getting started guide
│  Verify      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Workspace   │ ← Create first workspace
│  Creation    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Golden Path │ ← Guided first search
│  Onboarding  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  First       │ ← Save a creator to a list
│  Value       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Complete    │
└─────────────┘
```

### Onboarding Emails

| Email | Timing | Content |
|-------|--------|---------|
| Welcome | Immediate | Account details, getting started link |
| Day 1 | 24 hours | Tips for first search |
| Day 3 | 72 hours | Feature highlights |
| Day 7 | 1 week | Check-in, offer help |
| Day 14 | 2 weeks | Advanced features |
| Day 30 | 1 month | Usage summary, upgrade prompt |

### Classification: **MISSING** (no email sequences)

---

## 9. Classification Summary

| Component | Classification |
|-----------|---------------|
| In-app feedback | **VERIFIED_CODE** |
| Support ticket schema | **VERIFIED_CODE** |
| Priority scoring | **VERIFIED_CODE** |
| Email support | **MISSING** |
| SLA tracking | **MISSING** |
| Escalation process | **MISSING** |
| Status page | **MISSING** |
| Knowledge base | **MISSING** |
| Onboarding emails | **MISSING** |
| Incident communication | **MISSING** |

---

## 10. Recommendations

### For MVP Launch
1. Set up support@mushin.app email
2. Create basic FAQ (5-10 articles)
3. Set up simple status page (Instatus free tier)
4. Document escalation process (internal)

### For Production Hardening
1. Implement SLA tracking
2. Build knowledge base (20+ articles)
3. Set up onboarding email sequence
4. Create incident communication templates

### Estimated Effort

| Task | Effort |
|------|--------|
| Email setup | 0.5 days |
| FAQ creation | 2-3 days |
| Status page setup | 0.5 days |
| SLA tracking | 2-3 days |
| Knowledge base | 5-7 days |
| Onboarding emails | 3-5 days |
| **Total** | **13-19 days** |
