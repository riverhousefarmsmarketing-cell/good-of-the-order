// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
// (NO --no-verify-jwt flag — JWT verification is now required)
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')
if (!ALLOWED_ORIGIN) {
  console.warn('ALLOWED_ORIGIN not set — defaulting to restrictive same-origin. Set this env var for production.')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN || 'https://goodoftheorder.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
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
      organization_id: _clientOrgId, // UUID (ignored — derived server-side)
      document_type,   // 'minutes' | 'agenda'
      document_id,     // UUID
      sent_by,         // UUID - profile id of sender
    } = await req.json()

    if (!to || to.length === 0) throw new Error('No recipients')
    if (!subject) throw new Error('No subject')
    if (!html) throw new Error('No email body')

    // ── BUG-3005 FIX: Derive organization_id server-side from authenticated user ──
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
    const { data: senderProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (profileErr || !senderProfile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User has no organization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
    const organization_id = senderProfile.organization_id

    // ── BUG-812 FIX: Server-side rate limiting ──────────────────────────
    if (organization_id) {
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

    // ── BUG-702 FIX: Robust server-side HTML sanitization ──────────────
    // Allowlist approach: only permit known-safe tags and style attribute
    // This prevents nested tag bypass (e.g. <scr<script>ipt>) and case tricks
    const ALLOWED_TAGS = new Set([
      'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'b', 'em', 'i', 'u', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'ul', 'ol', 'li', 'a', 'img',
    ])
    const ALLOWED_ATTRS = new Set(['style', 'href', 'src', 'alt', 'colspan', 'rowspan'])
    
    function sanitizeHtml(input: string): string {
      // Remove all script/style blocks first (handles nesting)
      let s = input
      let prev = ''
      while (s !== prev) {
        prev = s
        s = s.replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
        s = s.replace(/<style[\s>][\s\S]*?<\/style>/gi, '')
      }
      // Process tags: keep allowed, strip others
      s = s.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
        const lowerTag = tag.toLowerCase()
        if (!ALLOWED_TAGS.has(lowerTag)) return '' // strip unknown tags entirely
        // Filter attributes to allowlist
        const cleanAttrs = (attrs || '').replace(/([a-z\-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/gi, 
          (attrMatch: string, name: string, dq: string, sq: string, uq: string) => {
            const lowerName = name.toLowerCase()
            if (!ALLOWED_ATTRS.has(lowerName)) return '' // strip disallowed attrs (incl. on*)
            const val = dq ?? sq ?? uq ?? ''
            // Block javascript: and data: URIs in href/src (including entity-encoded variants)
            if ((lowerName === 'href' || lowerName === 'src')) {
              const decodedVal = val.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                                    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
              if (/^\s*(javascript|data|vbscript)\s*:/i.test(decodedVal)) return ''
            }
            // Block dangerous CSS in style attribute
            if (lowerName === 'style') {
              const decodedStyle = val.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                                      .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
              if (/url\s*\(|expression\s*\(|@import|behavior\s*:/i.test(decodedStyle)) return ''
            }
            return `${lowerName}="${val.replace(/"/g, '&quot;')}"`
          }
        ).trim()
        const isClosing = match.startsWith('</')
        return isClosing ? `</${lowerTag}>` : `<${lowerTag}${cleanAttrs ? ' ' + cleanAttrs : ''}>`
      })
      return s
    }
    
    const sanitizedHtml = sanitizeHtml(html)

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
      await supabaseAdmin.from('distribution_logs').insert({
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
