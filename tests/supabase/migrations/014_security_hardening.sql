-- Migration: 014_security_hardening
-- Date: 2026-02-14
-- Description: Security hardening from code review feedback
--   1. Lock down profiles — prevent self role/org changes
--   2. Add explicit WITH CHECK to remaining policies
--   3. Add role gates to parent table UPDATE/DELETE operations
-- Depends on: 004_role_based_insert_policies, 008_bugfix_sweep

BEGIN;

-- ============================================================================
-- PART 1: Lock down profiles — no self role/org changes
-- ============================================================================
-- Current state: "Users update own profile" policy uses USING (id = auth.uid())
-- with no WITH CHECK — a user could UPDATE their own role or organization_id.
-- Fix: Replace with a policy that only allows updating safe fields via a
-- BEFORE UPDATE trigger that strips role and organization_id changes.

-- Drop the overly permissive self-update policy
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- Create a restricted self-update policy: you can update your own row,
-- but the trigger below will prevent changing role or organization_id
CREATE POLICY "Users update own profile safe"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Trigger: reject attempts to change role or organization_id on self-update
-- Admins updating OTHER profiles (via the "Admins manage profiles" FOR ALL policy)
-- are exempt because they go through the admin policy, not this trigger path.
CREATE OR REPLACE FUNCTION enforce_profile_field_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if the current user is an admin in this org
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
      AND organization_id = OLD.organization_id
  ) INTO v_is_admin;

  -- Non-admins cannot change role or organization_id
  IF NOT v_is_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change your own role'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'Cannot change your own organization'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Admins also cannot change their own role (must be done by another admin)
  IF v_is_admin AND NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Admins cannot change their own role'
      USING ERRCODE = '42501';
  END IF;

  -- Nobody can change organization_id via UPDATE (use invitation flow instead)
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Organization changes are not allowed via profile update'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_locks ON profiles;
CREATE TRIGGER trg_enforce_profile_locks
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_field_locks();


-- ============================================================================
-- PART 2: Add WITH CHECK to parent table "Org isolation" FOR ALL policies
-- ============================================================================
-- Current state: Several parent tables use "Org isolation" FOR ALL with only
-- USING (no WITH CHECK). This means INSERT/UPDATE operations don't verify
-- the new row matches the org constraint.
-- Fix: Replace FOR ALL with explicit per-operation policies with WITH CHECK.

-- ORGANIZATIONS: already has separate SELECT/UPDATE policies, but UPDATE needs WITH CHECK
DROP POLICY IF EXISTS "Admins update own org" ON organizations;
CREATE POLICY "Admins update own org" ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (id = get_user_org_id());

-- ORGANIZATION_ASSETS: replace FOR ALL with explicit operations
DROP POLICY IF EXISTS "Org isolation" ON organization_assets;
CREATE POLICY "Org read" ON organization_assets FOR SELECT
  USING (organization_id = get_user_org_id());
-- INSERT already has "Editor insert" from migration 004
CREATE POLICY "Editor update" ON organization_assets FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Editor delete" ON organization_assets FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- MINUTES: replace FOR ALL with per-operation + role gates
DROP POLICY IF EXISTS "Org isolation" ON minutes;
CREATE POLICY "Org read" ON minutes FOR SELECT
  USING (organization_id = get_user_org_id());
-- INSERT already has "Editor insert" from migration 004
CREATE POLICY "Editor update" ON minutes FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Editor delete" ON minutes FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- AGENDAS: replace FOR ALL with per-operation + role gates
DROP POLICY IF EXISTS "Org isolation" ON agendas;
CREATE POLICY "Org read" ON agendas FOR SELECT
  USING (organization_id = get_user_org_id());
-- INSERT already has "Editor insert" from migration 004
CREATE POLICY "Editor update" ON agendas FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Editor delete" ON agendas FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- EVENTS: replace FOR ALL with per-operation + role gates
DROP POLICY IF EXISTS "Org isolation" ON events;
CREATE POLICY "Org read" ON events FOR SELECT
  USING (organization_id = get_user_org_id());
