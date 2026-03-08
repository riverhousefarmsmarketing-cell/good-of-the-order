-- Migration: 019_fix_agenda_optimistic_locking
-- Date: 2026-03-04
-- Description: Fix save_agenda_atomic to use 5-second tolerance interval
--   for optimistic locking, matching the pattern already used in save_minutes_atomic.
--   Strict timestamp equality (=) causes spurious "Conflict" errors because
--   JavaScript Date.toISOString() and Postgres timestamptz can differ by
--   fractional seconds on round-trip.
-- Depends on: 018 (organization_accounts — applied directly, see BUG-1003)
-- Fixes: BUG-1001 / BUG-903

-- Re-create save_agenda_atomic with the tolerance fix on the UPDATE WHERE clause.
-- Only the WHERE clause on the optimistic-locking branch changes:
--   OLD: AND updated_at = v_loaded_at
--   NEW: AND updated_at <= v_loaded_at + interval '5 seconds'

CREATE OR REPLACE FUNCTION save_agenda_atomic(
  p_agenda jsonb,
  p_items  jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT organization_id, role
    INTO v_org_id, v_role
    FROM profiles
   WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization' USING ERRCODE = '23514';
  END IF;

  IF v_role NOT IN ('admin', 'editor') THEN
    RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = '42501';
  END IF;

  IF NOT is_email_verified() THEN
    RAISE EXCEPTION 'Email verification required' USING ERRCODE = '28000';
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

  -- UPDATE (with optimistic locking)
  ELSE
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
        AND updated_at <= v_loaded_at + interval '5 seconds'
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
