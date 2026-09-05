-- V013: Reveal Record Table
-- Tracks workspace-level contact reveals for creators.
-- Per ADR-029: once revealed, no additional charge.
-- Per DOC-029: minor_signal creators cannot be revealed.

CREATE TABLE wp.reveal (
  reveal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES wp.workspace(workspace_id),
  creator_id UUID NOT NULL,
  credit_cost BIGINT NOT NULL DEFAULT 5,
  revealed_by UUID NOT NULL,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, creator_id)
);

-- RLS: workspace isolation
ALTER TABLE wp.reveal ENABLE ROW LEVEL SECURITY;

CREATE POLICY reveal_workspace_isolation ON wp.reveal
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

-- Indexes
CREATE INDEX idx_reveal_workspace ON wp.reveal(workspace_id);
CREATE INDEX idx_reveal_creator ON wp.reveal(creator_id);
