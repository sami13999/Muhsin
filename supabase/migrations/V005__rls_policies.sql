-- ============================================================
-- V005: RLS Policies — Workspace Plane
-- Source: Doc 21 (Security), ADR-024 (Plane Separation)
--
-- V004 enabled RLS on all 8 WP tables but defined no policies.
-- Without policies, ALL reads/writes are blocked by default.
-- This migration adds the policies.
--
-- Three-layer enforcement (Doc 21):
--   Layer 1: Middleware (JWT + workspace membership check)
--   Layer 2: Repository (application-level filtering)
--   Layer 3: RLS (safety net — never the only layer)
--
-- Pattern: app.current_workspace_id is set by middleware
-- via SELECT set_config('app.current_workspace_id', $wsId, true)
-- ============================================================

-- ── Helper: current workspace from session ───────────────────
-- The tenancy middleware sets this on every request.

-- ── wp.workspace ─────────────────────────────────────────────
-- Users can only see workspaces they're members of.
-- The membership check happens in middleware (Layer 1);
-- RLS just ensures the workspace_id matches.

CREATE POLICY workspace_select ON wp.workspace
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY workspace_update ON wp.workspace
  FOR UPDATE
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- INSERT: handled by the create() repository function which
-- doesn't set app.current_workspace_id (new workspace doesn't exist yet).
-- Uses the service role or direct insert.

-- ── wp.membership ────────────────────────────────────────────
-- Users can only see memberships for their current workspace.

CREATE POLICY membership_select ON wp.membership
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY membership_insert ON wp.membership
  FOR INSERT
  WITH CHECK (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY membership_update ON wp.membership
  FOR UPDATE
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- ── wp.workspace_credit_balance ──────────────────────────────
-- Workspace-scoped. Balance is read/written within transactions.

CREATE POLICY credit_balance_select ON wp.workspace_credit_balance
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY credit_balance_update ON wp.workspace_credit_balance
  FOR UPDATE
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- INSERT: handled by workspace creation (no current_workspace_id yet).

-- ── wp.credit_ledger_entry (partitioned) ─────────────────────
-- Append-only ledger. SELECT + INSERT only (no UPDATE/DELETE).

CREATE POLICY ledger_select ON wp.credit_ledger_entry
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY ledger_insert ON wp.credit_ledger_entry
  FOR INSERT
  WITH CHECK (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- ── wp.workspace_creator_link ────────────────────────────────
-- The GCP/WP bridge. Workspace-scoped.

CREATE POLICY wcl_select ON wp.workspace_creator_link
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY wcl_insert ON wp.workspace_creator_link
  FOR INSERT
  WITH CHECK (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY wcl_update ON wp.workspace_creator_link
  FOR UPDATE
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- ── wp.list ──────────────────────────────────────────────────
-- Workspace-scoped.

CREATE POLICY list_select ON wp.list
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY list_insert ON wp.list
  FOR INSERT
  WITH CHECK (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY list_update ON wp.list
  FOR UPDATE
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- ── wp.list_member ───────────────────────────────────────────
-- Scoped via the parent list's workspace_id.
-- Join through wp.list to check workspace ownership.

CREATE POLICY list_member_select ON wp.list_member
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wp.list
      WHERE wp.list.list_id = list_member.list_id
        AND wp.list.workspace_id::text = current_setting('app.current_workspace_id', true)
    )
  );

CREATE POLICY list_member_insert ON wp.list_member
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wp.list
      WHERE wp.list.list_id = list_member.list_id
        AND wp.list.workspace_id::text = current_setting('app.current_workspace_id', true)
    )
  );

CREATE POLICY list_member_update ON wp.list_member
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wp.list
      WHERE wp.list.list_id = list_member.list_id
        AND wp.list.workspace_id::text = current_setting('app.current_workspace_id', true)
    )
  );

-- ── wp.interaction_timeline (partitioned) ────────────────────
-- Append-only timeline. SELECT + INSERT only.

CREATE POLICY timeline_select ON wp.interaction_timeline
  FOR SELECT
  USING (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

CREATE POLICY timeline_insert ON wp.interaction_timeline
  FOR INSERT
  WITH CHECK (
    workspace_id::text = current_setting('app.current_workspace_id', true)
  );

-- ── GCP tables: no RLS ──────────────────────────────────────
-- GCP tables (gcp.*) are global, not workspace-scoped.
-- They use application-level access control (M2 is the only
-- authorized writer per Doc 14 boundary rule).
-- No RLS policies needed — GCP access is controlled at the API layer.

-- ── Platform tables: no RLS ──────────────────────────────────
-- platform.outbox and platform.processed_event_ledger are
-- infrastructure tables accessed by system workers only.
-- No RLS policies — access controlled via application layer
-- and mushin_system_worker BYPASSRLS role.
