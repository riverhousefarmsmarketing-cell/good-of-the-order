import { supabase } from './supabase';

// CR-010 FIX: Use supabase.auth.getSession() instead of reading localStorage directly.
// This ensures token auto-refresh works and removes coupling to Supabase's internal key naming.
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function rpcFetch(fnName, params) {
  const token = await getAccessToken();
  if (!token) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const supabaseUrl = supabase.supabaseUrl;
  const anonKey = supabase.supabaseKey;

  try {
    const resp = await fetch(supabaseUrl + '/rest/v1/rpc/' + fnName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': 'Bearer ' + token,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(params),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({ message: resp.statusText }));
      return { data: null, error: errBody };
    }

    const data = await resp.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: { message: err.message } };
  }
}
