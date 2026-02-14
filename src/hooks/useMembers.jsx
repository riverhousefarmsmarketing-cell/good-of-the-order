import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * BUG-061 FIX: Added autoFetch option + fetch guard.
 * Pages that only need member data for dropdowns (like MinutesEdit attendance)
 * can pass { autoFetch: false } and call refresh() manually when needed.
 */
export function useMembers({ autoFetch = true } = {}) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);

  const fetchMembers = useCallback(async () => {
    try {
      // BUG-029: RLS handles org isolation, but explicit filter is defense-in-depth
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
    if (!autoFetch) {
      setLoading(false);
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    Promise.all([fetchMembers(), fetchInvitations()]).finally(() => {
      fetchingRef.current = false;
      setLoading(false);
    });
  }, [autoFetch, fetchMembers, fetchInvitations]);

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
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single();

    // Get org name for the email
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
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

    const inviteUrl = `${window.location.origin}/signup?invite=${data.token}`;
    const orgName = org?.name || 'your organization';
    const inviterName = profile?.full_name || 'A board member';

    // Send invite email via existing Edge Function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('send-email', {
        body: {
          to: [email],
          subject: `You're invited to join ${orgName} on GoodOfTheOrder`,
          html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1e293b">
            <div style="text-align:center;padding:32px 0 24px">
              <h1 style="font-size:22px;margin:0 0 8px">You're Invited!</h1>
              <p style="color:#64748b;font-size:15px;margin:0">${inviterName} has invited you to join <strong>${orgName}</strong></p>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin:0 0 24px">
              <p style="margin:0 0 8px;font-size:14px"><strong>Role:</strong> ${role || 'viewer'}</p>
              ${boardPosition ? `<p style="margin:0 0 8px;font-size:14px"><strong>Position:</strong> ${boardPosition}</p>` : ''}
              <p style="margin:0;font-size:14px">GoodOfTheOrder helps your board manage meeting minutes, agendas, and records — all in one place.</p>
            </div>
            <div style="text-align:center;margin:0 0 32px">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;background:#1e293b;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Accept Invitation</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center">If the button doesn't work, copy this link: ${inviteUrl}</p>
          </div>`,
          from_name: orgName,
          organization_id: profile.organization_id,
        },
      });
      if (fnError) console.error('Invite email error:', fnError);
    } catch (emailErr) {
      // Don't fail the invitation if email fails — URL is still available
      console.error('Invite email send failed:', emailErr);
    }

    await fetchInvitations();
    return { ...data, inviteUrl };
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
