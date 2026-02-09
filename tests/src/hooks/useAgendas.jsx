import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAgendas() {
  const [agendasList, setAgendasList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgendasList = useCallback(async () => {
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
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgendasList(); }, [fetchAgendasList]);

  const fetchFullAgenda = useCallback(async (id) => {
    const [
      { data: agenda, error: aErr },
      { data: items, error: iErr },
    ] = await Promise.all([
      supabase.from('agendas').select('*').eq('id', id).maybeSingle(),
      supabase.from('agenda_items').select('*').eq('agenda_id', id).order('sort_order'),
    ]);

    if (aErr || !agenda) return null;
    if (iErr) throw new Error('Failed to load agenda items: ' + iErr.message);
    // BUG-008 FIX: Use DB updated_at (not client clock) for optimistic locking
    return { ...agenda, _loaded_at: agenda.updated_at, items: items || [] };
  }, []);

  const saveAgenda = useCallback(async (agendaData) => {
    const { items = [], _loaded_at, ...mainData } = agendaData;

    // BUG-804 FIX: Use atomic server-side RPC instead of separate delete+insert
    const p_agenda = {
      id: mainData.id || null,
      _loaded_at: _loaded_at || null,
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

    const { data: result, error } = await supabase.rpc('save_agenda_atomic', {
      p_agenda,
      p_items,
    });

    if (error) throw error;

    await fetchAgendasList();
    return result; // {id, updated_at} — needed for optimistic locking
  }, [fetchAgendasList]);

  const deleteAgenda = useCallback(async (id) => {
    const { error } = await supabase.from('agendas').delete().eq('id', id);
    if (error) throw error;
    await fetchAgendasList();
  }, [fetchAgendasList]);

  // Generate standard agenda items for a meeting type
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

  return {
    agendasList,
    loading,
    fetchFullAgenda,
    saveAgenda,
    deleteAgenda,
    getStandardItems,
    refresh: fetchAgendasList,
  };
}
