import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * useMembers hook — fetches from the `members` table (board directory),
 * NOT from `profiles` (auth accounts). Members exist independently of
 * user accounts and can be added by name alone.
 *
 * BUG-061 FIX: Added autoFetch option + fetch guard.
 */
export function useMembers({ autoFetch = true } = {}) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);

  const fetchMembers = useCallback(async () => {
    try {
      // Fetch members, their linked profile role, and any pending invitation role
      const [membersResult, profilesResult, invitationsResult] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .order('board_position_order', { ascending: true, nullsFirst: false })
          .order('full_name'),
        supabase
          .from('profiles')
          .select('id, role'),
        supabase
          .from('invitations')
          .select('email, role')
          .is('accepted_at', null),
      ]);

      if (membersResult.error) throw membersResult.error;

      const profileRoleMap = Object.fromEntries(
        (profilesResult.data || []).map((p) => [p.id, p.role])
      );
      const inviteRoleMap = Object.fromEntries(
        (invitationsResult.data || []).map((inv) => [inv.email?.toLowerCase(), inv.role])
      );

      // Attach role: profile role takes precedence, then pending invite, then null
      const enriched = (membersResult.data || []).map((m) => ({
        ...m,
        role: m.linked_profile_id
          ? (profileRoleMap[m.linked_profile_id] || null)
          : (m.email ? (inviteRoleMap[m.email.toLowerCase()] || null) : null),
        has_account: !!m.linked_profile_id,
        invite_pending: !m.linked_profile_id && !!(m.email && inviteRoleMap[m.email?.toLowerCase()]),
      }));

      setMembers(enriched);
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

  // Create a new directory member (no auth account needed)
  const createMember = useCallback(async ({ fullName, email, phone, role, boardPosition }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const { data, error: insertError } = await supabase
      .from('members')
      .insert({
        organization_id: profile.organization_id,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        board_position: boardPosition || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    await fetchMembers();
    return data;
  }, [fetchMembers]);

  const updateMember = useCallback(async (id, updates) => {
    const { role, ...memberUpdates } = updates;

    // Update non-role fields on the members table
    if (Object.keys(memberUpdates).length > 0) {
      const { error: memberError } = await supabase
        .from('members')
        .update({ ...memberUpdates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (memberError) throw memberError;
    }

    // Role updates go to profiles — requires a linked account
    if (role !== undefined) {
      const member = members.find((m) => m.id === id);
      if (!member?.linked_profile_id) {
        throw new Error('This member does not have a login account yet. Send them an invitation first.');
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', member.linked_profile_id);
      if (profileError) throw profileError;
    }

    await fetchMembers();
  }, [fetchMembers, members]);

  const deactivateMember = useCallback(async (id) => {
    await updateMember(id, { is_active: false });
  }, [updateMember]);

  const reactivateMember = useCallback(async (id) => {
    await updateMember(id, { is_active: true });
  }, [updateMember]);

  const sendInvitation = useCallback(async ({ email, role, boardPosition, fullName }) => {
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
        full_name: fullName || null,
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
              <p style="margin:0;font-size:14px">GoodOfTheOrder helps your board manage meeting minutes, agendas, and records – all in one place.</p>
            </div>
            <div style="text-align:center;margin:0 0 32px">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;background:#1e293b;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Accept Invitation</a>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center">If the button doesn't work, copy this link: ${inviteUrl}</p>
          </div>`,
          from_name: orgName,
        },
      });
      if (fnError) console.error('Invite email error:', fnError);
    } catch (emailErr) {
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
    createMember,
    updateMember,
    deactivateMember,
    reactivateMember,
    sendInvitation,
    cancelInvitation,
    refresh: () => Promise.all([fetchMembers(), fetchInvitations()]),
  };
}
