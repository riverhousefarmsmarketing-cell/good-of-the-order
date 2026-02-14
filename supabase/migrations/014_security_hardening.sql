-- ============================================================================
-- Migration: 014_security_hardening.sql
-- Date: 2026-02-14
-- Description: Security hardening - profiles lockdown trigger, WITH CHECK on
--   all INSERT/UPDATE policies, role gates on write operations, append-only
--   distribution logs.
-- Depends on: 013_update_rpc_for_revisions
-- 
-- NOTE: This migration was deployed to production on Feb 14, 2026. It was
--   reconstructed for the repo from session documentation after being
--   inadvertently omitted from a git push. The SQL matches what is live
--   in production.
-- ============================================================================

-- ============================================================================
-- PART 1: Profiles lockdown trigger
-- Prevents non-admins from changing role or organization_id.
-- Prevents admins from changing their own role.
-- Prevents ALL users from changing organization_id via UPDATE.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_profile_field_locks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  is_self BOOLEAN;
BEGIN
  -- Get the role of the user making the request
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  is_self := (NEW.id = auth.uid());

  -- BLOCK: Nobody can change organization_id via UPDATE
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id cannot be changed';
  END IF;

  -- BLOCK: Non-admins cannot change role
  IF current_user_role != 'admin' AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;

  -- BLOCK: Admins cannot change their own role
  IF current_user_role = 'admin' AND is_self AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Admins cannot change their own role';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS enforce_profile_field_locks ON profiles;

CREATE TRIGGER enforce_profile_field_locks
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_field_locks();


-- ============================================================================
-- PART 2: Add WITH CHECK to all INSERT and UPDATE policies
-- Ensures new/modified rows match the user's org — prevents cross-org injection.
-- Uses DROP IF EXISTS + CREATE for idempotency.
-- ============================================================================

