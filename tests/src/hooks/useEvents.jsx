import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useEvents() {
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEventsList = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, subcommittees(name), event_vendors(*)')
      .order('date', { ascending: true });

    if (error) console.error('Error fetching events:', error);
    setEventsList(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEventsList(); }, [fetchEventsList]);

  const fetchFullEvent = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, subcommittees(name), event_vendors(*)')
      .eq('id', id)
      .single();

    if (error) { console.error('Error fetching event:', error); return null; }
    return data;
  }, []);

  const saveEvent = useCallback(async (eventData) => {
    const { event_vendors: vendors, subcommittees: _sc, _isNew: _flag, ...eventFields } = eventData;

    // Get org id (BUG-805 FIX: use getUser() for server-verified JWT, not getSession())
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const orgId = profile.organization_id;
    const isNew = !eventFields.id || eventFields.id.startsWith('_tmp_');

    // Clean numeric fields - empty strings to null
    if (eventFields.budget_total === '' || eventFields.budget_total === undefined) eventFields.budget_total = null;

    let eventId;
    if (isNew) {
      const { id: _id, ...rest } = eventFields;
      const { data, error } = await supabase
        .from('events')
        .insert({ ...rest, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      eventId = data.id;
    } else {
      const { id, organization_id, created_at, updated_at, ...rest } = eventFields;
      const { error } = await supabase
        .from('events')
        .update(rest)
        .eq('id', id);
      if (error) throw error;
      eventId = id;
    }

    // Sync vendors
    if (vendors) {
      await supabase.from('event_vendors').delete().eq('event_id', eventId);
      if (vendors.length > 0) {
        const vendorRows = vendors.map(v => ({
          event_id: eventId,
          name: v.name,
          vendor_type: v.vendor_type || 'vendor',
          contact_name: v.contact_name || null,
          contact_phone: v.contact_phone || null,
          contact_email: v.contact_email || null,
          notes: v.notes || null,
          budget: v.budget || null,
        }));
        const { error } = await supabase.from('event_vendors').insert(vendorRows);
        if (error) throw error;
      }
    }

    await fetchEventsList();
    return eventId;
  }, [fetchEventsList]);

  const deleteEvent = useCallback(async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    await fetchEventsList();
  }, [fetchEventsList]);

  // Fetch next N upcoming events (for board minutes display)
  const fetchUpcomingEvents = useCallback(async (limit = 6) => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('events')
      .select('id, name, date, time, location, purpose, subcommittee_id, subcommittees(name)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) { console.error('Error fetching upcoming events:', error); return []; }
    return data || [];
  }, []);

  return { eventsList, loading, fetchFullEvent, saveEvent, deleteEvent, fetchUpcomingEvents };
}
