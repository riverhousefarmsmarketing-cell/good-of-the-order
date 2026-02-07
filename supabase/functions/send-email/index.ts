// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxxxxx

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Send via Resend
    // Resend free tier: 100 emails/day, onboarding domain
const fromEmail = `${from_name || 'GoodOfTheOrder'} <notifications@goodoftheorder.app>`

    // Resend supports batch sending up to 100 recipients
    // For distribution lists, send as BCC for privacy
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to[0]],           // First recipient in TO
        bcc: to.slice(1),      // Rest as BCC for privacy
        subject,
        html,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      throw new Error(resendData.message || 'Resend API error')
    }

    // Log to distribution_logs
    if (organization_id && document_type && document_id) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
      await supabase.from('distribution_logs').insert({
        organization_id,
        document_type,
        document_id,
        sent_by,
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
