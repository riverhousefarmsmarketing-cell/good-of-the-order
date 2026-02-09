// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email
// (NO --no-verify-jwt flag — JWT verification is now required)
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
//   supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts'

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

// ═══════════════════════════════════════════════════════════════════════
// DOM-PARSER-BASED HTML SANITIZER
// Replaces the previous regex-based approach (BUG-011 fix).
// Uses deno-dom to parse HTML into a real DOM tree, then walks it with
// a strict allowlist. This is immune to entity encoding bypasses,
// malformed tag tricks, and nested tag attacks.
// ═══════════════════════════════════════════════════════════════════════

const ALLOWED_TAGS = new Set([
  'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'ul', 'ol', 'li', 'a', 'img',
])
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['style']),
  'a': new Set(['href']),
  'img': new Set(['src', 'alt']),
  'td': new Set(['colspan', 'rowspan']),
  'th': new Set(['colspan', 'rowspan']),
}

/**
 * Decode HTML entities in a string for URI safety checks.
 * Prevents bypasses like &#x6A;avascript: or &#106;avascript:
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
}

function isUriSafe(val: string): boolean {
  const decoded = decodeEntities(val).replace(/\s+/g, '').toLowerCase()
  return !(/^(javascript|data|vbscript):/.test(decoded))
}

function isStyleSafe(val: string): boolean {
  const decoded = decodeEntities(val).toLowerCase()
  return !(/url\s*\(|expression\s*\(|@import|behavior\s*:|binding\s*:|-moz-binding/i.test(decoded))
}

function sanitizeHtml(input: string): string {
  // Parse the HTML into a DOM tree
  const doc = new DOMParser().parseFromString(
    `<body>${input}</body>`,
    'text/html'
  )
  if (!doc) return '' // parse failure → return empty

  function walkNode(node: any): string {
    // Text node → escape and return
    if (node.nodeType === 3 /* TEXT_NODE */) {
      return (node.textContent || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }

    // Not an element → recurse children
    if (node.nodeType !== 1 /* ELEMENT_NODE */) {
      let out = ''
      for (const child of node.childNodes) out += walkNode(child)
      return out
    }

    const tag = (node.tagName || '').toLowerCase()

    // Disallowed tag → strip the element entirely (including children)
    // This kills <script>, <style>, <iframe>, <object>, <embed>, etc.
    if (!ALLOWED_TAGS.has(tag)) {
      // But keep text content of inline formatting that might be unknown
      // For safety: only keep children of tags that look like formatting
      return ''
    }

    // Allowed tag → filter its attributes
    const allowedForTag = ALLOWED_ATTRS[tag] || new Set<string>()
    const globalAllowed = ALLOWED_ATTRS['*'] || new Set<string>()
    let attrStr = ''

    for (const attr of Array.from(node.attributes || [])) {
      const name = (attr as any).name?.toLowerCase()
      const val = (attr as any).value || ''

      // Must be in tag-specific or global allowlist
      if (!allowedForTag.has(name) && !globalAllowed.has(name)) continue

      // URI attributes: check for dangerous protocols
      if ((name === 'href' || name === 'src') && !isUriSafe(val)) continue

      // Style attribute: check for dangerous CSS
      if (name === 'style' && !isStyleSafe(val)) continue

      // Event handlers should never pass the allowlist, but defense-in-depth
      if (name.startsWith('on')) continue

      attrStr += ` ${name}="${val.replace(/"/g, '&quot;')}"`
    }

    // Self-closing tags
    if (tag === 'br' || tag === 'hr' || tag === 'img') {
      return `<${tag}${attrStr} />`
    }

    // Recurse children
    let inner = ''
    for (const child of node.childNodes) inner += walkNode(child)

    return `<${tag}${attrStr}>${inner}</${tag}>`
  }

  // Walk the <body> children (skip the synthetic body wrapper)
  const body = doc.querySelector('body')
  if (!body) return ''

  let result = ''
  for (const child of body.childNodes) result += walkNode(child)
  return result
}

// ═══════════════════════════════════════════════════════════════════════

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

    // ── Sanitize HTML using DOM parser (BUG-011 fix) ──────────────────
    const sanitizedHtml = sanitizeHtml(html)

    // Send via Resend
    const fromEmail = `${from_name || 'GoodOfTheOrder'} <notifications@goodoftheorder.app>`

    // ── FIX BUG-010: All recipients in BCC for privacy ────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [fromEmail.match(/<(.+)>/)?.[1] || 'notifications@goodoftheorder.app'],
        bcc: to,
        subject,
        html: sanitizedHtml,
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
        sent_by: sent_by || user.id,
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
