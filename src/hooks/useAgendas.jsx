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
    return { ...agenda, _loaded_at: new Date().toISOString(), items: items || [] };
  }, []);

  const saveAgenda = useCallback(async (agendaData) => {
    const { items = [], ...mainData } = agendaData;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .maybeSingle();

    const orgId = profile?.organization_id;
    if (!orgId) throw new Error('No organization found');

    let agendaId = mainData.id;
    const isNew = !agendaId || !(await supabase.from('agendas').select('id').eq('id', agendaId).maybeSingle()).data;

    const record = {
      organization_id: orgId,
      meeting_type: mainData.meeting_type || 'BOARD',
      subcommittee_id: mainData.subcommittee_id || null,
      meeting_date: mainData.meeting_date || null,
      meeting_time: mainData.meeting_time || null,
      location: mainData.location || null,
      status: mainData.status || 'draft',
      source_minutes_id: mainData.source_minutes_id || null,
    };

    if (isNew) {
      record.created_by = (await supabase.auth.getUser()).data.user.id;
      const { data, error } = await supabase.from('agendas').insert(record).select().single();
      if (error) throw error;
      agendaId = data.id;
    } else {
      // Optimistic locking: check updated_at
      if (agendaData._loaded_at) {
        const { data: current } = await supabase.from('agendas').select('updated_at').eq('id', agendaId).maybeSingle();
        if (current?.updated_at && new Date(current.updated_at) > new Date(agendaData._loaded_at)) {
          throw new Error('This record was modified by another user. Please refresh and try again.');
        }
      }
      const { error } = await supabase.from('agendas').update(record).eq('id', agendaId);
      if (error) throw error;
    }

    // Sync items
    await supabase.from('agenda_items').delete().eq('agenda_id', agendaId);
    if (items.length > 0) {
      const itemRows = items.map((item, i) => ({
        agenda_id: agendaId,
        title: item.title,
        description: item.description || null,
        is_standard: item.is_standard ?? false,
        is_inherited: item.is_inherited ?? false,
        source_minutes_id: item.source_minutes_id || null,
        sort_order: i + 1,
      }));
      await supabase.from('agenda_items').insert(itemRows);
    }

    await fetchAgendasList();
    return agendaId;
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
