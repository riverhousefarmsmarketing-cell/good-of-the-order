-- Migration: 025_optimistic_lock_immutability_child_guard
-- Date: 2026-08-11
-- Description: Behavioral security/data-integrity fixes from the audit.
--   1. Replace the 5-second optimistic-lock tolerance window (which let two
--      edits within ~5s silently clobber each other) with a precision-immune
--      integer lock_version. Exact updated_at equality was tried before and
--      reverted (019) because JS/Postgres timestamps differ on round-trip; an
--      integer version avoids the timestamp entirely.
--   2. Guard the child-table replace: child arrays sent as NULL are left
--      untouched instead of wiping attendance/business/action/financial/events
--      (or agenda_items). Clients that send [] still clear, as today.
--   3. Approved (or revised) minutes become immutable through save_minutes_atomic
--      — edits must go through the revision workflow. The draft→approved
--      transition itself is still allowed.
-- Depends on: 024_backend_hardening
--
-- Deploy coupling: forward/backward compatible. If the client hasn't been
-- updated yet it sends no _lock_version and the RPC falls back to the legacy
-- updated_at window; once the client sends _lock_version, version locking wins.
-- Not auto-applied — apply via your Supabase flow and smoke-test a save.

-- ═══════════════════════════════════════════════════════════════════════════
-- Lock-version columns
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0;
ALTER TABLE agendas ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- save_minutes_atomic
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION save_minutes_atomic(
  p_minutes jsonb,
  p_attendance jsonb DEFAULT NULL,
  p_business_items jsonb DEFAULT NULL,
  p_action_items jsonb DEFAULT NULL,
  p_financial_items jsonb DEFAULT NULL,
  p_upcoming_events jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_org_id      uuid;
  v_role        text;
  v_minutes_id  uuid;
  v_loaded_at   timestamptz;
  v_updated_at  timestamptz;
  v_lock_version int;
  v_new_version  int;
  v_cur_status  text;
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

  v_minutes_id   := NULLIF(p_minutes->>'id', '')::uuid;
  v_loaded_at    := NULLIF(p_minutes->>'_loaded_at', '')::timestamptz;
  v_lock_version := NULLIF(p_minutes->>'_lock_version', '')::int;

  IF v_minutes_id IS NULL THEN
    INSERT INTO minutes (
      organization_id, agenda_id, meeting_type, subcommittee_id, status,
      meeting_date, meeting_time, location, facilitator_id, recorder_id,
      time_called_to_order, time_adjourned, invocation, pledge_recited, quorum,
      guests, agenda_changes, agenda_approval_motion, agenda_no_motion,
      previous_meeting_dates, minutes_approval_motion, minutes_no_motion,
      total_donations_ytd, donations_since_last_meeting, current_account_balance,
      accounts,
      financial_report_motion, financial_no_motion, correspondence,
      presidents_report, presidents_report_motion, presidents_report_no_motion,
      member_services_report, member_services_motion, member_services_no_motion,
      state_board_report, state_board_motion, state_board_no_motion,
      membership_committee, new_members, membership_motion, membership_no_motion,
      pac_committee, pac_motion, pac_no_motion,
      nomination_committee, nomination_motion, nomination_no_motion,
      policy_committee, policy_motion, policy_no_motion,
      good_of_the_order, adjournment_motion, adjournment_no_motion,
      created_by, revision_of, revision_number
    )
    VALUES (
      v_org_id,
      NULLIF(p_minutes->>'agenda_id','')::uuid,
      COALESCE(p_minutes->>'meeting_type','BOARD'),
      NULLIF(p_minutes->>'subcommittee_id','')::uuid,
      COALESCE(p_minutes->>'status','draft'),
      (p_minutes->>'meeting_date')::date,
      NULLIF(p_minutes->>'meeting_time',''),
      NULLIF(p_minutes->>'location',''),
      NULLIF(p_minutes->>'facilitator_id','')::uuid,
      NULLIF(p_minutes->>'recorder_id','')::uuid,
      NULLIF(p_minutes->>'time_called_to_order',''),
      NULLIF(p_minutes->>'time_adjourned',''),
      NULLIF(p_minutes->>'invocation',''),
      COALESCE((p_minutes->>'pledge_recited')::boolean, true),
      COALESCE(p_minutes->>'quorum','present'),
      NULLIF(p_minutes->>'guests',''),
      NULLIF(p_minutes->>'agenda_changes',''),
      p_minutes->'agenda_approval_motion',
      COALESCE((p_minutes->>'agenda_no_motion')::boolean, false),
      NULLIF(p_minutes->>'previous_meeting_dates',''),
      p_minutes->'minutes_approval_motion',
      COALESCE((p_minutes->>'minutes_no_motion')::boolean, false),
      strip_money(p_minutes->>'total_donations_ytd')::numeric,
      strip_money(p_minutes->>'donations_since_last_meeting')::numeric,
      strip_money(p_minutes->>'current_account_balance')::numeric,
      COALESCE(p_minutes->'accounts', '[]'::jsonb),
      p_minutes->'financial_report_motion',
      COALESCE((p_minutes->>'financial_no_motion')::boolean, false),
      NULLIF(p_minutes->>'correspondence',''),
      NULLIF(p_minutes->>'presidents_report',''),
      p_minutes->'presidents_report_motion',
      COALESCE((p_minutes->>'presidents_report_no_motion')::boolean, true),
      NULLIF(p_minutes->>'member_services_report',''),
      p_minutes->'member_services_motion',
      COALESCE((p_minutes->>'member_services_no_motion')::boolean, true),
      NULLIF(p_minutes->>'state_board_report',''),
      p_minutes->'state_board_motion',
      COALESCE((p_minutes->>'state_board_no_motion')::boolean, true),
      NULLIF(p_minutes->>'membership_committee',''),
      NULLIF(p_minutes->>'new_members',''),
      p_minutes->'membership_motion',
      COALESCE((p_minutes->>'membership_no_motion')::boolean, true),
      NULLIF(p_minutes->>'pac_committee',''),
      p_minutes->'pac_motion',
      COALESCE((p_minutes->>'pac_no_motion')::boolean, true),
      NULLIF(p_minutes->>'nomination_committee',''),
      p_minutes->'nomination_motion',
      COALESCE((p_minutes->>'nomination_no_motion')::boolean, true),
      NULLIF(p_minutes->>'policy_committee',''),
      p_minutes->'policy_motion',
      COALESCE((p_minutes->>'policy_no_motion')::boolean, true),
      NULLIF(p_minutes->>'good_of_the_order',''),
      p_minutes->'adjournment_motion',
      COALESCE((p_minutes->>'adjournment_no_motion')::boolean, true),
      v_user_id,
      NULLIF(p_minutes->>'revision_of','')::uuid,
      COALESCE(NULLIF(p_minutes->>'revision_number','')::int, 0)
    )
    RETURNING id, updated_at, lock_version INTO v_minutes_id, v_updated_at, v_new_version;

  ELSE
    -- Lock the row and read its current status.
    SELECT status INTO v_cur_status
      FROM minutes
     WHERE id = v_minutes_id AND organization_id = v_org_id
     FOR UPDATE;

    IF v_cur_status IS NULL THEN
      RAISE EXCEPTION 'Minutes not found or access denied' USING ERRCODE = '42501';
    END IF;

    -- Immutability: approved/revised minutes are the official record.
    IF v_cur_status IN ('approved', 'revised') THEN
      RAISE EXCEPTION 'Approved minutes are immutable — create a revision to make changes'
        USING ERRCODE = '42501';
    END IF;

    -- Optimistic-lock check against the locked row.
    IF v_lock_version IS NOT NULL THEN
      PERFORM 1 FROM minutes
        WHERE id = v_minutes_id AND lock_version = v_lock_version;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Conflict: minutes updated by someone else' USING ERRCODE = '40001';
      END IF;
    ELSIF v_loaded_at IS NOT NULL THEN
      -- Legacy fallback for clients that have not adopted lock_version yet.
      PERFORM 1 FROM minutes
        WHERE id = v_minutes_id AND updated_at <= v_loaded_at + interval '5 seconds';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Conflict: minutes updated by someone else' USING ERRCODE = '40001';
      END IF;
    END IF;

    UPDATE minutes
    SET
      agenda_id                    = NULLIF(p_minutes->>'agenda_id','')::uuid,
      meeting_type                 = COALESCE(p_minutes->>'meeting_type', meeting_type),
      subcommittee_id              = NULLIF(p_minutes->>'subcommittee_id','')::uuid,
      status                       = COALESCE(p_minutes->>'status', status),
      meeting_date                 = COALESCE(NULLIF(p_minutes->>'meeting_date','')::date, meeting_date),
      meeting_time                 = NULLIF(p_minutes->>'meeting_time',''),
      location                     = NULLIF(p_minutes->>'location',''),
      facilitator_id               = NULLIF(p_minutes->>'facilitator_id','')::uuid,
      recorder_id                  = NULLIF(p_minutes->>'recorder_id','')::uuid,
      time_called_to_order         = NULLIF(p_minutes->>'time_called_to_order',''),
      time_adjourned               = NULLIF(p_minutes->>'time_adjourned',''),
      invocation                   = NULLIF(p_minutes->>'invocation',''),
      pledge_recited               = COALESCE((p_minutes->>'pledge_recited')::boolean, pledge_recited),
      quorum                       = COALESCE(p_minutes->>'quorum', quorum),
      guests                       = NULLIF(p_minutes->>'guests',''),
      agenda_changes               = NULLIF(p_minutes->>'agenda_changes',''),
      agenda_approval_motion       = p_minutes->'agenda_approval_motion',
      agenda_no_motion             = COALESCE((p_minutes->>'agenda_no_motion')::boolean, agenda_no_motion),
      previous_meeting_dates       = NULLIF(p_minutes->>'previous_meeting_dates',''),
      minutes_approval_motion      = p_minutes->'minutes_approval_motion',
      minutes_no_motion            = COALESCE((p_minutes->>'minutes_no_motion')::boolean, minutes_no_motion),
      total_donations_ytd          = strip_money(p_minutes->>'total_donations_ytd')::numeric,
      donations_since_last_meeting = strip_money(p_minutes->>'donations_since_last_meeting')::numeric,
      current_account_balance      = strip_money(p_minutes->>'current_account_balance')::numeric,
      accounts                     = COALESCE(p_minutes->'accounts', '[]'::jsonb),
      financial_report_motion      = p_minutes->'financial_report_motion',
      financial_no_motion          = COALESCE((p_minutes->>'financial_no_motion')::boolean, financial_no_motion),
      correspondence               = NULLIF(p_minutes->>'correspondence',''),
      presidents_report            = NULLIF(p_minutes->>'presidents_report',''),
      presidents_report_motion     = p_minutes->'presidents_report_motion',
      presidents_report_no_motion  = COALESCE((p_minutes->>'presidents_report_no_motion')::boolean, presidents_report_no_motion),
      member_services_report       = NULLIF(p_minutes->>'member_services_report',''),
      member_services_motion       = p_minutes->'member_services_motion',
      member_services_no_motion    = COALESCE((p_minutes->>'member_services_no_motion')::boolean, member_services_no_motion),
      state_board_report           = NULLIF(p_minutes->>'state_board_report',''),
      state_board_motion           = p_minutes->'state_board_motion',
      state_board_no_motion        = COALESCE((p_minutes->>'state_board_no_motion')::boolean, state_board_no_motion),
      membership_committee         = NULLIF(p_minutes->>'membership_committee',''),
      new_members                  = NULLIF(p_minutes->>'new_members',''),
      membership_motion            = p_minutes->'membership_motion',
      membership_no_motion         = COALESCE((p_minutes->>'membership_no_motion')::boolean, membership_no_motion),
      pac_committee                = NULLIF(p_minutes->>'pac_committee',''),
      pac_motion                   = p_minutes->'pac_motion',
      pac_no_motion                = COALESCE((p_minutes->>'pac_no_motion')::boolean, pac_no_motion),
      nomination_committee         = NULLIF(p_minutes->>'nomination_committee',''),
      nomination_motion            = p_minutes->'nomination_motion',
      nomination_no_motion         = COALESCE((p_minutes->>'nomination_no_motion')::boolean, nomination_no_motion),
      policy_committee             = NULLIF(p_minutes->>'policy_committee',''),
      policy_motion                = p_minutes->'policy_motion',
      policy_no_motion             = COALESCE((p_minutes->>'policy_no_motion')::boolean, policy_no_motion),
      good_of_the_order            = NULLIF(p_minutes->>'good_of_the_order',''),
      adjournment_motion           = p_minutes->'adjournment_motion',
      adjournment_no_motion        = COALESCE((p_minutes->>'adjournment_no_motion')::boolean, adjournment_no_motion),
      revision_of                  = NULLIF(p_minutes->>'revision_of','')::uuid,
      revision_number              = COALESCE(NULLIF(p_minutes->>'revision_number','')::int, revision_number),
      lock_version                 = lock_version + 1
    WHERE id = v_minutes_id
      AND organization_id = v_org_id
    RETURNING id, updated_at, lock_version INTO v_minutes_id, v_updated_at, v_new_version;
  END IF;

  -- Child tables: replace only the arrays that were provided (NULL = leave as-is).
  IF p_attendance IS NOT NULL THEN
    DELETE FROM attendance WHERE minutes_id = v_minutes_id;
    INSERT INTO attendance (minutes_id, member_id, status)
    SELECT v_minutes_id, (elem->>'member_id')::uuid, elem->>'status'
    FROM jsonb_array_elements(p_attendance) AS elem
    WHERE elem->>'member_id' IS NOT NULL;
  END IF;

  IF p_business_items IS NOT NULL THEN
    DELETE FROM business_items WHERE minutes_id = v_minutes_id;
    INSERT INTO business_items (minutes_id, item_type, title, discussion, motion, no_motion, sort_order)
    SELECT v_minutes_id, elem->>'item_type', elem->>'title', NULLIF(elem->>'discussion',''),
           elem->'motion', COALESCE((elem->>'no_motion')::boolean, true), ROW_NUMBER() OVER ()
    FROM jsonb_array_elements(p_business_items) AS elem;
  END IF;

  IF p_action_items IS NOT NULL THEN
    DELETE FROM action_items WHERE minutes_id = v_minutes_id;
    INSERT INTO action_items (minutes_id, task, assignee_name, assignee_id, due_date, status)
    SELECT v_minutes_id, elem->>'task', NULLIF(elem->>'assignee_name',''),
           NULLIF(elem->>'assignee_id','')::uuid, NULLIF(elem->>'due_date','')::date,
           COALESCE(elem->>'status','pending')
    FROM jsonb_array_elements(p_action_items) AS elem;
  END IF;

  IF p_financial_items IS NOT NULL THEN
    DELETE FROM financial_items WHERE minutes_id = v_minutes_id;
    INSERT INTO financial_items (minutes_id, item_type, description, amount)
    SELECT v_minutes_id, elem->>'item_type', elem->>'description',
           COALESCE(NULLIF(elem->>'amount','')::numeric, 0)
    FROM jsonb_array_elements(p_financial_items) AS elem;
  END IF;

  IF p_upcoming_events IS NOT NULL THEN
    DELETE FROM minutes_upcoming_events WHERE minutes_id = v_minutes_id;
    INSERT INTO minutes_upcoming_events (minutes_id, name, date, location)
    SELECT v_minutes_id, elem->>'name', NULLIF(elem->>'date','')::date, NULLIF(elem->>'location','')
    FROM jsonb_array_elements(p_upcoming_events) AS elem;
  END IF;

  RETURN jsonb_build_object('id', v_minutes_id, 'updated_at', v_updated_at, 'lock_version', v_new_version);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- save_agenda_atomic
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION save_agenda_atomic(
  p_agenda jsonb,
  p_items  jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_org_id       uuid;
  v_role         text;
  v_agenda_id    uuid;
  v_loaded_at    timestamptz;
  v_updated_at   timestamptz;
  v_lock_version int;
  v_new_version  int;
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

  v_agenda_id    := NULLIF(p_agenda->>'id', '')::uuid;
  v_loaded_at    := NULLIF(p_agenda->>'_loaded_at', '')::timestamptz;
  v_lock_version := NULLIF(p_agenda->>'_lock_version', '')::int;

  IF v_agenda_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM agendas WHERE id = v_agenda_id AND organization_id = v_org_id
  ) THEN
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
    RETURNING id, updated_at, lock_version INTO v_agenda_id, v_updated_at, v_new_version;

  ELSE
    -- Lock the row.
    PERFORM 1 FROM agendas
      WHERE id = v_agenda_id AND organization_id = v_org_id
      FOR UPDATE;

    -- Optimistic-lock check against the locked row.
    IF v_lock_version IS NOT NULL THEN
      PERFORM 1 FROM agendas
        WHERE id = v_agenda_id AND lock_version = v_lock_version;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Conflict: agenda updated by someone else' USING ERRCODE = '40001';
      END IF;
    ELSIF v_loaded_at IS NOT NULL THEN
      PERFORM 1 FROM agendas
        WHERE id = v_agenda_id AND updated_at <= v_loaded_at + interval '5 seconds';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Conflict: agenda updated by someone else' USING ERRCODE = '40001';
      END IF;
    END IF;

    UPDATE agendas SET
      meeting_type      = COALESCE(p_agenda->>'meeting_type', meeting_type),
      subcommittee_id   = NULLIF(p_agenda->>'subcommittee_id', '')::uuid,
      meeting_date      = COALESCE(NULLIF(p_agenda->>'meeting_date', '')::date, meeting_date),
      meeting_time      = NULLIF(p_agenda->>'meeting_time', ''),
      location          = NULLIF(p_agenda->>'location', ''),
      status            = COALESCE(p_agenda->>'status', status),
      source_minutes_id = NULLIF(p_agenda->>'source_minutes_id', '')::uuid,
      lock_version      = lock_version + 1
    WHERE id = v_agenda_id AND organization_id = v_org_id
    RETURNING id, updated_at, lock_version INTO v_agenda_id, v_updated_at, v_new_version;
  END IF;

  -- Child items: replace only when provided (NULL = leave as-is).
  IF p_items IS NOT NULL THEN
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
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(value, ord)
    WHERE x.value->>'title' IS NOT NULL;
  END IF;

  RETURN jsonb_build_object('id', v_agenda_id, 'updated_at', v_updated_at, 'lock_version', v_new_version);
END;
$$;
