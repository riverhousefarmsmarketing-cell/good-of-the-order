-- Migration: 024_backend_hardening
-- Date: 2026-08-11
-- Description: Pure-hardening follow-up from the goatsteward-prompted audit.
--   No intended behavior change for legitimate users — closes three gaps:
--     1. members UPDATE RLS had USING but no WITH CHECK (cross-org row move).
--     2. enforce_profile_field_locks() is SECURITY DEFINER without a pinned
--        search_path (the one function 015 missed).
--     3. organization_accounts ended up in an order-dependent state: two
--        different 018_* migrations created divergent policy sets (admin-only
--        vs admin+editor) and one wired an updated_at trigger to a
--        non-existent function (update_updated_at_column). This makes the
--        policies + trigger deterministic. Forward-only — the historical
--        duplicate 018_*/019_* files are left as applied history.
-- Depends on: 023_stripe_billing

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. members: add WITH CHECK to the UPDATE policy
-- ═══════════════════════════════════════════════════════════════════════════
-- Without WITH CHECK, an admin/editor could UPDATE a members row they own and
-- set organization_id (or linked_profile_id) to another org, moving the row
-- across tenants. The WITH CHECK mirrors USING so the post-update row must
-- still belong to the caller's org. (INSERT already had WITH CHECK; only
-- UPDATE was missing it — see 019_catchup_members_table.sql.)

DROP POLICY IF EXISTS "Admins editors can update" ON members;

CREATE POLICY "Admins editors can update"
  ON members FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Pin search_path on enforce_profile_field_locks (CR-002 class)
-- ═══════════════════════════════════════════════════════════════════════════
-- This SECURITY DEFINER trigger runs on every profiles UPDATE and gates
-- role/org changes. 015 pinned search_path on the other SECURITY DEFINER
-- functions but omitted this one. Guarded so it is a no-op if the function is
-- absent in some environment.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'enforce_profile_field_locks'
  ) THEN
    ALTER FUNCTION public.enforce_profile_field_locks() SET search_path = public;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. organization_accounts: deterministic policies + valid updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════════
-- Drop every policy-name variant produced by either 018_* migration, then
-- recreate the single intended set: any active org member may read; admins and
-- editors may insert/update; only admins may delete. Matches the hardened
-- pattern used elsewhere (email-verified + active).

ALTER TABLE organization_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org accounts"      ON organization_accounts;
DROP POLICY IF EXISTS "Admins can insert org accounts"       ON organization_accounts;
DROP POLICY IF EXISTS "Admins can update org accounts"       ON organization_accounts;
DROP POLICY IF EXISTS "Admins can delete org accounts"       ON organization_accounts;
DROP POLICY IF EXISTS "Admin/Editor can insert org accounts" ON organization_accounts;
DROP POLICY IF EXISTS "Admin/Editor can update org accounts" ON organization_accounts;
DROP POLICY IF EXISTS "Admin can delete org accounts"        ON organization_accounts;

CREATE POLICY "Users can view own org accounts"
  ON organization_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND is_active = true
    )
    AND is_email_verified()
  );

CREATE POLICY "Admin/Editor can insert org accounts"
  ON organization_accounts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor') AND is_active = true
    )
    AND is_email_verified()
  );

CREATE POLICY "Admin/Editor can update org accounts"
  ON organization_accounts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor') AND is_active = true
    )
    AND is_email_verified()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'editor') AND is_active = true
    )
    AND is_email_verified()
  );

CREATE POLICY "Admin can delete org accounts"
  ON organization_accounts FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
    AND is_email_verified()
  );

-- Repair the updated_at trigger: 018_organization_accounts_and_fix_accounts_rpc
-- wired it to update_updated_at_column(), which does not exist (the real
-- functions are update_updated_at() from 001 and set_updated_at() from 007).
DROP TRIGGER IF EXISTS set_updated_at_org_accounts ON organization_accounts;

CREATE TRIGGER set_updated_at_org_accounts
  BEFORE UPDATE ON organization_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
