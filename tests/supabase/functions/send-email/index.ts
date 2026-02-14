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
      document_type,   // 'minutes' | 'agenda'
      document_id,     // UUID
      // SECURITY: organization_id and sent_by are now derived server-side
    } = await req.json()

    if (!to || to.length === 0) throw new Error('No recipients')
    if (!subject) throw new Error('No subject')
    if (!html) throw new Error('No email body')

    // ── SECURITY: Derive org_id and role from the authenticated user ──
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

    const { data: senderProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileErr || !senderProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Only editors and admins can send emails
    if (!['admin', 'editor'].includes(senderProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions: editor or admin role required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const organization_id = senderProfile.organization_id

    // ── SECURITY: Validate document ownership ────────────────────────
    if (document_type && document_id) {
      const docTable = document_type === 'minutes' ? 'minutes'
        : document_type === 'agenda' ? 'agendas'
        : null

      if (docTable) {
        const { data: doc, error: docErr } = await supabaseAdmin
          .from(docTable)
          .select('organization_id')
          .eq('id', document_id)
          .maybeSingle()

        if (docErr || !doc) {
          return new Response(
            JSON.stringify({ error: 'Document not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          )
        }

        if (doc.organization_id !== organization_id) {
          console.error(`SECURITY: User ${user.id} (org ${organization_id}) tried to send document ${document_id} belonging to org ${doc.organization_id}`)
          return new Response(
            JSON.stringify({ error: 'Document does not belong to your organization' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          )
        }
      }
    }

    // ── Server-side rate limiting (using server-derived org) ─────────
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

    // ── BUG-822 FIX: Sanitize HTML — strip script tags and event handlers ──
    const sanitizedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son\w+\s*=\s*\S+/gi, '')

    // Send via Resend
    const fromEmail = `${from_name || 'GoodOfTheOrder'} <notifications@goodoftheorder.app>`

    // ── FIX BUG-010 + BUG-091b: Recipient handling ────────────────────
    // First recipient in TO, rest in BCC. This avoids using a @goodoftheorder.app
    // address as TO, which triggers domain-wide suppression in Resend and blocks
    // delivery to ALL recipients including BCC.
    // Trade-off: first recipient's address is visible in the To header.
    // Acceptable for org board distribution where all members know each other.
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to[0]],
        bcc: to.length > 1 ? to.slice(1) : undefined,
        subject,
        html: sanitizedHtml,  // BUG-822: Use sanitized HTML
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      throw new Error(resendData.message || 'Resend API error')
    }

    // Log to distribution_logs (using server-derived org and sender)
    if (document_type && document_id) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      await supabase.from('distribution_logs').insert({
        organization_id,
        document_type,
        document_id,
        sent_by: senderProfile.id,
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