-- --- MINUTES ---
DROP POLICY IF EXISTS "Org insert" ON minutes;
CREATE POLICY "Org insert" ON minutes FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY IF EXISTS "Org update" ON minutes;
CREATE POLICY "Org update" ON minutes FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Org delete" ON minutes;
CREATE POLICY "Org delete" ON minutes FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- --- AGENDAS ---
DROP POLICY IF EXISTS "Org insert" ON agendas;
CREATE POLICY "Org insert" ON agendas FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY IF EXISTS "Org update" ON agendas;
CREATE POLICY "Org update" ON agendas FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Org delete" ON agendas;
CREATE POLICY "Org delete" ON agendas FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- --- AGENDA ITEMS ---
DROP POLICY IF EXISTS "Editor insert" ON agenda_items;
CREATE POLICY "Editor insert" ON agenda_items FOR INSERT
  WITH CHECK (
    agenda_id IN (SELECT id FROM agendas WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON agenda_items;
CREATE POLICY "Editor update" ON agenda_items FOR UPDATE
  USING (agenda_id IN (SELECT id FROM agendas WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (agenda_id IN (SELECT id FROM agendas WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON agenda_items;
CREATE POLICY "Editor delete" ON agenda_items FOR DELETE
  USING (agenda_id IN (SELECT id FROM agendas WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- EVENTS ---
DROP POLICY IF EXISTS "Org insert" ON events;
CREATE POLICY "Org insert" ON events FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY IF EXISTS "Org update" ON events;
CREATE POLICY "Org update" ON events FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Org delete" ON events;
CREATE POLICY "Org delete" ON events FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- --- EVENT VENDORS ---
DROP POLICY IF EXISTS "Editor insert" ON event_vendors;
CREATE POLICY "Editor insert" ON event_vendors FOR INSERT
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON event_vendors;
CREATE POLICY "Editor update" ON event_vendors FOR UPDATE
  USING (event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON event_vendors;
CREATE POLICY "Editor delete" ON event_vendors FOR DELETE
  USING (event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- ATTENDANCE (child of minutes) ---
DROP POLICY IF EXISTS "Editor insert" ON attendance;
CREATE POLICY "Editor insert" ON attendance FOR INSERT
  WITH CHECK (
    minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON attendance;
CREATE POLICY "Editor update" ON attendance FOR UPDATE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON attendance;
CREATE POLICY "Editor delete" ON attendance FOR DELETE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- BUSINESS ITEMS (child of minutes) ---
DROP POLICY IF EXISTS "Editor insert" ON business_items;
CREATE POLICY "Editor insert" ON business_items FOR INSERT
  WITH CHECK (
    minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON business_items;
CREATE POLICY "Editor update" ON business_items FOR UPDATE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON business_items;
CREATE POLICY "Editor delete" ON business_items FOR DELETE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- ACTION ITEMS (child of minutes) ---
DROP POLICY IF EXISTS "Editor insert" ON action_items;
CREATE POLICY "Editor insert" ON action_items FOR INSERT
  WITH CHECK (
    minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON action_items;
CREATE POLICY "Editor update" ON action_items FOR UPDATE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON action_items;
CREATE POLICY "Editor delete" ON action_items FOR DELETE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- FINANCIAL ITEMS (child of minutes) ---
DROP POLICY IF EXISTS "Editor insert" ON financial_items;
CREATE POLICY "Editor insert" ON financial_items FOR INSERT
  WITH CHECK (
    minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON financial_items;
CREATE POLICY "Editor update" ON financial_items FOR UPDATE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON financial_items;
CREATE POLICY "Editor delete" ON financial_items FOR DELETE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- MINUTES UPCOMING EVENTS (child of minutes) ---
DROP POLICY IF EXISTS "Editor insert" ON minutes_upcoming_events;
CREATE POLICY "Editor insert" ON minutes_upcoming_events FOR INSERT
  WITH CHECK (
    minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id())
    AND is_org_editor()
  );

DROP POLICY IF EXISTS "Editor update" ON minutes_upcoming_events;
CREATE POLICY "Editor update" ON minutes_upcoming_events FOR UPDATE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor())
  WITH CHECK (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Editor delete" ON minutes_upcoming_events;
CREATE POLICY "Editor delete" ON minutes_upcoming_events FOR DELETE
  USING (minutes_id IN (SELECT id FROM minutes WHERE organization_id = get_user_org_id()) AND is_org_editor());

-- --- ORGANIZATION ASSETS ---
DROP POLICY IF EXISTS "Editor insert" ON organization_assets;
CREATE POLICY "Editor insert" ON organization_assets FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY IF EXISTS "Editor update" ON organization_assets;
CREATE POLICY "Editor update" ON organization_assets FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Editor delete" ON organization_assets;
CREATE POLICY "Editor delete" ON organization_assets FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- --- ATTACHMENTS ---
DROP POLICY IF EXISTS "Editor insert" ON attachments;
CREATE POLICY "Editor insert" ON attachments FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

DROP POLICY IF EXISTS "Editor delete" ON attachments;
CREATE POLICY "Editor delete" ON attachments FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- --- SUBCOMMITTEES (admin-only writes) ---
DROP POLICY IF EXISTS "Admin insert" ON subcommittees;
CREATE POLICY "Admin insert" ON subcommittees FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_admin());

DROP POLICY IF EXISTS "Admin update" ON subcommittees;
CREATE POLICY "Admin update" ON subcommittees FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_admin())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Admin delete" ON subcommittees;
CREATE POLICY "Admin delete" ON subcommittees FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_admin());

-- --- SUBCOMMITTEE MEMBERS (admin-only writes) ---
DROP POLICY IF EXISTS "Admin insert" ON subcommittee_members;
CREATE POLICY "Admin insert" ON subcommittee_members FOR INSERT
  WITH CHECK (
    subcommittee_id IN (SELECT id FROM subcommittees WHERE organization_id = get_user_org_id())
    AND is_org_admin()
  );

DROP POLICY IF EXISTS "Admin delete" ON subcommittee_members;
CREATE POLICY "Admin delete" ON subcommittee_members FOR DELETE
  USING (
    subcommittee_id IN (SELECT id FROM subcommittees WHERE organization_id = get_user_org_id())
    AND is_org_admin()
  );

-- --- INVITATIONS (admin-only writes) ---
DROP POLICY IF EXISTS "Admin insert" ON invitations;
CREATE POLICY "Admin insert" ON invitations FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_admin());

DROP POLICY IF EXISTS "Admin update" ON invitations;
CREATE POLICY "Admin update" ON invitations FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_admin())
  WITH CHECK (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Admin delete" ON invitations;
CREATE POLICY "Admin delete" ON invitations FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_admin());


-- ============================================================================
-- PART 3: Distribution logs — append-only
-- Once an email send is logged, it cannot be modified or deleted.
-- ============================================================================

DROP POLICY IF EXISTS "Editor update" ON distribution_logs;
DROP POLICY IF EXISTS "Editor delete" ON distribution_logs;
DROP POLICY IF EXISTS "Org update" ON distribution_logs;
DROP POLICY IF EXISTS "Org delete" ON distribution_logs;

-- Only INSERT and SELECT remain — no UPDATE or DELETE allowed.

DROP POLICY IF EXISTS "Editor insert" ON distribution_logs;
CREATE POLICY "Editor insert" ON distribution_logs FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());


-- ============================================================================
-- PART 4: Profiles — add WITH CHECK to admin update policy
-- Prevents admins from changing org_id on other profiles
-- ============================================================================

DROP POLICY IF EXISTS "Admins update org profiles" ON profiles;
CREATE POLICY "Admins update org profiles" ON profiles FOR UPDATE
  USING (
    organization_id = get_user_org_id()
    AND is_org_admin()
  )
  WITH CHECK (
    organization_id = get_user_org_id()
  );
