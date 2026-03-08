-- Migration: 020_members_add_notes
-- Date: 2026-03-08
-- Description: Add notes column to members table for admin notes about board members
-- Depends on: 019_catchup_members_table

ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;

-- Rollback reference (do not run unless reverting):
-- ALTER TABLE members DROP COLUMN IF EXISTS notes;
