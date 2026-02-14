-- Migration: 012_formal_revision_workflow
-- Date: 2026-02-14
-- Description: Replace revert-to-draft with formal revision workflow.
--   Once minutes are approved (issued), they can only be changed by creating
--   a formal revision — a new minutes record linked to the original.
--   The original remains locked as the official record.
-- Depends on: 009_save_minutes_atomic

-- 1. Add revision tracking columns
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS revision_of UUID REFERENCES minutes(id) ON DELETE SET NULL;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS revision_number INT DEFAULT 0;

-- 2. Add 'revised' status for superseded originals
-- Drop and recreate the check constraint to include 'revised'
ALTER TABLE minutes DROP CONSTRAINT IF EXISTS minutes_status_check;
ALTER TABLE minutes ADD CONSTRAINT minutes_status_check
  CHECK (status IN ('draft', 'review', 'approved', 'revised'));

-- 3. Index for finding revisions of a given minutes record
CREATE INDEX IF NOT EXISTS idx_minutes_revision_of ON minutes(revision_of);

-- Rollback:
-- ALTER TABLE minutes DROP COLUMN IF EXISTS revision_of;
-- ALTER TABLE minutes DROP COLUMN IF EXISTS revision_number;
-- ALTER TABLE minutes DROP CONSTRAINT IF EXISTS minutes_status_check;
-- ALTER TABLE minutes ADD CONSTRAINT minutes_status_check CHECK (status IN ('draft', 'review', 'approved'));
