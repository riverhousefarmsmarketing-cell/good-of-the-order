import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { clearRoleCache } from './useMinutes.jsx';

/**
 * BUG-061 FIX: Auth is now a Context Provider.
 * Previously, every component calling useAuth() created independent state
 * and fired independent Supabase queries (getSession + fetchProfile).
 * Now auth state is fetched ONCE in AuthProvider and shared to all consumers.
 *
 * Migration: Wrap your app in <AuthProvider>, then use useAuth() as before.
 * The hook API is identical — no changes needed in consuming components.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const fetchingRef = useRef(false);
  const loadedRef = useRef(false);

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
      if (fetchingRef.current) {
        setProfile(data || null);
      }
    } catch (err) {
      console.error('Profile exception:', err);
      if (fetchingRef.current) setProfile(null);
    } finally {
      fetchingRef.current = false;
      loadedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        setAccessToken(session.access_token ?? null);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        loadedRef.current = true;
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setAccessToken(session?.access_token ?? null);
        if (currentUser) {
          fetchingRef.current = false;
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    const timeout = setTimeout(() => {
      if (mounted && !loadedRef.current) {
        console.warn('Auth loading slow — showing retry UI');
        setLoadingSlow(true);
      }
    }, 15000);

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
    clearRoleCache();
    const { error } = await supabase.auth.signOut();
    if (!error) { setUser(null); setProfile(null); }
    return { error };
  }, []);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  const value = {
    user, profile, loadingSlow, accessToken,
    organization: profile?.organization ?? null,
    loading,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'admin' || profile?.role === 'editor',
    signUp, signUpWithInvite, signIn, signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider. Wrap your app in <AuthProvider>.');
  }
  return ctx;
}
