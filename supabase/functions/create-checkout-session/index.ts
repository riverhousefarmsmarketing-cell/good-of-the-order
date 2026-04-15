// supabase/functions/create-checkout-session/index.ts
// Deploy: supabase functions deploy create-checkout-session
// (Standard JWT verification — no --no-verify-jwt flag needed)
// Set secrets (if not already set):
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const APP_URL = 'https://goodoftheorder.app'

// Allowlist of valid live Price IDs — never trust a client-supplied price
const VALID_PRICE_IDS = new Set([
  'price_1TMXlG7rIwjFQ2JVISU3hcnN', // Monthly $39/mo
  'price_1TMXlq7rIwjFQ2JVwyZ47NkK', // Annual  $348/yr
])

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

    // Only admins can initiate checkout on behalf of their org
    if (profile.role !== 'admin') {
      return errorResponse(corsHeaders, 'Admin role required to manage billing', 403)
    }

    // ── Step 3: Load org ───────────────────────────────────────────────
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, stripe_customer_id, is_permanently_comped')
      .eq('id', profile.organization_id)
      .single()

    if (orgError || !org) {
      console.error('Org lookup failed:', orgError)
      return errorResponse(corsHeaders, 'Organization not found', 404)
    }

    if (org.is_permanently_comped) {
      return errorResponse(corsHeaders, 'This organization does not require a subscription', 400)
    }

    // ── Step 4: Validate price_id from client ──────────────────────────
    const body = await req.json()
    const { price_id } = body

    if (!price_id || !VALID_PRICE_IDS.has(price_id)) {
      return errorResponse(corsHeaders, 'Invalid price ID', 400)
    }

    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')

    // ── Step 5: Get or create Stripe customer ──────────────────────────
    let stripeCustomerId = org.stripe_customer_id

    if (!stripeCustomerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email!,
          name: org.name,
          'metadata[org_id]': org.id,
          'metadata[created_by]': user.id,
        }),
      })
      const customer = await customerRes.json()
      if (!customerRes.ok) {
        console.error('Stripe customer creation failed:', customer.error)
        throw new Error('Failed to create Stripe customer')
      }
      stripeCustomerId = customer.id

      // Persist the new customer ID immediately
      const { error: updateError } = await supabaseAdmin
        .from('organizations')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', org.id)

      if (updateError) {
        console.error('Failed to save stripe_customer_id:', updateError)
        // Non-fatal: Checkout will still work; we'll get it on the webhook
      }
    }

    // ── Step 6: Create Stripe Checkout session ─────────────────────────
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        mode: 'subscription',
        'line_items[0][price]': price_id,
        'line_items[0][quantity]': '1',
        success_url: `${APP_URL}/?checkout_success=true`,
        cancel_url: `${APP_URL}/billing`,
        'subscription_data[metadata][org_id]': org.id,
        allow_promotion_codes: 'true',
      }),
    })
    const session = await sessionRes.json()
    if (!sessionRes.ok) {
      console.error('Stripe session creation failed:', session.error)
      throw new Error('Failed to create Checkout session')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return errorResponse(corsHeaders, 'Failed to create checkout session. Please try again.', 500)
  }
})
