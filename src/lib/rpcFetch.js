import { supabase } from './supabase';

/**
 * Call a Supabase RPC function via raw fetch.
 * Bypasses supabase-js .rpc() which can hang in certain auth states.
 * 
 * @param {string} fnName - The RPC function name
 * @param {object} params - The parameters to pass to the function
 * @returns {Promise<{data: any, error: any}>}
 */
export async function rpcFetch(fnName, params) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  const supabaseUrl = supabase.supabaseUrl;
  const anonKey = supabase.supabaseKey;

  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': 'Bearer ' + session.access_token,
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
