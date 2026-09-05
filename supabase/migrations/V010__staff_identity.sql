-- V010: Staff Identity System
-- Staff profile table extending Supabase Auth identity.
-- Staff identities live in a separate auth realm (ADR-011).
-- This table stores additional staff metadata not in Supabase Auth.

-- Staff profile table
CREATE TABLE wp.staff_user (
  staff_user_id UUID PRIMARY KEY,  -- References auth.users(id) via Supabase Auth
  display_name TEXT NOT NULL,
  department TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: staff_user is only accessible by staff
ALTER TABLE wp.staff_user ENABLE ROW LEVEL SECURITY;

-- Staff can read their own profile
CREATE POLICY staff_user_self_read ON wp.staff_user
  FOR SELECT
  USING (staff_user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Admin staff can manage all staff profiles
CREATE POLICY staff_user_admin_all ON wp.staff_user
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'app_metadata' IS NOT NULL
    AND (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'realm') = 'staff'
    AND (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'staff_role') = 'admin'
  );

-- Index for staff lookups
CREATE INDEX idx_staff_user_department ON wp.staff_user(department);
