import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/dates';

/**
 * BUG-061 FIX: Added autoFetch option + fetch guard.
 * Also: saveEvent and deleteEvent now do optimistic list updates
 * instead of re-fetching the entire events list after each operation.
 */
export function useEvents({ autoFetch = true } = {}) {
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const fetchingRef = useRef(false);

  const fetchEventsList = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*, subcommittees(name), event_vendors(*)')
        .order('date', { ascending: true });

      if (error) console.error('Error fetching events:', error);
      setEventsList(data || []);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) fetchEventsList();
    else setLoading(false);
  }, [autoFetch, fetchEventsList]);

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
      // Surface sync failures instead of swallowing them: the event row is
      // already saved, so a silently-dropped vendor list looked like success
      // to the user while their vendor/speaker data was lost on reload.
      const { error: delErr } = await supabase.from('event_vendors').delete().eq('event_id', eventId);
      if (delErr) throw delErr;
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

    // BUG-061 FIX: Fetch only the saved record instead of re-fetching entire list
    const { data: updated } = await supabase
      .from('events')
      .select('*, subcommittees(name), event_vendors(*)')
      .eq('id', eventId)
      .single();

    if (updated) {
      setEventsList(prev => {
        const exists = prev.some(e => e.id === eventId);
        if (exists) return prev.map(e => e.id === eventId ? updated : e);
        return [...prev, updated].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      });
    }

    return eventId;
  }, []);

  const deleteEvent = useCallback(async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    // BUG-061 FIX: Optimistic remove instead of full re-fetch
    setEventsList(prev => prev.filter(e => e.id !== id));
  }, []);

  // Fetch next N upcoming events (for board minutes display)
  const fetchUpcomingEvents = useCallback(async (limit = 6) => {
    const today = todayISO();
    const { data, error } = await supabase
      .from('events')
      .select('id, name, date, time, location, purpose, subcommittee_id, subcommittees(name)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) { console.error('Error fetching upcoming events:', error); return []; }
    return data || [];
  }, []);

  return { eventsList, loading, fetchFullEvent, saveEvent, deleteEvent, fetchUpcomingEvents, refresh: fetchEventsList };
}
