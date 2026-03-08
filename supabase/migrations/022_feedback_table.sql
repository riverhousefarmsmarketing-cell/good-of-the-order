-- Migration: 022_feedback_table
-- Date: 2026-03-08
-- Description: Create feedback table for in-app feedback collection.
--   Stores structured feedback (bug/suggestion/compliment + message) from
--   authenticated users. Paired with email notification via send-email edge function.
-- Depends on: 021_fix_invite_links_profile_to_member

CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'compliment')),
  message         TEXT NOT NULL,
  page_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_org  ON feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(submitted_by);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Any authenticated org member can submit feedback
CREATE POLICY "Org members can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (submitted_by = auth.uid());

-- Rollback reference (do not run unless reverting):
-- DROP TABLE IF EXISTS feedback CASCADE;
