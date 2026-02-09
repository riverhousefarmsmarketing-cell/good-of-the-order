import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { clearRoleCache } from './useMinutes.jsx';

// ═══════════════════════════════════════════════════════════════════════
// AuthProvider — single source of truth for auth state.
//
// Replaces the old useAuth() hook which created independent subscriptions
// in every consumer (BUG-004). Now there is exactly ONE onAuthStateChange
// listener and ONE profile fetch, shared via React Context.
// ═══════════════════════════════════════════════════════════════════════

const AuthContext = createContext(null);

/**
 * useAuth — read auth state from the nearest AuthProvider.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>');
  return ctx;
}

/**
 * AuthProvider — mount once at the app root.
 * Manages session, profile, and auth actions (signIn, signUp, signOut).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // ── Profile fetch ─────────────────────────────────────────────────
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
      if (mountedRef.current) {
        setProfile(data || null);
      }
    } catch (err) {
      console.error('Profile exception:', err);
      if (mountedRef.current) setProfile(null);
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setLoadingSlow(false);
      }
    }
  }, []);

  // ── Session bootstrap + auth listener (runs once) ─────────────────
  useEffect(() => {
    mountedRef.current = true;

    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        setLoadingSlow(false);
      }
    });

    // 2. Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;
        if (event === 'INITIAL_SESSION') return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchingRef.current = false; // allow re-fetch on login
          fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setLoading(false);
          setLoadingSlow(false);
        }
      }
    );

    // 3. Safety timeout for slow connections
    const timeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('Auth timeout — showing retry UI');
        setLoadingSlow(true);
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth actions ──────────────────────────────────────────────────
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

  // ── Stable context value (only recomputes when dependencies change) ──
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    loadingSlow,
    organization: profile?.organization ?? null,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'admin' || profile?.role === 'editor',
    signUp,
    signUpWithInvite,
    signIn,
    signOut,
  }), [user, profile, loading, loadingSlow, signUp, signUpWithInvite, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
