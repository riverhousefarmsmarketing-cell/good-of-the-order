-- Migration: 026_invite_email_binding_and_feedback_attribution
-- Date: 2026-08-11
-- Description: Two audit follow-ups.
--   1. handle_new_user_signup accepted an invitation by token alone, without
--      checking that the signing-up user's email matches the invited email.
--      Anyone holding a (anon-lookupable) invite token could join the org under
--      a different email and inherit the invited role. Bind acceptance to the
--      email; a token/email mismatch falls through to normal new-org signup.
--   2. The feedback INSERT policy validated org membership but not
--      submitted_by = auth.uid(), so a user could attribute feedback to another
--      profile in their org. Add the self-attribution check.
-- Depends on: 025_optimistic_lock_immutability_child_guard
-- Not auto-applied — apply via your Supabase flow.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Bind invitation acceptance to the invited email
-- ═══════════════════════════════════════════════════════════════════════════
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
    -- Only honor an invitation whose email matches the signing-up user.
    SELECT organization_id INTO org_id
    FROM invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND accepted_at IS NULL
      AND expires_at > NOW()
      AND lower(email) = lower(NEW.email);

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
      WHERE token = NEW.raw_user_meta_data->>'invitation_token'
        AND lower(email) = lower(NEW.email);

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
      WHERE token = NEW.raw_user_meta_data->>'invitation_token'
        AND lower(email) = lower(NEW.email);

      RETURN NEW;
    END IF;
  END IF;

  -- Non-invite signup (or token/email mismatch): create a new org + admin profile
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

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Bind feedback rows to their submitter
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Org members can insert feedback" ON feedback;

CREATE POLICY "Org members can insert feedback"
  ON feedback FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );
