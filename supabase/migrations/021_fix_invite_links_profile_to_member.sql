-- Migration: 021_fix_invite_links_profile_to_member
-- Date: 2026-03-08
-- Description:
--   When a user accepts an invitation, handle_new_user_signup creates their
--   profile but never sets linked_profile_id on the matching members row.
--   This causes:
--     1. Duplicate-looking members (directory row + profile row unlinked)
--     2. Role editing broken (has_account = false because link is missing)
--
--   Fix: Update the trigger to set linked_profile_id on the members row
--   when an invited user signs up, matching on org + email.
--
--   Backfill: Link existing profiles to their members rows where email
--   and organization_id match and linked_profile_id is currently NULL.
--
-- Depends on: 020_members_add_notes

-- ============================================================
-- PART 1: Backfill existing unlinked pairs
-- ============================================================
UPDATE members m
SET linked_profile_id = p.id,
    updated_at        = NOW()
FROM profiles p
WHERE p.organization_id = m.organization_id
  AND lower(p.email)    = lower(m.email)
  AND m.linked_profile_id IS NULL;

-- ============================================================
-- PART 2: Update trigger to link member row on invite acceptance
-- ============================================================
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
  new_profile_id UUID;
BEGIN
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    SELECT organization_id INTO org_id
    FROM invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND accepted_at IS NULL
      AND expires_at > NOW();

    IF org_id IS NOT NULL THEN
      -- Create the profile
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

      -- Link the matching members row (same org + email)
      UPDATE members
      SET linked_profile_id = NEW.id,
          updated_at        = NOW()
      WHERE organization_id = org_id
        AND lower(email)    = lower(NEW.email)
        AND linked_profile_id IS NULL;

      -- Mark invitation accepted
      UPDATE invitations
      SET accepted_at = NOW()
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';

      RETURN NEW;
    END IF;
  END IF;

  -- Non-invite signup: create a new org + admin profile
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

-- Rollback reference (do not run unless reverting):
-- Restore previous version of handle_new_user_signup from migration 008.
-- The backfill UPDATE cannot be automatically reversed.
