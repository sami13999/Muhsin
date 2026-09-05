# Staff/Admin User Functionality — Research Findings

**Date:** 2026-07-11
**Question:** Do we have pages for staff and admin? Are these users functional right now like normal users?

---

## Answer: Staff/Admin is NOT FUNCTIONAL

Staff/admin is a well-designed code skeleton with no on-ramp. No one can log in as staff, no admin features can be accessed, and no admin frontend exists.

---

## Evidence

### What Exists (Code Only)

| Component | Status | Evidence |
|-----------|--------|----------|
| Admin endpoint | **1 endpoint** | `GET /admin/stats` — workspace + creator count |
| Staff RBAC middleware | **VERIFIED_CODE** | `requireStaffRole`, `requirePermission`, `requireWorkspaceTarget` |
| Permission matrix | **VERIFIED_CODE** | 2 roles (admin/support), 15 permissions, hard denials |
| MFA requirements | **VERIFIED_CODE** | Admin: WebAuthn + TOTP. Support: TOTP only |
| Tests | **VERIFIED_CODE** | 228 lines, all pass |

### What's Missing (Critical)

| Gap | Impact |
|-----|--------|
| No way to create staff users | No seed, migration, API, or Supabase hook |
| No staff JWT claims | Nothing sets `realm: "staff"` in JWTs |
| No separate staff auth tenant | ADR-011 not implemented |
| No admin frontend | No dashboard, no staff UI |
| MFA never enforced | Code exists but never called |
| Only 1 admin endpoint | No workspace mgmt, no merging, no audit log |

### How Staff Detection Works

```typescript
// tenancy.ts:177
const isStaff = claims['realm'] === 'staff';
```

**Problem:** Nothing in the system ever sets `realm: "staff"` in a JWT. Supabase Auth issues standard user JWTs.

### Can Anyone Log In as Staff?

**No.** The `staffOnly` middleware checks `tenancy.isStaff`, which is always `false`. Every admin request returns 401.

---

## What Would Be Needed

1. **Supabase App Metadata** — Set `app_metadata.realm = "staff"` on specific users via Supabase Admin API
2. **Or Edge Function** — Post-auth hook that injects staff claims
3. **Or Seed Script** — Create staff users with custom metadata
4. **Admin Frontend** — Dashboard, workspace mgmt, user mgmt, audit log

---

## Classification

| Aspect | Classification |
|--------|---------------|
| RBAC middleware | **VERIFIED_CODE** |
| Permission matrix | **VERIFIED_CODE** |
| Staff user creation | **MISSING** |
| Staff JWT claims | **MISSING** |
| Admin endpoints | **MINIMAL** (1 endpoint) |
| Admin frontend | **MISSING** |
| MFA enforcement | **MISSING** |
| **Overall staff functionality** | **NOT FUNCTIONAL** |
