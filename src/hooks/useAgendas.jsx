import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { rpcFetch } from '../lib/rpcFetch';

export function useAgendas({ autoFetch = true } = {}) {
  const [agendasList, setAgendasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchAgendasList = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('agendas')
        .select(`
          id, meeting_type, subcommittee_id, meeting_date, meeting_time,
          location, status, created_at,
          subcommittee:subcommittees(name)
        `)
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching agendas:', error);
      else setAgendasList(data || []);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) fetchAgendasList();
    else setLoading(false);
  }, [autoFetch, fetchAgendasList]);

  const fetchFullAgenda = useCallback(async (id) => {
    const [
      { data: agenda, error: aErr },
      { data: items, error: iErr },
    ] = await Promise.all([
      supabase.from('agendas').select('*').eq('id', id).maybeSingle(),
      supabase.from('agenda_items').select('*').eq('agenda_id', id).order('sort_order'),
    ]);
    if (aErr || !agenda) return null;
    return { ...agenda, _loaded_at: agenda.updated_at, _lock_version: agenda.lock_version, items: items || [] };
  }, []);

  const saveAgenda = useCallback(async (agendaData) => {
    const { items = [], _loaded_at, _lock_version, ...mainData } = agendaData;

    const p_agenda = {
      id: mainData.id || null,
      // CR-011 FIX: Pass _loaded_at through for optimistic locking
      // Fixed: _loaded_at was destructured separately, so mainData._loaded_at was always undefined
      _loaded_at: _loaded_at || null,
      _lock_version: _lock_version ?? null, // 025: precision-safe optimistic lock
      meeting_type: mainData.meeting_type || 'BOARD',
      subcommittee_id: mainData.subcommittee_id || null,
      meeting_date: mainData.meeting_date || null,
      meeting_time: mainData.meeting_time || null,
      location: mainData.location || null,
      status: mainData.status || 'draft',
      source_minutes_id: mainData.source_minutes_id || null,
    };

    const p_items = items.map(item => ({
      title: item.title,
      description: item.description || null,
      is_standard: item.is_standard ?? false,
      is_inherited: item.is_inherited ?? false,
      source_minutes_id: item.source_minutes_id || null,
    }));

    // CR-021 FIX: Removed console.log statements (were leaking internal state in production)

    // Use raw fetch instead of supabase.rpc() to avoid client hanging bug
    const { data: result, error } = await rpcFetch('save_agenda_atomic', {
      p_agenda,
      p_items,
    });

    if (error) throw new Error(error.message || JSON.stringify(error));
    return { id: result.id, updated_at: result.updated_at, lock_version: result.lock_version };
  }, []);

  const deleteAgenda = useCallback(async (id) => {
    const { error } = await supabase.from('agendas').delete().eq('id', id);
    if (error) throw error;
    await fetchAgendasList();
  }, [fetchAgendasList]);

  const getStandardItems = useCallback(() => {
    return [
      { title: 'Call to Order', description: '', is_standard: true },
      { title: 'Invocation / Pledge of Allegiance', description: '', is_standard: true },
      { title: 'Roll Call / Introductions', description: '', is_standard: true },
      { title: 'Approval of Agenda', description: '', is_standard: true },
      { title: 'Approval of Previous Meeting Minutes', description: '', is_standard: true },
      { title: "Treasurer's / Financial Report", description: '', is_standard: true },
      { title: 'Correspondence', description: '', is_standard: true },
      { title: "President's Report", description: '', is_standard: true },
      { title: 'Committee Reports', description: '', is_standard: true },
      { title: 'Old Business', description: '', is_standard: true },
      { title: 'New Business', description: '', is_standard: true },
      { title: 'Upcoming Events', description: '', is_standard: true },
      { title: 'Good of the Order', description: '', is_standard: true },
      { title: 'Adjournment', description: '', is_standard: true },
    ];
  }, []);

  const getSubcommitteeItems = useCallback(() => {
    return [
      { title: 'Call to Order', description: '', is_standard: true },
      { title: 'Roll Call', description: '', is_standard: true },
      { title: 'Approval of Previous Meeting Minutes', description: '', is_standard: true },
      { title: 'Old Business', description: '', is_standard: true },
      { title: 'New Business', description: '', is_standard: true },
      { title: 'Action Items Review', description: '', is_standard: true },
      { title: 'Recommendations to Full Board', description: '', is_standard: true },
      { title: 'Next Meeting Date', description: '', is_standard: true },
      { title: 'Adjournment', description: '', is_standard: true },
    ];
  }, []);

  // Fetch suggested agenda items from the most recent finalized minutes of the same type
  const fetchSuggestedItems = useCallback(async (meetingType, subcommitteeId = null) => {
    // Find the most recent approved/revised minutes of this meeting type
    let query = supabase
      .from('minutes')
      .select('id, meeting_date, meeting_type')
      .in('status', ['approved', 'revised'])
      .eq('meeting_type', meetingType)
      .order('meeting_date', { ascending: false })
      .limit(1);

    if (meetingType === 'SUBCOMMITTEE' && subcommitteeId) {
      query = query.eq('subcommittee_id', subcommitteeId);
    }

    const { data: recentMinutes } = await query;
    if (!recentMinutes || recentMinutes.length === 0) return [];

    const minutesId = recentMinutes[0].id;
    const suggestions = [];

    // 1. Tabled motions from business items (decision contains "tabled")
    const { data: bizItems } = await supabase
      .from('business_items')
      .select('title, discussion, motion, item_type')
      .eq('minutes_id', minutesId);

    (bizItems || []).forEach(item => {
      const decision = item.motion?.decision?.toLowerCase() || '';
      if (decision.includes('tabled') || decision.includes('postponed') || decision.includes('deferred')) {
        suggestions.push({
          title: item.title,
          description: `Tabled from previous meeting: ${item.discussion || item.motion?.text || ''}`.slice(0, 200),
          is_inherited: true,
          source_minutes_id: minutesId,
          _reason: 'tabled',
        });
      }
    });

    // 2. Pending action items
    const { data: actionItems } = await supabase
      .from('action_items')
      .select('task, assignee_name, status')
      .eq('minutes_id', minutesId)
      .eq('status', 'pending');

    (actionItems || []).forEach(item => {
      suggestions.push({
        title: `Follow up: ${item.task}`,
        description: item.assignee_name ? `Assigned to: ${item.assignee_name}` : '',
        is_inherited: true,
        source_minutes_id: minutesId,
        _reason: 'pending_action',
      });
    });

    // 3. New business items with no clear resolution may need follow-up
    (bizItems || []).filter(b => b.item_type === 'new').forEach(item => {
      const decision = item.motion?.decision?.toLowerCase() || '';
      if (decision.includes('tabled') || decision.includes('postponed') || decision.includes('deferred')) return;
      if (decision.includes('passed') || decision.includes('approved') || decision.includes('failed') || decision.includes('denied')) return;
      if (!decision) {
        suggestions.push({
          title: item.title,
          description: `From previous meeting — may need follow-up`,
          is_inherited: true,
          source_minutes_id: minutesId,
          _reason: 'unresolved_new_business',
        });
      }
    });

    return suggestions;
  }, []);

  return {
    agendasList,
    loading,
    fetchFullAgenda,
    saveAgenda,
    deleteAgenda,
    getStandardItems,
    getSubcommitteeItems,
    fetchSuggestedItems,
    refresh: fetchAgendasList,
  };
}
