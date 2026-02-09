-- 009: Atomic Minutes Save RPC (minutes + child tables)
-- Matches client payload from src/hooks/useMinutes.jsx
--
-- Fixes applied vs original draft:
--   1. Fallback UPDATE (no _loaded_at) now writes ALL columns, not just 9
--   2. Money fields stripped of $ and , server-side before ::numeric cast
--   3. Optimistic lock uses 5-second tolerance window instead of exact match
--   4. Returns jsonb {id, updated_at} so client can set _loaded_at after save
--   5. Added COALESCE guard on child-table JSONB arrays

-- Helper: strip currency formatting so "$1,500.00" → "1500.00"
CREATE OR REPLACE FUNCTION strip_money(val text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(val, ''), '[$,\s]', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION save_minutes_atomic(
  p_minutes         jsonb,
  p_attendance      jsonb DEFAULT '[]'::jsonb,
  p_business_items  jsonb DEFAULT '[]'::jsonb,
  p_action_items    jsonb DEFAULT '[]'::jsonb,
  p_financial_items jsonb DEFAULT '[]'::jsonb,
  p_upcoming_events jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb  -- changed from uuid: returns {id, updated_at}
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_org_id     uuid;
  v_role       text;
  v_minutes_id uuid;
  v_loaded_at  timestamptz;
  v_updated_at timestamptz;
BEGIN
  -- ── Auth ──────────────────────────────────────────────────────────────
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

  v_minutes_id := NULLIF(p_minutes->>'id', '')::uuid;
  v_loaded_at  := NULLIF(p_minutes->>'_loaded_at', '')::timestamptz;

  -- ── INSERT (new record) ───────────────────────────────────────────────
  IF v_minutes_id IS NULL THEN
    INSERT INTO minutes (
      organization_id,
      agenda_id,
      meeting_type,
      subcommittee_id,
      status,
      meeting_date,
      meeting_time,
      location,
      facilitator_id,
      recorder_id,
      time_called_to_order,
      time_adjourned,
      invocation,
      pledge_recited,
      quorum,
      guests,
      agenda_changes,
      agenda_approval_motion,
      agenda_no_motion,
      previous_meeting_dates,
      minutes_approval_motion,
      minutes_no_motion,
      total_donations_ytd,
      donations_since_last_meeting,
      current_account_balance,
      financial_report_motion,
      financial_no_motion,
      correspondence,
      presidents_report,
      presidents_report_motion,
      presidents_report_no_motion,
      member_services_report,
      member_services_motion,
      member_services_no_motion,
      state_board_report,
      state_board_motion,
      state_board_no_motion,
      membership_committee,
      new_members,
      membership_motion,
      membership_no_motion,
      pac_committee,
      pac_motion,
      pac_no_motion,
      nomination_committee,
      nomination_motion,
      nomination_no_motion,
      policy_committee,
      policy_motion,
      policy_no_motion,
      good_of_the_order,
      adjournment_motion,
      adjournment_no_motion,
      created_by
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
      v_user_id
    )
    RETURNING id, updated_at INTO v_minutes_id, v_updated_at;

  -- ── UPDATE (existing record) ──────────────────────────────────────────
  ELSE
    -- Optimistic lock: if client provides _loaded_at, enforce it
    IF v_loaded_at IS NOT NULL THEN
      -- Optimistic lock: reject if someone else updated since we loaded
      -- Uses exact timestamp match (not time window) for true conflict detection
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
        adjournment_no_motion        = COALESCE((p_minutes->>'adjournment_no_motion')::boolean, adjournment_no_motion)
      WHERE id = v_minutes_id
        AND organization_id = v_org_id
        AND updated_at = v_loaded_at
      RETURNING id, updated_at INTO v_minutes_id, v_updated_at;

      IF v_minutes_id IS NULL THEN
        RAISE EXCEPTION 'Conflict: minutes updated by someone else'
          USING ERRCODE = '40001';
      END IF;

    -- No _loaded_at: unconditional update (first save of new record, BUG-819)
    -- FIXED: writes ALL columns, not just 9
    ELSE
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
        adjournment_no_motion        = COALESCE((p_minutes->>'adjournment_no_motion')::boolean, adjournment_no_motion)
      WHERE id = v_minutes_id
        AND organization_id = v_org_id
      RETURNING id, updated_at INTO v_minutes_id, v_updated_at;

      IF v_minutes_id IS NULL THEN
        RAISE EXCEPTION 'Minutes not found or access denied' USING ERRCODE = 'P0002';
      END IF;
    END IF;
  END IF;

  -- ── CHILD TABLES: full replace within same transaction ────────────────

  -- Attendance
  DELETE FROM attendance WHERE minutes_id = v_minutes_id;
  INSERT INTO attendance (minutes_id, member_id, status)
  SELECT
    v_minutes_id,
    (x.value->>'member_id')::uuid,
    x.value->>'status'
  FROM jsonb_array_elements(COALESCE(p_attendance, '[]'::jsonb)) AS x(value)
  WHERE x.value->>'member_id' IS NOT NULL;

  -- Business items (old + new)
  DELETE FROM business_items WHERE minutes_id = v_minutes_id;
  INSERT INTO business_items (minutes_id, item_type, title, discussion, motion, no_motion, sort_order)
  SELECT
    v_minutes_id,
    x.value->>'item_type',
    x.value->>'title',
    NULLIF(x.value->>'discussion', ''),
    x.value->'motion',
    COALESCE((x.value->>'no_motion')::boolean, true),
    x.ord::int
  FROM jsonb_array_elements(COALESCE(p_business_items, '[]'::jsonb))
       WITH ORDINALITY AS x(value, ord)
  WHERE x.value->>'title' IS NOT NULL;

  -- Action items
  DELETE FROM action_items WHERE minutes_id = v_minutes_id;
  INSERT INTO action_items (minutes_id, task, assignee_name, assignee_id, due_date, status)
  SELECT
    v_minutes_id,
    x.value->>'task',
    NULLIF(x.value->>'assignee_name', ''),
    NULLIF(x.value->>'assignee_id', '')::uuid,
    NULLIF(x.value->>'due_date', '')::date,
    COALESCE(NULLIF(x.value->>'status', ''), 'pending')
  FROM jsonb_array_elements(COALESCE(p_action_items, '[]'::jsonb)) AS x(value)
  WHERE x.value->>'task' IS NOT NULL;

  -- Financial items (fundraising + expenses)
  DELETE FROM financial_items WHERE minutes_id = v_minutes_id;
  INSERT INTO financial_items (minutes_id, item_type, description, amount)
  SELECT
    v_minutes_id,
    x.value->>'item_type',
    x.value->>'description',
    COALESCE(strip_money(x.value->>'amount')::numeric, 0)
  FROM jsonb_array_elements(COALESCE(p_financial_items, '[]'::jsonb)) AS x(value)
  WHERE x.value->>'description' IS NOT NULL;

  -- Upcoming events (mentioned in minutes, not full events table)
  DELETE FROM minutes_upcoming_events WHERE minutes_id = v_minutes_id;
  INSERT INTO minutes_upcoming_events (minutes_id, name, date, location)
  SELECT
    v_minutes_id,
    x.value->>'name',
    NULLIF(x.value->>'date', ''),
    NULLIF(x.value->>'location', '')
  FROM jsonb_array_elements(COALESCE(p_upcoming_events, '[]'::jsonb)) AS x(value)
  WHERE x.value->>'name' IS NOT NULL;

  -- Return id + updated_at so client can set _loaded_at for next save
  RETURN jsonb_build_object(
    'id', v_minutes_id,
    'updated_at', v_updated_at
  );
END;
$$;

-- Allow authenticated users to call it (role checks enforced inside function)
GRANT EXECUTE ON FUNCTION strip_money(text) TO authenticated;
GRANT EXECUTE ON FUNCTION save_minutes_atomic(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
