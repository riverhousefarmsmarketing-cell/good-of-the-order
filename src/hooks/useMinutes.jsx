import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for minutes CRUD operations.
 * Handles the main minutes record plus child tables:
 * attendance, business_items, action_items, financial_items, minutes_upcoming_events
 */

// BUG-702: Cache role check to avoid extra DB call on every save
// BUG-803 FIX: Export clearRoleCache so signOut can reset it
let _cachedRole = null;
let _cachedRoleUserId = null;

export function clearRoleCache() {
  _cachedRole = null;
  _cachedRoleUserId = null;
}

async function checkWritePermission() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // BUG-803 FIX: Always invalidate if user changed
  if (_cachedRoleUserId && _cachedRoleUserId !== user.id) {
    clearRoleCache();
  }

  // Return cached role if same user
  if (_cachedRoleUserId === user.id && _cachedRole) {
    if (!['admin', 'editor'].includes(_cachedRole)) {
      throw new Error('Insufficient permissions: editor or admin role required');
    }
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  _cachedRole = profile?.role;
  _cachedRoleUserId = user.id;

  if (!profile || !['admin', 'editor'].includes(profile.role)) {
    throw new Error('Insufficient permissions: editor or admin role required');
  }
}

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

  // Save minutes (create or update) via atomic server-side transaction (RPC)
  // BUG-401 FIX: All child table sync now happens inside a single DB transaction
  // BUG-301 FIX: Client-side role check before attempting write
  const saveMinutes = useCallback(async (minutesData) => {
    // Client-side permission guard (cached after first check)
    await checkWritePermission();

    const {
      attendance = [],
      businessItems = [],
      actionItems = [],
      financialItems = [],
      upcomingEvents = [],
      ...mainData
    } = minutesData;

    // BUG-813 FIX: Strip currency formatting before sending to DB
    const stripMoney = (v) => v == null ? null : String(v).replace(/[$,\s]/g, '') || null;

    // Build the payload for the atomic RPC
    const p_minutes = {
      id: mainData.id || null,
      _loaded_at: minutesData._loaded_at || null,
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
      total_donations_ytd: stripMoney(mainData.total_donations_ytd),
      donations_since_last_meeting: stripMoney(mainData.donations_since_last_meeting),
      current_account_balance: stripMoney(mainData.current_account_balance),
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

    const p_attendance = attendance.map(a => ({
      member_id: a.member_id,
      status: a.status,
    }));

    const p_business_items = businessItems.map(b => ({
      item_type: b.item_type,
      title: b.title,
      discussion: b.discussion || null,
      motion: b.motion || null,
      no_motion: b.no_motion ?? true,
    }));

    const p_action_items = actionItems.map(a => ({
      task: a.task,
      assignee_name: a.assignee_name || null,
      assignee_id: a.assignee_id || null,
      due_date: a.due_date || null,
      status: a.status || 'pending',
    }));

    const p_financial_items = financialItems.map(f => ({
      item_type: f.item_type,
      description: f.description,
      amount: String(f.amount || '0'),
    }));

    const p_upcoming_events = upcomingEvents.map(e => ({
      name: e.name,
      date: e.date || null,
      location: e.location || null,
    }));

    // BUG-819 FIX: RPC now returns jsonb {id, updated_at} instead of bare uuid
    const { data: rpcResult, error } = await supabase.rpc('save_minutes_atomic', {
      p_minutes,
      p_attendance,
      p_business_items,
      p_action_items,
      p_financial_items,
      p_upcoming_events,
    });

    if (error) throw error;
    const minutesId = rpcResult.id;
    const serverUpdatedAt = rpcResult.updated_at;

    // BUG-702 FIX: Fetch only the saved record and merge into list (not full re-fetch)
    const { data: updated } = await supabase
      .from('minutes')
      .select('id, meeting_type, subcommittee_id, meeting_date, status, facilitator_id, recorder_id, quorum, created_at, subcommittee:subcommittees(name)')
      .eq('id', minutesId)
      .single();

    if (updated) {
      setMinutesList(prev => {
        const exists = prev.some(m => m.id === minutesId);
        if (exists) return prev.map(m => m.id === minutesId ? updated : m);
        return [updated, ...prev];
      });
    }

    // BUG-819 FIX: Return updated_at so caller can set _loaded_at for optimistic locking
    return { id: minutesId, updated_at: serverUpdatedAt };
  }, []);

  const deleteMinutes = useCallback(async (id) => {
    const { error } = await supabase.from('minutes').delete().eq('id', id);
    if (error) throw error;
    // BUG-702: Optimistic remove from local list
    setMinutesList(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    minutesList,
    loading,
    fetchFullMinutes,
    saveMinutes,
    deleteMinutes,
    refresh: fetchMinutesList,
  };
}
