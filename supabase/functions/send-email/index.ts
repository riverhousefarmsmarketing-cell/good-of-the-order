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

// CR-009 FIX: Helper to return safe error responses (no internal details leaked)
function errorResponse(corsHeaders: Record<string, string>, message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  )
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Step 1: Verify JWT / authenticate the caller ───────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse(corsHeaders, 'Missing authorization header', 401)
    }

    const supabaseAuth = createClient(SUPABASE_URL!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return errorResponse(corsHeaders, 'Unauthorized', 401)
    }

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    // ── Step 2: CR-007 FIX — Derive org_id and role from server ────────
    // NEVER trust client-supplied organization_id, sent_by, or role
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

    // ── Step 3: CR-007 FIX — Role gate: only editors and admins ────────
    if (!['admin', 'editor'].includes(profile.role)) {
      return errorResponse(corsHeaders, 'Insufficient permissions. Editor or admin role required.', 403)
    }

    const org_id = profile.organization_id  // Server-derived, never from client

    // ── Step 4: Parse request body ─────────────────────────────────────
    const {
      to,              // string[] - recipient emails
      subject,         // string
      html,            // string - HTML body
      from_name,       // string - e.g., "Lewis County Farm Bureau"
      document_type,   // 'minutes' | 'agenda'
      document_id,     // UUID
    } = await req.json()

    if (!to || to.length === 0) {
      return errorResponse(corsHeaders, 'No recipients provided', 400)
    }
    if (!subject) {
      return errorResponse(corsHeaders, 'No subject provided', 400)
    }
    if (!html) {
      return errorResponse(corsHeaders, 'No email body provided', 400)
    }

    // ── Step 4b: Validate recipients belong to this org ────────────────
    // Recipients must be org members or distribution contacts of the caller's
    // org. Without this, an authenticated editor could send arbitrary HTML to
    // any external address from the org's verified sending domain (the UI only
    // ever offers org-scoped addresses, so this rejects nothing legitimate).
    const [{ data: orgContacts }, { data: orgMembers }] = await Promise.all([
      supabaseAdmin.from('distribution_contacts').select('email').eq('organization_id', org_id),
      supabaseAdmin.from('members').select('email').eq('organization_id', org_id),
    ])
    const allowedEmails = new Set(
      [...(orgContacts || []), ...(orgMembers || [])]
        .map((r: { email: string | null }) => (r.email || '').toLowerCase().trim())
        .filter(Boolean)
    )
    const invalidRecipients = (to as string[])
      .map((e) => String(e || '').toLowerCase().trim())
      .filter((e) => !allowedEmails.has(e))
    if (invalidRecipients.length > 0) {
      return errorResponse(
        corsHeaders,
        `Recipient(s) not in your organization's members or distribution list: ${invalidRecipients.join(', ')}`,
        400
      )
    }

    // ── Step 5: CR-007 FIX — Validate document ownership ──────────────
    if (document_id && document_type) {
      const tableName = document_type === 'minutes' ? 'minutes' : 'agendas'
      const { data: doc, error: docError } = await supabaseAdmin
        .from(tableName)
        .select('organization_id')
        .eq('id', document_id)
        .single()

      if (docError || !doc) {
        console.error('Document lookup failed:', docError)
        return errorResponse(corsHeaders, 'Document not found', 404)
      }

      if (doc.organization_id !== org_id) {
        console.error(`Org mismatch: user org ${org_id}, doc org ${doc.organization_id}`)
        return errorResponse(corsHeaders, 'Document does not belong to your organization', 403)
      }
    }

    // ── Step 6: CR-007 FIX — Always rate-limit using server-derived org ─
    const { data: allowed, error: rlErr } = await supabaseAdmin.rpc('check_email_rate_limit', {
      p_org_id: org_id,
    })
    if (rlErr) console.error('Rate limit check error:', rlErr)
    if (allowed === false) {
      return errorResponse(corsHeaders, 'Rate limit exceeded. Maximum 20 emails per hour per organization.', 429)
    }

    // ── Step 7: Sanitize HTML — strip script tags and event handlers ───
    // NOTE: CR-008 recommends replacing regex with a proper sanitization
    // library (e.g., DOMPurify). This is a medium-priority improvement.
    const sanitizedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\son\w+\s*=\s*\S+/gi, '')

    // ── Step 8: Send via Resend ────────────────────────────────────────
    const fromEmail = `${from_name || 'GoodOfTheOrder'} <notifications@goodoftheorder.app>`

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
        html: sanitizedHtml,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      // CR-009 FIX: Don't leak Resend API error details to client
      throw new Error('Email delivery failed')
    }

    // ── Step 9: CR-007 FIX — Always log (using server-derived values) ──
    const logResult = await supabaseAdmin.from('distribution_logs').insert({
      organization_id: org_id,          // Server-derived
      document_type: document_type || null,
      document_id: document_id || null,
      sent_by: user.id,                 // From JWT, not client input
      recipient_emails: to,
      email_subject: subject,
      delivery_status: 'sent',
    })
    if (logResult.error) {
      // Log failure shouldn't block the response — email was already sent
      console.error('Distribution log insert failed:', logResult.error)
    }

    return new Response(
      JSON.stringify({ success: true, resend_id: resendData.id, recipients: to.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error('send-email error:', err)
    // CR-009 FIX: Return generic error message, never leak internal details
    return errorResponse(corsHeaders, 'Email send failed. Please try again.', 400)
  }
})
