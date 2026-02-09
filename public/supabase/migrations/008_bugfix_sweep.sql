-- ============================================================================
-- 008: Comprehensive Bug Fix Sweep (IDEMPOTENT — safe to re-run)
-- Addresses: BUG-001, BUG-003, BUG-004, BUG-006, BUG-009, BUG-015, BUG-026
-- Date: 2026-02-07
-- ============================================================================

-- ─── BUG-003: Add missing 'accounts' JSONB column to minutes ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'minutes' AND column_name = 'accounts'
  ) THEN
    ALTER TABLE minutes ADD COLUMN accounts JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ─── BUG-004: Add missing 'logo_position' column to organizations ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'logo_position'
  ) THEN
    ALTER TABLE organizations ADD COLUMN logo_position TEXT DEFAULT 'center';
  END IF;
END $$;

-- ─── BUG-026: Add missing 'organization_type' column to organizations ────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'organization_type'
  ) THEN
    ALTER TABLE organizations ADD COLUMN organization_type TEXT;
  END IF;
END $$;

-- ─── BUG-001: Fix distribution_contacts RLS (was USING(true)) ────────────────
DROP POLICY IF EXISTS "Through org" ON distribution_contacts;
DROP POLICY IF EXISTS "Org isolation" ON distribution_contacts;
DROP POLICY IF EXISTS "Org write" ON distribution_contacts;
DROP POLICY IF EXISTS "Org update" ON distribution_contacts;
DROP POLICY IF EXISTS "Org delete" ON distribution_contacts;
CREATE POLICY "Org isolation" ON distribution_contacts FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org write" ON distribution_contacts FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "Org update" ON distribution_contacts FOR UPDATE
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org delete" ON distribution_contacts FOR DELETE
  USING (organization_id = get_user_org_id());

-- ─── BUG-006: Split "Org isolation" FOR ALL into role-based read/write ───────

-- Helper: check if current user is admin or editor
CREATE OR REPLACE FUNCTION is_org_editor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'editor')
  );
$$;

-- === AGENDAS ===
DROP POLICY IF EXISTS "Org isolation" ON agendas;
DROP POLICY IF EXISTS "Org read" ON agendas;
DROP POLICY IF EXISTS "Org insert" ON agendas;
DROP POLICY IF EXISTS "Org update" ON agendas;
DROP POLICY IF EXISTS "Org delete" ON agendas;
CREATE POLICY "Org read" ON agendas FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org insert" ON agendas FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org update" ON agendas FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org delete" ON agendas FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- === MINUTES ===
DROP POLICY IF EXISTS "Org isolation" ON minutes;
DROP POLICY IF EXISTS "Org read" ON minutes;
DROP POLICY IF EXISTS "Org insert" ON minutes;
DROP POLICY IF EXISTS "Org update" ON minutes;
DROP POLICY IF EXISTS "Org delete" ON minutes;
CREATE POLICY "Org read" ON minutes FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org insert" ON minutes FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org update" ON minutes FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org delete" ON minutes FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- === EVENTS ===
DROP POLICY IF EXISTS "Org isolation" ON events;
DROP POLICY IF EXISTS "Org read" ON events;
DROP POLICY IF EXISTS "Org insert" ON events;
DROP POLICY IF EXISTS "Org update" ON events;
DROP POLICY IF EXISTS "Org delete" ON events;
CREATE POLICY "Org read" ON events FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org insert" ON events FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org update" ON events FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org delete" ON events FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- === DISTRIBUTION LOGS ===
DROP POLICY IF EXISTS "Org isolation" ON distribution_logs;
DROP POLICY IF EXISTS "Org read" ON distribution_logs;
DROP POLICY IF EXISTS "Org insert" ON distribution_logs;
CREATE POLICY "Org read" ON distribution_logs FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org insert" ON distribution_logs FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());

