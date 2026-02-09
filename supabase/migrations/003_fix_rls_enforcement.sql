-- Migration: 003_fix_rls_enforcement.sql
-- Date: 2026-02-09
-- Session: J (continuation)
-- Fixes: BUG-084 (CRITICAL multi-tenant data leak — RLS disabled on all tables)
--
-- Root cause: Despite having RLS policies defined on all tables, the actual
-- RLS enforcement flag (pg_class.relrowsecurity) was set to FALSE on every
-- table except organization_assets. This meant all policies were ignored and
-- every authenticated user could see every row in every table.
--
-- This migration:
--   1. Enables and forces RLS on all 18 tenant-data tables
--   2. Creates SECURITY DEFINER helper functions to avoid infinite recursion
--      in profiles table policies (which previously used self-referencing subqueries)
--   3. Replaces recursive profiles policies with safe versions using the helpers

-- ============================================================================
-- STEP 1: Enable and force RLS on ALL tables
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendas FORCE ROW LEVEL SECURITY;

ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items FORCE ROW LEVEL SECURITY;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance FORCE ROW LEVEL SECURITY;

ALTER TABLE business_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_items FORCE ROW LEVEL SECURITY;

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items FORCE ROW LEVEL SECURITY;

ALTER TABLE financial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_items FORCE ROW LEVEL SECURITY;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;

ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendors FORCE ROW LEVEL SECURITY;

ALTER TABLE minutes_upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE minutes_upcoming_events FORCE ROW LEVEL SECURITY;

ALTER TABLE distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

ALTER TABLE subcommittees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcommittees FORCE ROW LEVEL SECURITY;

ALTER TABLE subcommittee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcommittee_members FORCE ROW LEVEL SECURITY;

ALTER TABLE minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE minutes FORCE ROW LEVEL SECURITY;

ALTER TABLE organization_assets FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create SECURITY DEFINER helper functions
-- These bypass RLS when querying profiles, preventing infinite recursion
-- when profiles RLS policies need to check the current user's role
-- ============================================================================

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================================
-- STEP 3: Replace recursive profiles policies with safe versions
-- Old policies used "EXISTS (SELECT 1 FROM profiles WHERE ...)" inside
-- profiles RLS policies, causing infinite recursion now that RLS is enforced.
-- New versions use SECURITY DEFINER helper functions instead.
-- ============================================================================

DROP POLICY IF EXISTS "Users see org members" ON profiles;
CREATE POLICY "Users see org members"
  ON profiles FOR SELECT
  USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Admins read all org profiles" ON profiles;
CREATE POLICY "Admins read all org profiles"
  ON profiles FOR SELECT
  USING (organization_id = get_user_org_id() AND is_org_admin());

DROP POLICY IF EXISTS "Admins update org profiles" ON profiles;
CREATE POLICY "Admins update org profiles"
  ON profiles FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_admin());

DROP POLICY IF EXISTS "Admins deactivate org profiles" ON profiles;
CREATE POLICY "Admins deactivate org profiles"
  ON profiles FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_admin());

DROP POLICY IF EXISTS "Users update own safe fields" ON profiles;
CREATE POLICY "Users update own safe fields"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND organization_id = get_user_org_id()
    AND role = get_user_role()
  );
