-- ============================================================
-- V009: Feedback & Product Intelligence Tables
-- Source: DOC-030 (Feedback & Product Intelligence module)
--
-- Tables:
--   wp.feedback_report — User-submitted feedback reports
--   wp.support_ticket — Support tickets derived from feedback
--   wp.admin_review_queue — Admin review queue for flagged items
-- ============================================================

-- ── wp.feedback_report ───────────────────────────────────────
-- Stores user-submitted feedback: bug reports, feature requests,
-- general feedback, incorrect creator data, fraud false-positives.

CREATE TABLE wp.feedback_report (
    report_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    user_id             UUID        NOT NULL,
    -- Reporter's user ID
    report_type         TEXT        NOT NULL
        CHECK (report_type IN (
            'bug_report',
            'feature_request',
            'general_feedback',
            'incorrect_creator_data',
            'fraud_false_positive'
        )),
    title               TEXT        NOT NULL,
    description         TEXT        NOT NULL,
    -- Optional: link to a specific creator
    creator_id          UUID,
    -- Optional: link to a specific page/endpoint
    page_url            TEXT,
    -- Optional: screenshot or attachment reference
    attachment_url      TEXT,
    -- Priority score (0-100, higher = more urgent)
    priority_score      INTEGER     NOT NULL DEFAULT 0
        CHECK (priority_score >= 0 AND priority_score <= 100),
    -- Status lifecycle
    status              TEXT        NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_review', 'in_progress', 'resolved', 'closed', 'rejected')),
    -- Resolution notes (populated when resolved/closed)
    resolution_notes    TEXT,
    resolved_by         UUID,
    resolved_at         TIMESTAMPTZ,
    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_workspace ON wp.feedback_report (workspace_id, created_at);
CREATE INDEX idx_feedback_type ON wp.feedback_report (report_type, status);
CREATE INDEX idx_feedback_priority ON wp.feedback_report (priority_score DESC, status)
    WHERE status = 'open';


-- ── wp.support_ticket ────────────────────────────────────────
-- Support tickets derived from feedback reports or direct submission.
-- Links feedback to resolution workflow.

CREATE TABLE wp.support_ticket (
    ticket_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    report_id           UUID        REFERENCES wp.feedback_report(report_id),
    -- Optional: linked feedback report
    user_id             UUID        NOT NULL,
    -- Reporter's user ID
    ticket_type         TEXT        NOT NULL DEFAULT 'feedback'
        CHECK (ticket_type IN ('feedback', 'bug', 'feature_request', 'data_correction', 'fraud_report', 'account_issue')),
    subject             TEXT        NOT NULL,
    description         TEXT        NOT NULL,
    priority            TEXT        NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status              TEXT        NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
    assigned_to         UUID,
    -- Admin/support user assigned to this ticket
    resolution          TEXT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_workspace ON wp.support_ticket (workspace_id, status);
CREATE INDEX idx_ticket_status ON wp.support_ticket (status, priority DESC, created_at);


-- ── wp.admin_review_queue ────────────────────────────────────
-- Admin review queue for flagged items requiring human attention.
-- Used for fraud reports, data corrections, and escalated feedback.

CREATE TABLE wp.admin_review_queue (
    queue_id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID        NOT NULL REFERENCES wp.workspace(workspace_id) ON DELETE CASCADE,
    item_type           TEXT        NOT NULL
        CHECK (item_type IN ('feedback', 'fraud_report', 'data_correction', 'content_flag', 'creator_flag')),
    item_id             UUID        NOT NULL,
    -- Reference to the source entity (feedback_report.report_id, etc.)
    reason              TEXT        NOT NULL,
    -- Why this item was queued for review
    priority_score      INTEGER     NOT NULL DEFAULT 50
        CHECK (priority_score >= 0 AND priority_score <= 100),
    status              TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
    reviewed_by         UUID,
    review_notes        TEXT,
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_pending ON wp.admin_review_queue (priority_score DESC, created_at)
    WHERE status = 'pending';
CREATE INDEX idx_review_queue_workspace ON wp.admin_review_queue (workspace_id, status);


-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE wp.feedback_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp.admin_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY feedback_report_select ON wp.feedback_report
  FOR SELECT USING (workspace_id::text = current_setting('app.current_workspace_id', true));
CREATE POLICY feedback_report_insert ON wp.feedback_report
  FOR INSERT WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));
CREATE POLICY feedback_report_update ON wp.feedback_report
  FOR UPDATE USING (workspace_id::text = current_setting('app.current_workspace_id', true));

CREATE POLICY support_ticket_select ON wp.support_ticket
  FOR SELECT USING (workspace_id::text = current_setting('app.current_workspace_id', true));
CREATE POLICY support_ticket_insert ON wp.support_ticket
  FOR INSERT WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));
CREATE POLICY support_ticket_update ON wp.support_ticket
  FOR UPDATE USING (workspace_id::text = current_setting('app.current_workspace_id', true));

CREATE POLICY admin_review_queue_select ON wp.admin_review_queue
  FOR SELECT USING (workspace_id::text = current_setting('app.current_workspace_id', true));
CREATE POLICY admin_review_queue_insert ON wp.admin_review_queue
  FOR INSERT WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));
CREATE POLICY admin_review_queue_update ON wp.admin_review_queue
  FOR UPDATE USING (workspace_id::text = current_setting('app.current_workspace_id', true));
