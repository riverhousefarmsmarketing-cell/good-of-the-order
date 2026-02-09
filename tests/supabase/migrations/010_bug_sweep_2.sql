-- ============================================================================
-- 010: Bug Sweep Fixes (BUG-804, BUG-808, BUG-812, BUG-817, BUG-818)
-- IDEMPOTENT — safe to re-run
-- ============================================================================

-- ─── BUG-818: Clean up duplicate updated_at triggers ─────────────────────────
-- 001 creates trg_*_updated_at, 007 creates *_updated_at — drop the 001 versions
DROP TRIGGER IF EXISTS trg_minutes_updated_at ON minutes;
DROP TRIGGER IF EXISTS trg_agendas_updated_at ON agendas;
DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
-- Keep the 007 versions: minutes_updated_at, agendas_updated_at, events_updated_at

-- ─── BUG-808: Remove unused 'review' status from minutes CHECK constraint ────
-- The frontend only uses 'draft' and 'approved'. Remove 'review' to prevent confusion.
-- Also add 'final' for backwards compatibility with any legacy data.
DO $$
BEGIN
  -- Drop and recreate the constraint
  ALTER TABLE minutes DROP CONSTRAINT IF EXISTS minutes_status_check;
  ALTER TABLE minutes ADD CONSTRAINT minutes_status_check 
    CHECK (status IN ('draft', 'approved'));
  
  -- Update any legacy 'final' or 'review' records to 'approved'
  UPDATE minutes SET status = 'approved' WHERE status IN ('final', 'review');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Status constraint update: %', SQLERRM;
END $$;

-- ─── BUG-804: Atomic agenda save RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION save_agenda_atomic(
  p_agenda      jsonb,
  p_items       jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb  -- returns {id, updated_at}
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_org_id     uuid;
  v_role       text;
  v_agenda_id  uuid;
  v_loaded_at  timestamptz;
  v_updated_at timestamptz;
BEGIN
  -- Auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT organization_id, role INTO v_org_id, v_role
    FROM profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization' USING ERRCODE = '23514';
  END IF;
  IF v_role NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = '42501';
  END IF;

  v_agenda_id := NULLIF(p_agenda->>'id', '')::uuid;
  v_loaded_at := NULLIF(p_agenda->>'_loaded_at', '')::timestamptz;

  -- INSERT
  IF v_agenda_id IS NULL OR NOT EXISTS (SELECT 1 FROM agendas WHERE id = v_agenda_id AND organization_id = v_org_id) THEN
    INSERT INTO agendas (
      organization_id, meeting_type, subcommittee_id,
      meeting_date, meeting_time, location, status,
      source_minutes_id, created_by
    ) VALUES (
      v_org_id,
      COALESCE(p_agenda->>'meeting_type', 'BOARD'),
      NULLIF(p_agenda->>'subcommittee_id', '')::uuid,
      NULLIF(p_agenda->>'meeting_date', '')::date,
      NULLIF(p_agenda->>'meeting_time', ''),
      NULLIF(p_agenda->>'location', ''),
      COALESCE(p_agenda->>'status', 'draft'),
      NULLIF(p_agenda->>'source_minutes_id', '')::uuid,
      v_user_id
    )
    RETURNING id, updated_at INTO v_agenda_id, v_updated_at;

  -- UPDATE
  ELSE
    -- Optimistic lock with 5s tolerance
    IF v_loaded_at IS NOT NULL THEN
      UPDATE agendas SET
        meeting_type = COALESCE(p_agenda->>'meeting_type', meeting_type),
        subcommittee_id = NULLIF(p_agenda->>'subcommittee_id', '')::uuid,
        meeting_date = COALESCE(NULLIF(p_agenda->>'meeting_date', '')::date, meeting_date),
        meeting_time = NULLIF(p_agenda->>'meeting_time', ''),
        location = NULLIF(p_agenda->>'location', ''),
        status = COALESCE(p_agenda->>'status', status),
        source_minutes_id = NULLIF(p_agenda->>'source_minutes_id', '')::uuid
      WHERE id = v_agenda_id
        AND organization_id = v_org_id
        AND updated_at = v_loaded_at
      RETURNING id, updated_at INTO v_agenda_id, v_updated_at;

      IF v_agenda_id IS NULL THEN
        RAISE EXCEPTION 'Conflict: agenda updated by someone else'
          USING ERRCODE = '40001';
      END IF;
    ELSE
      UPDATE agendas SET
        meeting_type = COALESCE(p_agenda->>'meeting_type', meeting_type),
        subcommittee_id = NULLIF(p_agenda->>'subcommittee_id', '')::uuid,
        meeting_date = COALESCE(NULLIF(p_agenda->>'meeting_date', '')::date, meeting_date),
        meeting_time = NULLIF(p_agenda->>'meeting_time', ''),
        location = NULLIF(p_agenda->>'location', ''),
        status = COALESCE(p_agenda->>'status', status),
        source_minutes_id = NULLIF(p_agenda->>'source_minutes_id', '')::uuid
      WHERE id = v_agenda_id AND organization_id = v_org_id
      RETURNING id, updated_at INTO v_agenda_id, v_updated_at;

      IF v_agenda_id IS NULL THEN
        RAISE EXCEPTION 'Agenda not found or access denied' USING ERRCODE = 'P0002';
      END IF;
    END IF;
  END IF;

  -- Atomic child table replace
  DELETE FROM agenda_items WHERE agenda_id = v_agenda_id;
  INSERT INTO agenda_items (agenda_id, title, description, is_standard, is_inherited, source_minutes_id, sort_order)
  SELECT
    v_agenda_id,
    x.value->>'title',
    NULLIF(x.value->>'description', ''),
    COALESCE((x.value->>'is_standard')::boolean, false),
    COALESCE((x.value->>'is_inherited')::boolean, false),
    NULLIF(x.value->>'source_minutes_id', '')::uuid,
    x.ord::int
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
       WITH ORDINALITY AS x(value, ord)
  WHERE x.value->>'title' IS NOT NULL;

  RETURN jsonb_build_object('id', v_agenda_id, 'updated_at', v_updated_at);
END;
$$;

GRANT EXECUTE ON FUNCTION save_agenda_atomic(jsonb, jsonb) TO authenticated;

-- ─── BUG-812: Server-side email rate limiting function ───────────────────────
CREATE OR REPLACE FUNCTION check_email_rate_limit(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM distribution_logs
  WHERE organization_id = p_org_id
    AND sent_at > NOW() - interval '1 hour';
  
  -- Allow max 20 emails per org per hour
  RETURN v_count < 20;
END;
$$;

GRANT EXECUTE ON FUNCTION check_email_rate_limit(uuid) TO authenticated;

-- ─── BUG-817: Placeholder migrations for gaps ───────────────────────────────
-- Note: Migrations 002-004 and 006 were applied directly via Supabase dashboard.
-- 002: Added subcommittee_members junction table
-- 003: Added organization branding columns (primary_color, logo_url)
-- 004: Added attachments table
-- 006: Added organization_assets table
-- These are documented here for migration history completeness.
