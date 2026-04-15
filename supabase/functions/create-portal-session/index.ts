// supabase/functions/create-portal-session/index.ts
// Deploy: supabase functions deploy create-portal-session
// (Standard JWT verification — no --no-verify-jwt flag needed)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = 'https://goodoftheorder.app'

const ALLOWED_ORIGINS = [
  'https://goodoftheorder.app',
  'https://www.goodoftheorder.app',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const matched = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': matched,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function errorResponse(corsHeaders: Record<string, string>, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  )
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Step 1: Verify JWT ─────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse(corsHeaders, 'Missing authorization header', 401)

    const supabaseAuth = createClient(SUPABASE_URL!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) return errorResponse(corsHeaders, 'Unauthorized', 401)

    // ── Step 2: Load profile + verify admin role (server-side) ─────────
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError)
      return errorResponse(corsHeaders, 'User profile not found', 403)
    }

    if (profile.role !== 'admin') {
      return errorResponse(corsHeaders, 'Admin role required to manage billing', 403)
    }

    // ── Step 3: Load org ───────────────────────────────────────────────
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('stripe_customer_id, is_permanently_comped')
      .eq('id', profile.organization_id)
      .single()

    if (orgError || !org) {
      console.error('Org lookup failed:', orgError)
      return errorResponse(corsHeaders, 'Organization not found', 404)
    }

    if (org.is_permanently_comped) {
      return errorResponse(corsHeaders, 'This organization does not have a billing account', 400)
    }

    if (!org.stripe_customer_id) {
      return errorResponse(corsHeaders, 'No billing account found. Please subscribe first.', 400)
    }

    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')

    // ── Step 4: Create Stripe Billing Portal session ───────────────────
    const sessionRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: org.stripe_customer_id,
        return_url: `${APP_URL}/settings`,
      }),
    })
    const session = await sessionRes.json()

    if (!sessionRes.ok) {
      console.error('Stripe portal session failed:', session.error)
      throw new Error('Failed to create billing portal session')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('create-portal-session error:', err)
    return errorResponse(corsHeaders, 'Failed to open billing portal. Please try again.', 500)
  }
})
