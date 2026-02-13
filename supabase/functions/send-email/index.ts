// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
// (NO --no-verify-jwt flag — JWT verification is now required)
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set ALLOWED_ORIGIN=https://goodoftheorder.app

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')

// BUG-091 FIX: Support multiple origins (www and non-www custom domain + Vercel)
const ALLOWED_ORIGINS = [
  ALLOWED_ORIGIN,
  'https://goodoftheorder.app',
  'https://www.goodoftheorder.app',
].filter(Boolean) as string[]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const matched = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || ''
  return {
    'Access-Control-Allow-Origin': matched,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── FIX BUG-012: Verify JWT / authenticate the caller ──────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create an authenticated client to verify the user
    const supabaseAuth = createClient(SUPABASE_URL!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }
    // ── End auth verification ──────────────────────────────────────────

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const {
      to,              // string[] - recipient emails
      subject,         // string
      html,            // string - HTML body
      from_name,       // string - e.g., "Lewis County Farm Bureau"
      organization_id, // UUID
      document_type,   // 'minutes' | 'agenda'
      document_id,     // UUID
      sent_by,         // UUID - profile id of sender
    } = await req.json()

    if (!to || to.length === 0) throw new Error('No recipients')
    if (!subject) throw new Error('No subject')
    if (!html) throw new Error('No email body')

    // ── BUG-812 FIX: Server-side rate limiting ──────────────────────────
    if (organization_id) {
      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      const { data: allowed, error: rlErr } = await supabaseAdmin.rpc('check_email_rate_limit', {
        p_org_id: organization_id,
      })
      if (rlErr) console.error('Rate limit check error:', rlErr)
      if (allowed === false) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 emails per hour per organization.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        )
      }
    }

    // ── BUG-822 FIX: Sanitize HTML — strip script tags and event handlers ──
    const sanitizedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son\w+\s*=\s*\S+/gi, '')

    // Send via Resend
    const fromEmail = `${from_name || 'GoodOfTheOrder'} <notifications@goodoftheorder.app>`

    // ── FIX BUG-010: All recipients in BCC for privacy ────────────────
    // Previously: to: [to[0]], bcc: to.slice(1) — exposed first recipient
    // Now: send TO the org's own from address, ALL recipients as BCC
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [fromEmail.match(/<(.+)>/)?.[1] || 'notifications@goodoftheorder.app'],
        bcc: to,              // ALL recipients as BCC
        subject,
        html: sanitizedHtml,  // BUG-822: Use sanitized HTML
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      throw new Error(resendData.message || 'Resend API error')
    }

    // Log to distribution_logs (using service role for reliable logging)
    if (organization_id && document_type && document_id) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      await supabase.from('distribution_logs').insert({
        organization_id,
        document_type,
        document_id,
        sent_by: sent_by || user.id,  // Fall back to authenticated user
        recipient_emails: to,
        email_subject: subject,
        delivery_status: 'sent',
      })
    }

    return new Response(
      JSON.stringify({ success: true, resend_id: resendData.id, recipients: to.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
