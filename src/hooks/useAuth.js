import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
      setProfile(data || null);
    } catch (err) {
      console.error('Profile exception:', err);
      setProfile(null);
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

    // 3. Safety timeout
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async ({ email, password, fullName, organizationName, organizationSlug }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, organization_name: organizationName, organization_slug: organizationSlug } },
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
    const { error } = await supabase.auth.signOut();
    if (!error) { setUser(null); setProfile(null); }
    return { error };
  }, []);

  return {
    user, profile,
    organization: profile?.organization ?? null,
    loading,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'admin' || profile?.role === 'editor',
    signUp, signUpWithInvite, signIn, signOut,
  };
}
