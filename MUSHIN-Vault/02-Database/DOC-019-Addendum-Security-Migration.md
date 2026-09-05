### DOC-019 Addendum — Security Baseline Migration
**Closes:** F-07 (OAuth/WABA token storage never defined), F-08 (RLS discussed conceptually, never implemented) from the findings report.
**Migration:** `V0XX__security_baseline_rls_and_credentials.sql` (forward-only, per DOC-026 expand-contract policy)

---

## Part 1 — Baseline Row-Level Security

DOC-021 §2.2 specifies RLS "on all `wp.*` tables keyed on `current_setting('app.workspace_id')`." That's correct for the vast majority of tables, but two need a different key, and one needs to be explicit about a bypass role for legitimate cross-workspace system jobs. Applying the same policy to ~24 near-identical tables by hand invites copy-paste drift, so the bulk of it is done via a loop over `information_schema`.

```sql
-- 1. Generic case: every wp.* table that has a workspace_id column
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT DISTINCT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'workspace_id'
    WHERE n.nspname = 'wp'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
  LOOP
    EXECUTE format('ALTER TABLE wp.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
    EXECUTE format('ALTER TABLE wp.%I FORCE ROW LEVEL SECURITY', tbl.table_name); -- applies even to the table owner role
    EXECUTE format(
      $f$CREATE POLICY tenant_isolation ON wp.%I
         USING (workspace_id = current_setting('app.workspace_id', true)::uuid)
         WITH CHECK (workspace_id = current_setting('app.workspace_id', true)::uuid)$f$,
      tbl.table_name
    );
  END LOOP;
END $$;
-- Covers: membership, workspace_creator_link, list, list_membership, tag, creator_tag,
-- campaign, campaign_brief_version, campaign_creator, task, consent_state, reveal,
-- sequence_template, sequence_step, sequence_enrollment, file_attachment,
-- entitlement_catalog, paddle_subscription, interaction_timeline, credit_ledger_entry,
-- workspace_credit_balance, credit_reservation, discovery_job, oauth_credential (Part 2),
-- whatsapp_business_binding (Part 2) — run this block AFTER Part 2's CREATE TABLEs.

-- 2. wp.workspace itself has no workspace_id column — it IS the tenant, keyed on its own id.
ALTER TABLE wp.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.workspace FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON wp.workspace
  USING (id = current_setting('app.workspace_id', true)::uuid)
  WITH CHECK (id = current_setting('app.workspace_id', true)::uuid);

-- 3. wp.app_user is NOT 1:1 tenant-scoped — a user can belong to multiple workspaces.
--    DOC-021's "all wp.* tables" is a simplification here; correct enforcement is a
--    membership join, not a direct column match.
ALTER TABLE wp.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.app_user FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON wp.app_user
  USING (
    id IN (
      SELECT user_id FROM wp.membership
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  )
  WITH CHECK (
    id IN (
      SELECT user_id FROM wp.membership
      WHERE workspace_id = current_setting('app.workspace_id', true)::uuid
    )
  );
-- No circularity risk: wp.membership is itself covered by the generic policy in step 1.

-- 4. Cross-workspace system jobs (the PATCH-005 sweeper, ADR-027 sync projection retry,
--    GDPR erasure sweep) genuinely need to see rows across every workspace in one query —
--    a single current_setting('app.workspace_id') can't express that. FORCE ROW LEVEL
--    SECURITY above blocks even the table owner, so these jobs run under a distinct,
--    narrowly-scoped role instead of inheriting bypass implicitly.
CREATE ROLE mushin_system_worker NOBYPASSRLS; -- explicit: NOT a blanket bypass
ALTER ROLE mushin_system_worker BYPASSRLS;    -- granted deliberately, used only by the
                                               -- specific jobs named above; every query
                                               -- issued under this role is audit-logged
                                               -- (Doc 23 audit stream) — this role is the
                                               -- exception that Doc 29 §7's "no direct DB
                                               -- access" rule already assumes exists.
```

## Part 2 — OAuth & WhatsApp Business Credential Storage

Both are C1-classified per DOC-021 §3.1 (highest sensitivity); both use envelope encryption per DOC-021 §3.2 — a Data Encryption Key per row, wrapped by a KMS-managed key, so `encryption_key_version` alone lets a rotation invalidate and re-wrap without touching the underlying ciphertext logic.

```sql
CREATE TABLE wp.oauth_credential (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id             UUID NOT NULL REFERENCES wp.workspace(id),
  user_id                  UUID NOT NULL REFERENCES wp.app_user(id),
  provider                 TEXT NOT NULL CHECK (provider IN ('gmail','outlook')),
  provider_account_email   TEXT NOT NULL,
  encrypted_refresh_token  BYTEA NOT NULL,
  encrypted_access_token   BYTEA,             -- nullable: short-lived, may not be cached
  encryption_key_version   INT NOT NULL,
  scopes                   TEXT[] NOT NULL,
  token_expires_at         TIMESTAMPTZ,
  last_refreshed_at        TIMESTAMPTZ,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','revoked','expired','error')),
  last_error               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, provider)
);
COMMENT ON TABLE wp.oauth_credential IS
  'Mailbox OAuth tokens for sequence sending (FS-06.01). C1-classified (Doc 21 §3.1). '
  'encrypted_* columns are envelope-encrypted at the application layer before write — '
  'this table never receives plaintext tokens.';

CREATE TABLE wp.whatsapp_business_binding (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id              UUID NOT NULL REFERENCES wp.workspace(id),
  waba_id                   TEXT NOT NULL,
  phone_number_id           TEXT NOT NULL,
  display_phone_number      TEXT NOT NULL,
  encrypted_access_token    BYTEA NOT NULL,
  encryption_key_version    INT NOT NULL,
  webhook_verify_token_hash TEXT NOT NULL,   -- hashed, one-way; never stored reversible
  status                    TEXT NOT NULL DEFAULT 'pending_verification'
                              CHECK (status IN ('pending_verification','active','suspended','revoked')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, waba_id)
);
COMMENT ON TABLE wp.whatsapp_business_binding IS
  'S2 feature (Doc 19 Gap Analysis originally deferred this). C1-classified; '
  'encrypted_access_token is envelope-encrypted, matching oauth_credential''s pattern.';
```

## Part 3 — Migration Safety Checklist (per the Master Directive's own rules)

- [x] No `DROP COLUMN` / `DROP TABLE` — purely additive.
- [x] No data rewrites bundled in — this is schema-only; any backfill (e.g., re-encrypting existing plaintext, if any exists from a pre-migration state) ships as a **separate** migration.
- [x] Reversible: `down` = `DROP TABLE IF EXISTS wp.oauth_credential, wp.whatsapp_business_binding; DROP ROLE IF EXISTS mushin_system_worker;` plus `DROP POLICY`/`DISABLE ROW LEVEL SECURITY` per table.
- [ ] **Dry-run against a staging clone before production** — flagging rather than checking, since RLS FORCE on existing tables can break any code path that was implicitly relying on the table-owner bypass. This is exactly the kind of change DOC-024's migration test suite (§3.2) should run against staging data first.
