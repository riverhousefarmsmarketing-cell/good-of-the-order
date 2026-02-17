-- Migration: 016_distribution_contacts_with_check
-- Date: 2026-02-16
-- Description: Add WITH CHECK to distribution_contacts UPDATE policy (CR-003)
-- Depends on: 015_set_search_path

DROP POLICY "Editor update" ON distribution_contacts;

CREATE POLICY "Editor update" ON distribution_contacts
  FOR UPDATE
  USING (
    organization_id = get_user_org_id()
    AND is_org_editor()
  )
  WITH CHECK (
    organization_id = get_user_org_id()
  );
