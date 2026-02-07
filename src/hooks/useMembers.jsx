import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMembers() {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('board_position_order', { ascending: true, nullsFirst: false })
        .order('full_name');

      if (fetchError) throw fetchError;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.message);
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvitations(data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchMembers(), fetchInvitations()]).finally(() => setLoading(false));
  }, [fetchMembers, fetchInvitations]);

  const updateMember = useCallback(async (id, updates) => {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;
    await fetchMembers();
  }, [fetchMembers]);

  const deactivateMember = useCallback(async (id) => {
    await updateMember(id, { is_active: false });
  }, [updateMember]);

  const reactivateMember = useCallback(async (id) => {
    await updateMember(id, { is_active: true });
  }, [updateMember]);

  const sendInvitation = useCallback(async ({ email, role, boardPosition }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        organization_id: profile.organization_id,
        email,
        role: role || 'viewer',
        board_position: boardPosition || null,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) throw inviteError;
    
    // BUG-018: Return data with invite link for manual sharing
    // TODO: Add edge function to send invitation emails via Resend
    await fetchInvitations();
    return { ...data, inviteUrl: `${window.location.origin}/signup?invite=${data.id}` };
  }, [fetchInvitations]);

  const cancelInvitation = useCallback(async (id) => {
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    await fetchInvitations();
  }, [fetchInvitations]);

  return {
    members,
    invitations,
    loading,
    error,
    updateMember,
    deactivateMember,
    reactivateMember,
    sendInvitation,
    cancelInvitation,
    refresh: () => Promise.all([fetchMembers(), fetchInvitations()]),
  };
}
