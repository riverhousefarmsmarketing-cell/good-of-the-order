import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for minutes CRUD operations.
 * Handles the main minutes record plus child tables:
 * attendance, business_items, action_items, financial_items, minutes_upcoming_events
 */
export function useMinutes() {
  const [minutesList, setMinutesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMinutesList = useCallback(async () => {
    const { data, error } = await supabase
      .from('minutes')
      .select(`
        id, meeting_type, subcommittee_id, meeting_date, status,
        facilitator_id, recorder_id, quorum, created_at,
        subcommittee:subcommittees(name)
      `)
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('Error fetching minutes:', error);
    } else {
      setMinutesList(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMinutesList(); }, [fetchMinutesList]);

  // Fetch a single minutes record with ALL related data
  const fetchFullMinutes = useCallback(async (id) => {
    const [
      { data: mins, error: mErr },
      { data: att, error: aErr },
      { data: biz, error: bErr },
      { data: actions, error: acErr },
      { data: finance, error: fErr },
      { data: upcoming, error: uErr },
    ] = await Promise.all([
      supabase.from('minutes').select('*').eq('id', id).maybeSingle(),
      supabase.from('attendance').select('*').eq('minutes_id', id),
      supabase.from('business_items').select('*').eq('minutes_id', id).order('sort_order'),
      supabase.from('action_items').select('*').eq('minutes_id', id),
      supabase.from('financial_items').select('*').eq('minutes_id', id),
      supabase.from('minutes_upcoming_events').select('*').eq('minutes_id', id),
    ]);

    // BUG-028: Check all errors, not just the main query
    const errors = [mErr, aErr, bErr, acErr, fErr, uErr].filter(Boolean);
    if (errors.length > 0) {
      console.error('Error fetching minutes data:', errors);
    }
    if (mErr) { console.error('Error fetching minutes:', mErr); return null; }
    if (!mins) return null;

    return {
      ...mins,
      _loaded_at: new Date().toISOString(),
      attendance: att || [],
      businessItems: biz || [],
      actionItems: actions || [],
      financialItems: finance || [],
      upcomingEvents: upcoming || [],
    };
  }, []);

  // Save minutes (create or update) + all child tables
  const saveMinutes = useCallback(async (minutesData) => {
    const {
      attendance = [],
      businessItems = [],
      actionItems = [],
      financialItems = [],
      upcomingEvents = [],
      ...mainData
    } = minutesData;

    // Get org id
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    const orgId = profile?.organization_id;
    if (!orgId) throw new Error('No organization found');

    let minutesId = mainData.id;
    const isNew = !minutesId || !(await supabase.from('minutes').select('id').eq('id', minutesId).maybeSingle()).data;

    // Clean the main record
    // BUG-017/027: Parse money fields to proper numbers for DECIMAL columns
    const parseMoney = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const cleaned = String(val).replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    const record = {
      organization_id: orgId,
      meeting_type: mainData.meeting_type || 'BOARD',
      subcommittee_id: mainData.subcommittee_id || null,
      agenda_id: mainData.agenda_id || null,
      status: mainData.status || 'draft',
      meeting_date: mainData.meeting_date || new Date().toISOString().split('T')[0],
      meeting_time: mainData.meeting_time || null,
      location: mainData.location || null,
      facilitator_id: mainData.facilitator_id || null,
      recorder_id: mainData.recorder_id || null,
      time_called_to_order: mainData.time_called_to_order || null,
      time_adjourned: mainData.time_adjourned || null,
      invocation: mainData.invocation || null,
      pledge_recited: mainData.pledge_recited ?? true,
      quorum: mainData.quorum || 'present',
      guests: mainData.guests || null,
      agenda_changes: mainData.agenda_changes || null,
      agenda_approval_motion: mainData.agenda_approval_motion || null,
      agenda_no_motion: mainData.agenda_no_motion ?? false,
      previous_meeting_dates: mainData.previous_meeting_dates || null,
      minutes_approval_motion: mainData.minutes_approval_motion || null,
      minutes_no_motion: mainData.minutes_no_motion ?? false,
      total_donations_ytd: parseMoney(mainData.total_donations_ytd),
      donations_since_last_meeting: parseMoney(mainData.donations_since_last_meeting),
      current_account_balance: parseMoney(mainData.current_account_balance),
      accounts: mainData.accounts || [],
      financial_report_motion: mainData.financial_report_motion || null,
      financial_no_motion: mainData.financial_no_motion ?? false,
      correspondence: mainData.correspondence || null,
      presidents_report: mainData.presidents_report || null,
      presidents_report_motion: mainData.presidents_report_motion || null,
      presidents_report_no_motion: mainData.presidents_report_no_motion ?? true,
      member_services_report: mainData.member_services_report || null,
      member_services_motion: mainData.member_services_motion || null,
      member_services_no_motion: mainData.member_services_no_motion ?? true,
      state_board_report: mainData.state_board_report || null,
      state_board_motion: mainData.state_board_motion || null,
      state_board_no_motion: mainData.state_board_no_motion ?? true,
      membership_committee: mainData.membership_committee || null,
      new_members: mainData.new_members || null,
      membership_motion: mainData.membership_motion || null,
      membership_no_motion: mainData.membership_no_motion ?? true,
      pac_committee: mainData.pac_committee || null,
      pac_motion: mainData.pac_motion || null,
      pac_no_motion: mainData.pac_no_motion ?? true,
      nomination_committee: mainData.nomination_committee || null,
      nomination_motion: mainData.nomination_motion || null,
      nomination_no_motion: mainData.nomination_no_motion ?? true,
      policy_committee: mainData.policy_committee || null,
      policy_motion: mainData.policy_motion || null,
      policy_no_motion: mainData.policy_no_motion ?? true,
      good_of_the_order: mainData.good_of_the_order || null,
      adjournment_motion: mainData.adjournment_motion || null,
      adjournment_no_motion: mainData.adjournment_no_motion ?? true,
    };

    if (isNew) {
      record.created_by = (await supabase.auth.getUser()).data.user.id;
      const { data, error } = await supabase.from('minutes').insert(record).select().single();
      if (error) throw error;
      minutesId = data.id;
    } else {
      // Optimistic locking: if caller passed _loaded_at, verify no one else saved since
      if (minutesData._loaded_at) {
        const { data: current } = await supabase.from('minutes').select('updated_at').eq('id', minutesId).maybeSingle();
        if (current?.updated_at && new Date(current.updated_at) > new Date(minutesData._loaded_at)) {
          throw new Error('This record was modified by another user. Please refresh and try again.');
        }
      }
      const { error } = await supabase.from('minutes').update(record).eq('id', minutesId);
      if (error) throw error;
    }

    // Sync attendance (delete all, re-insert)
    // BUG-033: Check errors on all child table operations
    const { error: attDelErr } = await supabase.from('attendance').delete().eq('minutes_id', minutesId);
    if (attDelErr) throw new Error(`Attendance sync failed: ${attDelErr.message}`);
    if (attendance.length > 0) {
      const attRows = attendance.map(a => ({
        minutes_id: minutesId,
        member_id: a.member_id,
        status: a.status,
      }));
      const { error: attInsErr } = await supabase.from('attendance').insert(attRows);
      if (attInsErr) throw new Error(`Attendance save failed: ${attInsErr.message}`);
    }

    // Sync business items
    const { error: bizDelErr } = await supabase.from('business_items').delete().eq('minutes_id', minutesId);
    if (bizDelErr) throw new Error(`Business items sync failed: ${bizDelErr.message}`);
    if (businessItems.length > 0) {
      const bizRows = businessItems.map((b, i) => ({
        minutes_id: minutesId,
        item_type: b.item_type,
        title: b.title,
        discussion: b.discussion || null,
        motion: b.motion || null,
        no_motion: b.no_motion ?? true,
        sort_order: i + 1,
      }));
      const { error: bizInsErr } = await supabase.from('business_items').insert(bizRows);
      if (bizInsErr) throw new Error(`Business items save failed: ${bizInsErr.message}`);
    }

    // Sync action items
    const { error: actDelErr } = await supabase.from('action_items').delete().eq('minutes_id', minutesId);
    if (actDelErr) throw new Error(`Action items sync failed: ${actDelErr.message}`);
    if (actionItems.length > 0) {
      const actRows = actionItems.map(a => ({
        minutes_id: minutesId,
        task: a.task,
        assignee_name: a.assignee_name || null,
        assignee_id: a.assignee_id || null,
        due_date: a.due_date || null,
        status: a.status || 'pending',
      }));
      const { error: actInsErr } = await supabase.from('action_items').insert(actRows);
      if (actInsErr) throw new Error(`Action items save failed: ${actInsErr.message}`);
    }

    // Sync financial items
    const { error: finDelErr } = await supabase.from('financial_items').delete().eq('minutes_id', minutesId);
    if (finDelErr) throw new Error(`Financial items sync failed: ${finDelErr.message}`);
    if (financialItems.length > 0) {
      const finRows = financialItems.map(f => ({
        minutes_id: minutesId,
        item_type: f.item_type,
        description: f.description,
        amount: parseFloat(String(f.amount).replace(/[$,\s]/g, '')) || 0,
      }));
      const { error: finInsErr } = await supabase.from('financial_items').insert(finRows);
      if (finInsErr) throw new Error(`Financial items save failed: ${finInsErr.message}`);
    }

    // Sync upcoming events
    const { error: evtDelErr } = await supabase.from('minutes_upcoming_events').delete().eq('minutes_id', minutesId);
    if (evtDelErr) throw new Error(`Upcoming events sync failed: ${evtDelErr.message}`);
    if (upcomingEvents.length > 0) {
      const evtRows = upcomingEvents.map(e => ({
        minutes_id: minutesId,
        name: e.name,
        date: e.date || null,
        location: e.location || null,
      }));
      const { error: evtInsErr } = await supabase.from('minutes_upcoming_events').insert(evtRows);
      if (evtInsErr) throw new Error(`Upcoming events save failed: ${evtInsErr.message}`);
    }

    await fetchMinutesList();
    return minutesId;
  }, [fetchMinutesList]);

  const deleteMinutes = useCallback(async (id) => {
    const { error } = await supabase.from('minutes').delete().eq('id', id);
    if (error) throw error;
    await fetchMinutesList();
  }, [fetchMinutesList]);

  return {
    minutesList,
    loading,
    fetchFullMinutes,
    saveMinutes,
    deleteMinutes,
    refresh: fetchMinutesList,
  };
}
