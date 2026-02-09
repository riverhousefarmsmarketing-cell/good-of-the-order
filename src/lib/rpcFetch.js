import { supabase } from './supabase';

function getAccessToken() {
  const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (storageKey) {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (stored?.access_token) return stored.access_token;
    } catch (e) { /* fall through */ }
  }
  return null;
}

export async function rpcFetch(fnName, params) {
  const token = getAccessToken();
  console.log('rpcFetch: token?', !!token, 'fn:', fnName);
  if (!token) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const supabaseUrl = supabase.supabaseUrl;
  const anonKey = supabase.supabaseKey;

  try {
    console.log('rpcFetch: calling fetch...');
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

    console.log('rpcFetch: fetch returned status', resp.status);

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({ message: resp.statusText }));
      return { data: null, error: errBody };
    }

    const data = await resp.json();
    return { data, error: null };
  } catch (err) {
    console.log('rpcFetch: fetch error', err.message);
    return { data: null, error: { message: err.message } };
  }
}
