-- ============================================================
-- V007: Add minor_signal column to gcp.creator
-- Source: ADR-029 (Identity Resolution — Minor-Safety Default)
--
-- minor_signal = true gates:
--   - Contact reveal (wp.reveal)
--   - Campaign-add / outreach sequence enrollment
--   - Any automated commercial-outreach trigger
--
-- This is an invariant, not a feature flag.
-- Discovery/search results and read-only intelligence are unaffected.
-- ============================================================

ALTER TABLE gcp.creator
  ADD COLUMN minor_signal BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering minor_signal creators
CREATE INDEX idx_creator_minor_signal ON gcp.creator (minor_signal)
  WHERE minor_signal = true;

COMMENT ON COLUMN gcp.creator.minor_signal IS
  'ADR-029: When true, contact-reveal, campaign-add, and outreach-enrollment '
  'are closed by default. Set by identity resolution when age signals detected. '
  'This is an invariant, not a feature flag.';
