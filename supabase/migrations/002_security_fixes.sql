-- ============================================================================
-- SECURITY FIX: Restrict profile self-update and tighten invitation access
-- Migration: 002_security_fixes.sql
-- Date: 2026-02-09
-- Fixes: BUG-080 (role escalation), BUG-081 (org hop), BUG-082 (invitation leak)
-- ============================================================================

-- BUG-080 + BUG-081: Drop the overly permissive self-update policy
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

-- Replace with restricted self-update:
-- WITH CHECK ensures role and organization_id cannot be changed
CREATE POLICY "Users update own safe fields"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND organization_id = get_user_org_id()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- BUG-082: Drop the wide-open invitation SELECT
DROP POLICY IF EXISTS "Public invite lookup" ON invitations;

-- Replace: only org members can see invitations
CREATE POLICY "Org members see own invitations"
  ON invitations FOR SELECT
  USING (organization_id = get_user_org_id());

-- Cleanup: remove duplicate policy (if exists from earlier migration)
DROP POLICY IF EXISTS "Org invite lookup" ON invitations;