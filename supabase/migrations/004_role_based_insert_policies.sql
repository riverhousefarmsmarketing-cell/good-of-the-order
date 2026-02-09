-- ============================================================================
-- Migration 004: Role-Based INSERT Policies & Child Table Authorization
-- GoodOfTheOrder - Fix BUG-085a (NULL INSERT quals) and BUG-085b (child table role gaps)
-- Created: 2026-02-09 (Session L)
--
-- WHAT THIS FIXES:
-- 1. INSERT policies on parent tables have NULL qual (no org or role check)
-- 2. Child tables use FOR ALL with no role check (viewer can write)
--
-- PERMISSION MATRIX:
--   Admin:  full access (all CRUD on all tables)
--   Editor: create/edit/delete minutes, agendas, events, send emails
--           but NOT settings, members, or invitations
--   Viewer: read-only (view minutes, agendas, events; cannot create/edit/delete)
--
-- SAFETY: Run in a transaction. If anything fails, nothing changes.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Fix NULL INSERT policies on parent tables
-- These currently allow ANY authenticated user to insert (no org or role check)
-- ============================================================================

-- MINUTES
DROP POLICY "Org insert" ON minutes;
CREATE POLICY "Editor insert" ON minutes FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- AGENDAS
DROP POLICY "Org insert" ON agendas;
CREATE POLICY "Editor insert" ON agendas FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- EVENTS
DROP POLICY "Org insert" ON events;
CREATE POLICY "Editor insert" ON events FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- SUBCOMMITTEES (admin-only — these are org structure, not content)
DROP POLICY "Org write" ON subcommittees;
CREATE POLICY "Admin insert" ON subcommittees FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_admin());

-- Also tighten subcommittee UPDATE and DELETE to admin-only
DROP POLICY "Org update" ON subcommittees;
CREATE POLICY "Admin update" ON subcommittees FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_admin());

DROP POLICY "Org delete" ON subcommittees;
CREATE POLICY "Admin delete" ON subcommittees FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_admin());

-- ORGANIZATION_ASSETS (editor+ can upload logos etc.)
DROP POLICY "Org write" ON organization_assets;
CREATE POLICY "Editor insert" ON organization_assets FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- ATTACHMENTS
DROP POLICY "Org insert" ON attachments;
CREATE POLICY "Editor insert" ON attachments FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- DISTRIBUTION_LOGS (editor+ can send emails)
DROP POLICY "Org insert" ON distribution_logs;
CREATE POLICY "Editor insert" ON distribution_logs FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- INVITATIONS (admin-only — managing who joins the org)
DROP POLICY "Admin write" ON invitations;
CREATE POLICY "Admin insert" ON invitations FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_admin());

-- DISTRIBUTION_CONTACTS — fix INSERT, UPDATE, and DELETE (currently no role check)
DROP POLICY "Org write" ON distribution_contacts;
CREATE POLICY "Editor insert" ON distribution_contacts FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY "Org update" ON distribution_contacts;
CREATE POLICY "Editor update" ON distribution_contacts FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY "Org delete" ON distribution_contacts;
CREATE POLICY "Editor delete" ON distribution_contacts FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());


-- ============================================================================
-- PART 2: Split child table FOR ALL policies into SELECT + write with role check
-- These currently use "Through parent" FOR ALL with no role restriction
-- ============================================================================

-- ATTENDANCE (child of minutes)
DROP POLICY "Through parent" ON attendance;
CREATE POLICY "Read through parent" ON attendance FOR SELECT
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON attendance FOR INSERT
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON attendance FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON attendance FOR DELETE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- BUSINESS_ITEMS (child of minutes)
DROP POLICY "Through parent" ON business_items;
CREATE POLICY "Read through parent" ON business_items FOR SELECT
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON business_items FOR INSERT
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON business_items FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON business_items FOR DELETE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- ACTION_ITEMS (child of minutes)
DROP POLICY "Through parent" ON action_items;
CREATE POLICY "Read through parent" ON action_items FOR SELECT
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON action_items FOR INSERT
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON action_items FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON action_items FOR DELETE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- FINANCIAL_ITEMS (child of minutes)
DROP POLICY "Through parent" ON financial_items;
CREATE POLICY "Read through parent" ON financial_items FOR SELECT
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON financial_items FOR INSERT
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON financial_items FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON financial_items FOR DELETE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- MINUTES_UPCOMING_EVENTS (child of minutes)
DROP POLICY "Through parent" ON minutes_upcoming_events;
CREATE POLICY "Read through parent" ON minutes_upcoming_events FOR SELECT
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON minutes_upcoming_events FOR INSERT
  WITH CHECK (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON minutes_upcoming_events FOR UPDATE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON minutes_upcoming_events FOR DELETE
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- AGENDA_ITEMS (child of agendas)
DROP POLICY "Through parent" ON agenda_items;
CREATE POLICY "Read through parent" ON agenda_items FOR SELECT
  USING (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON agenda_items FOR INSERT
  WITH CHECK (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON agenda_items FOR UPDATE
  USING (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON agenda_items FOR DELETE
  USING (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- EVENT_VENDORS (child of events)
DROP POLICY "Through parent" ON event_vendors;
CREATE POLICY "Read through parent" ON event_vendors FOR SELECT
  USING (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Editor insert" ON event_vendors FOR INSERT
  WITH CHECK (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor update" ON event_vendors FOR UPDATE
  USING (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());
CREATE POLICY "Editor delete" ON event_vendors FOR DELETE
  USING (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ) AND is_org_editor());

-- SUBCOMMITTEE_MEMBERS (child of subcommittees — admin-only write)
DROP POLICY "Through parent" ON subcommittee_members;
CREATE POLICY "Read through parent" ON subcommittee_members FOR SELECT
  USING (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ));
CREATE POLICY "Admin insert" ON subcommittee_members FOR INSERT
  WITH CHECK (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ) AND is_org_admin());
CREATE POLICY "Admin update" ON subcommittee_members FOR UPDATE
  USING (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ) AND is_org_admin());
CREATE POLICY "Admin delete" ON subcommittee_members FOR DELETE
  USING (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ) AND is_org_admin());


-- ============================================================================
-- VERIFICATION: Confirm all policies are correct after migration
-- Run this SELECT after COMMIT to verify
-- ============================================================================

-- This will be run manually after commit:
-- SELECT tablename, policyname, cmd, permissive, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;

COMMIT;
