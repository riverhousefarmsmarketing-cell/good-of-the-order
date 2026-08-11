-- Migration: 019_catchup_members_table
-- Date: 2026-03-08
-- Description: Catch-up migration documenting the `members` table that was
--   created via the Supabase dashboard. This file brings schema version control
--   up to date (OPS-8 compliance). No structural changes — documents existing state.
-- Depends on: 018_organization_accounts

-- ============================================================
-- MEMBERS TABLE (board directory — exists independently of auth accounts)
-- ============================================================
-- NOTE: This table was created via the Supabase dashboard prior to this
-- migration being written. The CREATE TABLE below is idempotent (IF NOT EXISTS)
-- so it is safe to run even if the table already exists.

CREATE TABLE IF NOT EXISTS members (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL,
  email                TEXT,
  phone                TEXT,
  board_position       TEXT,
  board_position_order INTEGER,
  is_voting_member     BOOLEAN NOT NULL DEFAULT true,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  linked_profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_members_org       ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_profile   ON members(linked_profile_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Org members can view all members in their org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'Org members can view'
  ) THEN
    CREATE POLICY "Org members can view"
      ON members FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admins and editors can insert members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'Admins editors can insert'
  ) THEN
    CREATE POLICY "Admins editors can insert"
      ON members FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
      );
  END IF;
END $$;

-- Admins and editors can update members
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'Admins editors can update'
  ) THEN
    CREATE POLICY "Admins editors can update"
      ON members FOR UPDATE
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles
          WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
      );
  END IF;
END $$;

-- Only admins can deactivate (soft delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'Admins can delete'
  ) THEN
    CREATE POLICY "Admins can delete"
      ON members FOR DELETE
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Rollback reference (do not run unless reverting):
-- DROP TABLE IF EXISTS members CASCADE;
