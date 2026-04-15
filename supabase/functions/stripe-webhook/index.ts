// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// (--no-verify-jwt is required: Stripe sends no user JWT, only its own signature)
// Set secrets:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//
// After deploying, register the webhook in Stripe Dashboard:
//   Endpoint URL: https://[your-project-ref].supabase.co/functions/v1/stripe-webhook
//   Events to send:
//     invoice.paid
//     invoice.payment_failed
//     customer.subscription.updated
//     customer.subscription.deleted

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// ── Stripe signature verification (Web Crypto API — Deno-compatible) ────────
// Stripe signs every webhook with HMAC-SHA256. We verify before trusting any payload.
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=')
    if (key && val) acc[key] = val
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts['t']
  const signature = parts['v1']
  if (!timestamp || !signature) return false

  // Reject events older than 5 minutes (replay attack protection)
  const ts = parseInt(timestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === signature
}

// Map Stripe subscription statuses to our DB enum values
function mapStripeStatus(stripeStatus: string): string | null {
  switch (stripeStatus) {
    case 'active':   return 'active'
    case 'past_due': return 'past_due'
    case 'canceled':
    case 'cancelled': return 'canceled'
    default: return null // trialing, incomplete, etc. — don't overwrite
  }
}

serve(async (req) => {
  // Only POST accepted — Stripe always POSTs
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Read raw body before any parsing — signature verification requires raw bytes
  const payload = await req.text()
  const sigHeader = req.headers.get('Stripe-Signature') || ''

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET not configured')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // ── Signature verification ──────────────────────────────────────────────────
  const valid = await verifyStripeSignature(payload, sigHeader, STRIPE_WEBHOOK_SECRET)
  if (!valid) {
    console.error('Stripe signature verification failed — possible spoofed request')
    return new Response('Invalid signature', { status: 400 })
  }

  // ── Parse event ─────────────────────────────────────────────────────────────
  let event: Record<string, unknown>
  try {
    event = JSON.parse(payload)
  } catch {
    return new Response('Invalid JSON payload', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
  const eventType = event.type as string
  const eventData = (event.data as Record<string, unknown>)?.object as Record<string, unknown>

  console.log(`Processing Stripe event: ${eventType}`)

  try {
    switch (eventType) {

      // ── Payment succeeded — activate subscription ───────────────────────────
      case 'invoice.paid': {
        const customerId = eventData.customer as string
        const subscriptionId = eventData.subscription as string

        const { error } = await supabase
          .from('organizations')
          .update({
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
          })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('invoice.paid DB update failed:', error)
        else console.log(`Activated subscription for customer ${customerId}`)
        break
      }

      // ── Payment failed — flag as past due ───────────────────────────────────
      case 'invoice.payment_failed': {
        const customerId = eventData.customer as string

        const { error } = await supabase
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('invoice.payment_failed DB update failed:', error)
        else console.log(`Marked past_due for customer ${customerId}`)
        break
      }

      // ── Subscription status changed (upgrade, downgrade, resume, etc.) ───────
      case 'customer.subscription.updated': {
        const customerId = eventData.customer as string
        const subscriptionId = eventData.id as string
        const stripeStatus = eventData.status as string
        const mappedStatus = mapStripeStatus(stripeStatus)

        if (mappedStatus) {
          const { error } = await supabase
            .from('organizations')
            .update({
              stripe_subscription_id: subscriptionId,
              subscription_status: mappedStatus,
            })
            .eq('stripe_customer_id', customerId)

          if (error) console.error('subscription.updated DB update failed:', error)
          else console.log(`Updated subscription ${subscriptionId} to ${mappedStatus}`)
        } else {
          console.log(`Unhandled Stripe status "${stripeStatus}" — no DB update`)
        }
        break
      }

      // ── Subscription canceled ────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const customerId = eventData.customer as string

        const { error } = await supabase
          .from('organizations')
          .update({ subscription_status: 'canceled' })
          .eq('stripe_customer_id', customerId)

        if (error) console.error('subscription.deleted DB update failed:', error)
        else console.log(`Canceled subscription for customer ${customerId}`)
        break
      }

      default:
        console.log(`Ignored event type: ${eventType}`)
    }
  } catch (err) {
    // Log but return 200: a non-200 response causes Stripe to retry,
    // which is only appropriate for transient failures, not DB errors
    // that will recur on every retry.
    console.error(`Error handling ${eventType}:`, err)
  }

  // Always return 200 to acknowledge receipt
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