-- === ATTACHMENTS ===
DROP POLICY IF EXISTS "Org isolation" ON attachments;
DROP POLICY IF EXISTS "Org read" ON attachments;
DROP POLICY IF EXISTS "Org insert" ON attachments;
DROP POLICY IF EXISTS "Org delete" ON attachments;
CREATE POLICY "Org read" ON attachments FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org insert" ON attachments FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org delete" ON attachments FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- === ORGANIZATION ASSETS ===
DROP POLICY IF EXISTS "Org isolation" ON organization_assets;
DROP POLICY IF EXISTS "Org read" ON organization_assets;
DROP POLICY IF EXISTS "Org write" ON organization_assets;
DROP POLICY IF EXISTS "Org delete" ON organization_assets;
CREATE POLICY "Org read" ON organization_assets FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org write" ON organization_assets FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org delete" ON organization_assets FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- === SUBCOMMITTEES ===
DROP POLICY IF EXISTS "Org isolation" ON subcommittees;
DROP POLICY IF EXISTS "Org read" ON subcommittees;
DROP POLICY IF EXISTS "Org write" ON subcommittees;
DROP POLICY IF EXISTS "Org update" ON subcommittees;
DROP POLICY IF EXISTS "Org delete" ON subcommittees;
CREATE POLICY "Org read" ON subcommittees FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Org write" ON subcommittees FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org update" ON subcommittees FOR UPDATE
  USING (organization_id = get_user_org_id() AND is_org_editor());
CREATE POLICY "Org delete" ON subcommittees FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_editor());

-- === INVITATIONS ===
DROP POLICY IF EXISTS "Public invite lookup" ON invitations;
DROP POLICY IF EXISTS "Org isolation" ON invitations;
DROP POLICY IF EXISTS "Org read" ON invitations;
DROP POLICY IF EXISTS "Admin write" ON invitations;
DROP POLICY IF EXISTS "Admin delete" ON invitations;
CREATE POLICY "Org read" ON invitations FOR SELECT
  USING (organization_id = get_user_org_id());
CREATE POLICY "Admin write" ON invitations FOR INSERT
  WITH CHECK (organization_id = get_user_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admin delete" ON invitations FOR DELETE
  USING (organization_id = get_user_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ─── BUG-009: Public RPC for slug availability check ─────────────────────────
CREATE OR REPLACE FUNCTION check_slug_available(check_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM organizations WHERE slug = check_slug
  );
$$;

GRANT EXECUTE ON FUNCTION check_slug_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_slug_available(TEXT) TO authenticated;

-- ─── BUG-015: RPC for invite token lookup (replaces public SELECT) ───────────
CREATE OR REPLACE FUNCTION lookup_invitation(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email TEXT,
  role TEXT,
  board_position TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.organization_id, i.email, i.role, i.board_position, i.expires_at
  FROM invitations i
  WHERE i.token = invite_token
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW();
$$;

GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION lookup_invitation(TEXT) TO authenticated;

-- ─── Update signup trigger to handle organization_type ───────────────────────
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  org_type TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    SELECT organization_id INTO org_id
    FROM invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND accepted_at IS NULL
      AND expires_at > NOW();

    IF org_id IS NOT NULL THEN
      INSERT INTO profiles (id, organization_id, email, full_name, role, board_position)
      SELECT
        NEW.id,
        organization_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        role,
        board_position
      FROM invitations
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';

      UPDATE invitations
      SET accepted_at = NOW()
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';

      RETURN NEW;
    END IF;
  END IF;

  org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');
  org_slug := COALESCE(NEW.raw_user_meta_data->>'organization_slug', 'org' || substr(gen_random_uuid()::text, 1, 6));
  org_type := NEW.raw_user_meta_data->>'organization_type';

  INSERT INTO organizations (name, slug, organization_type)
  VALUES (org_name, org_slug, org_type)
  RETURNING id INTO org_id;

  INSERT INTO profiles (id, organization_id, email, full_name, role)
  VALUES (
    NEW.id,
    org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );

  RETURN NEW;
END;
$$;
