-- V011: Audit Log Table
-- Immutable, append-only audit trail for all staff actions.
-- Per DOC-029 §2.2: every staff action must have an audit record.
-- Corrections are new records, not mutations.

CREATE TABLE platform.audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL,
  staff_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  workspace_id UUID,
  reason TEXT,
  ticket_ref TEXT,
  request_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_log_staff ON platform.audit_log(staff_user_id, occurred_at DESC);
CREATE INDEX idx_audit_log_action ON platform.audit_log(action, occurred_at DESC);
CREATE INDEX idx_audit_log_workspace ON platform.audit_log(workspace_id, occurred_at DESC);
CREATE INDEX idx_audit_log_request ON platform.audit_log(request_id);
CREATE INDEX idx_audit_log_time ON platform.audit_log(occurred_at DESC);
