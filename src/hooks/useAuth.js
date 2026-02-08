import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { clearRoleCache } from './useMinutes.jsx';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organization:organizations(*)')
        .eq('id', userId)
        .maybeSingle();
      if (error) console.error('Profile fetch error:', error);
      // Only update state if still the current fetch (prevents race on rapid login/logout)
      if (fetchingRef.current) {
        setProfile(data || null);
      }
    } catch (err) {
      console.error('Profile exception:', err);
      if (fetchingRef.current) setProfile(null);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Check existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        // Skip INITIAL_SESSION since getSession handles it
        if (event === 'INITIAL_SESSION') return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchingRef.current = false; // allow re-fetch on login
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // 3. Safety timeout — show retry UI instead of forcing logged-out state
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - showing retry UI');
        setLoadingSlow(true);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async ({ email, password, fullName, organizationName, organizationSlug, organizationType }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, organization_name: organizationName, organization_slug: organizationSlug, organization_type: organizationType } },
    });
    return { data, error };
  }, []);

  const signUpWithInvite = useCallback(async ({ email, password, fullName, invitationToken }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, invitation_token: invitationToken } },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    fetchingRef.current = false;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    fetchingRef.current = false;
    clearRoleCache(); // BUG-803 FIX: Reset module-level role cache on logout
    const { error } = await supabase.auth.signOut();
    if (!error) { setUser(null); setProfile(null); }
    return { error };
  }, []);

  return {
    user, profile, loadingSlow,
    organization: profile?.organization ?? null,
    loading,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'admin' || profile?.role === 'editor',
    signUp, signUpWithInvite, signIn, signOut,
  };
}