-- INSERT already has "Editor insert" from migration 004
CREATE POLICY "Editor update" ON events FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Editor delete" ON events FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- DISTRIBUTION_LOGS: replace FOR ALL with per-operation + role gates
DROP POLICY IF EXISTS "Org isolation" ON distribution_logs;
CREATE POLICY "Org read" ON distribution_logs FOR SELECT
  USING (organization_id = get_user_org_id());
-- INSERT already has "Editor insert" from migration 004
-- No UPDATE/DELETE needed for logs (append-only)

-- ATTACHMENTS: replace FOR ALL with per-operation + role gates
DROP POLICY IF EXISTS "Org isolation" ON attachments;
CREATE POLICY "Org read" ON attachments FOR SELECT
  USING (organization_id = get_user_org_id());
-- INSERT already has "Editor insert" from migration 004
CREATE POLICY "Editor update" ON attachments FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Editor delete" ON attachments FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- INVITATIONS: replace FOR ALL with per-operation
-- Note: "Public invite lookup" FOR SELECT already exists (USING true)
-- and "Admin insert" already exists from migration 004
DROP POLICY IF EXISTS "Org isolation" ON invitations;
CREATE POLICY "Admin update" ON invitations FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_admin())
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Admin delete" ON invitations FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_admin());

-- SUBCOMMITTEES: SELECT needs its own policy (was covered by now-dropped FOR ALL)
-- Admin INSERT/UPDATE/DELETE already exist from migration 004
DROP POLICY IF EXISTS "Org isolation" ON subcommittees;
CREATE POLICY "Org read" ON subcommittees FOR SELECT
  USING (organization_id = get_user_org_id());


-- ============================================================================
-- PART 3: Add WITH CHECK to child table UPDATE policies
-- ============================================================================
-- Migration 004 added role-gated INSERT (WITH CHECK), UPDATE (USING only),
-- and DELETE (USING only) policies. UPDATE policies are missing WITH CHECK.
-- Fix: Drop and recreate UPDATE policies with WITH CHECK.

-- ATTENDANCE
DROP POLICY IF EXISTS "Editor update" ON attendance;
CREATE POLICY "Editor update" ON attendance FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

-- BUSINESS_ITEMS
DROP POLICY IF EXISTS "Editor update" ON business_items;
CREATE POLICY "Editor update" ON business_items FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

-- ACTION_ITEMS
DROP POLICY IF EXISTS "Editor update" ON action_items;
CREATE POLICY "Editor update" ON action_items FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

-- FINANCIAL_ITEMS
DROP POLICY IF EXISTS "Editor update" ON financial_items;
CREATE POLICY "Editor update" ON financial_items FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

-- MINUTES_UPCOMING_EVENTS
DROP POLICY IF EXISTS "Editor update" ON minutes_upcoming_events;
CREATE POLICY "Editor update" ON minutes_upcoming_events FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

-- AGENDA_ITEMS
DROP POLICY IF EXISTS "Editor update" ON agenda_items;
CREATE POLICY "Editor update" ON agenda_items FOR UPDATE
  USING (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ));

-- EVENT_VENDORS
DROP POLICY IF EXISTS "Editor update" ON event_vendors;
CREATE POLICY "Editor update" ON event_vendors FOR UPDATE
  USING (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ) AND is_org_editor())
  WITH CHECK (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ));

-- SUBCOMMITTEE_MEMBERS
DROP POLICY IF EXISTS "Admin update" ON subcommittee_members;
CREATE POLICY "Admin update" ON subcommittee_members FOR UPDATE
  USING (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ) AND is_org_admin())
  WITH CHECK (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ));

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY (run manually after migration):
-- ============================================================================
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
--
-- Confirm:
--   - No FOR ALL policies remain on parent tables (except "Admins manage profiles")
--   - All INSERT policies have WITH CHECK
--   - All UPDATE policies have both USING and WITH CHECK
--   - profiles has trg_enforce_profile_locks trigger

-- Rollback:
-- DROP TRIGGER IF EXISTS trg_enforce_profile_locks ON profiles;
-- DROP FUNCTION IF EXISTS enforce_profile_field_locks();
-- (then re-run migrations 001 + 004 + 008 to restore original policies)
