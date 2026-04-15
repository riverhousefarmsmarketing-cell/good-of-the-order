// src/pages/Billing.jsx
// Shown when a user's trial has expired or subscription has lapsed.
// Also accessible directly at /billing for admins who want to manage billing.
// Non-admins see a "contact your admin" message — only admins can initiate checkout.

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const PRICE_IDS = {
  monthly: 'price_1TMXlG7rIwjFQ2JVISU3hcnN',
  annual:  'price_1TMXlq7rIwjFQ2JVwyZ47NkK',
};

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.supabase.co/functions/v1');

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt) - new Date();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function getTrialStatus(organization) {
  if (!organization) return 'unknown';
  if (organization.is_permanently_comped) return 'comped';
  if (organization.subscription_status === 'active') return 'active';
  if (organization.subscription_status === 'comped') return 'comped';
  if (organization.subscription_status === 'trialing') {
    return getDaysRemaining(organization.trial_ends_at) > 0 ? 'trialing' : 'expired';
  }
  return organization.subscription_status; // past_due, canceled
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function BillingPage() {
  const { profile, organization } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null); // 'monthly' | 'annual' | 'portal'
  const [error, setError] = useState(null);

  const trialStatus = getTrialStatus(organization);
  const daysRemaining = getDaysRemaining(organization?.trial_ends_at);
  const isAdmin = profile?.role === 'admin';

  // ── Checkout handler ────────────────────────────────────────────────────
  async function handleCheckout(planKey) {
    setError(null);
    setLoadingPlan(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price_id: PRICE_IDS[planKey] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPlan(null);
    }
  }

  // ── Portal handler (manage existing subscription) ───────────────────────
  async function handlePortal() {
    setError(null);
    setLoadingPlan('portal');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-portal-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Portal failed');

      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPlan(null);
    }
  }

  // ─── Status banner ───────────────────────────────────────────────────────
  function StatusBanner() {
    if (trialStatus === 'comped' || trialStatus === 'active') return null;

    if (trialStatus === 'trialing' && daysRemaining > 0) {
      return (
        <div style={{
          background: '#EDF7F1', border: '1px solid #B8DCC8', borderRadius: 8,
          padding: '12px 20px', marginBottom: 32, fontSize: 14, color: '#0A3228',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⏱</span>
          <span>
            Your free trial ends in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>.
            Subscribe now to keep your records uninterrupted.
          </span>
        </div>
      );
    }

    if (trialStatus === 'expired' || trialStatus === 'canceled') {
      return (
        <div style={{
          background: '#FEF3F2', border: '1px solid #FECACA', borderRadius: 8,
          padding: '12px 20px', marginBottom: 32, fontSize: 14, color: '#7F1D1D',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span>
            Your trial has ended. Choose a plan below to restore access to your minutes and records.
          </span>
        </div>
      );
    }

    if (trialStatus === 'past_due') {
      return (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
          padding: '12px 20px', marginBottom: 32, fontSize: 14, color: '#78350F',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>
            Your last payment didn't go through. Please update your payment method to restore access.
          </span>
        </div>
      );
    }

    return null;
  }

  // ─── Non-admin view ──────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h1 style={headingStyle}>Subscription Required</h1>
          <p style={{ color: '#384E42', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
            Your organization's free trial has ended. An admin needs to set up a subscription
            to restore access.
          </p>
          <p style={{ color: '#6A7E70', fontSize: 14 }}>
            Contact your organization administrator to get billing set up.
          </p>
        </div>
      </div>
    );
  }

  // ─── Active / comped view (admin managing their subscription) ────────────
  if (trialStatus === 'active' && organization?.stripe_customer_id) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h1 style={headingStyle}>Billing</h1>
          <p style={{ color: '#384E42', fontSize: 15, marginBottom: 32 }}>
            Your subscription is active. You can update your payment method, view invoices,
            or cancel through the billing portal.
          </p>
          {error && <ErrorBox message={error} />}
          <button
            onClick={handlePortal}
            disabled={loadingPlan === 'portal'}
            style={primaryBtnStyle}
          >
            {loadingPlan === 'portal' ? 'Opening portal…' : 'Manage Billing →'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main pricing view ───────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <StatusBanner />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ ...headingStyle, fontSize: 28, marginBottom: 12 }}>
            Choose Your Plan
          </h1>
          <p style={{ color: '#384E42', fontSize: 15, maxWidth: 520, margin: '0 auto' }}>
            All plans include unlimited users, unlimited minutes, PDF export, email
            distribution, and complete audit history. No feature gating on
            governance-critical tools.
          </p>
        </div>

        {error && <ErrorBox message={error} />}

        {/* Pricing cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 48,
        }}>

          {/* Monthly */}
          <PlanCard
            name="Monthly"
            price="$39"
            period="/month"
            description="Flexible month-to-month. Cancel anytime."
            features={[
              'Unlimited users',
              'Unlimited minutes & agendas',
              'PDF export & email distribution',
              'Complete archive & audit trail',
            ]}
            ctaLabel={loadingPlan === 'monthly' ? 'Redirecting to Stripe…' : 'Subscribe Monthly'}
            onCta={() => handleCheckout('monthly')}
            loading={loadingPlan === 'monthly'}
            disabled={!!loadingPlan}
          />

          {/* Annual — highlighted */}
          <PlanCard
            name="Annual"
            price="$29"
            period="/month"
            subPrice="$348 billed annually"
            savingsBadge="Save $120/yr"
            description="Best value. One payment, full year of access."
            features={[
              'Everything in Monthly',
              'Two months free vs. monthly',
              'Single annual invoice for your records',
            ]}
            highlighted
            ctaLabel={loadingPlan === 'annual' ? 'Redirecting to Stripe…' : 'Subscribe Annually'}
            onCta={() => handleCheckout('annual')}
            loading={loadingPlan === 'annual'}
            disabled={!!loadingPlan}
          />

          {/* Federation */}
          <PlanCard
            name="Federation Bulk"
            price="$15"
            period="/county/month"
            subPrice="$180/county/yr, billed to state federation"
            description="For state federations licensing GoodOfTheOrder for all member counties."
            features={[
              'All features for every county',
              'Single annual invoice to the federation',
              'Onboarding support included',
              'County secretaries activate their own org',
            ]}
            ctaLabel="Contact Us"
            ctaHref="mailto:christine@riverhousedairy.com?subject=Federation Bulk License — GoodOfTheOrder"
            isContact
          />

        </div>

        {/* Trust footer */}
        <div style={{
          textAlign: 'center', fontSize: 13, color: '#6A7E70',
          borderTop: '1px solid #E0E0E0', paddingTop: 24,
        }}>
          <p style={{ marginBottom: 6 }}>
            Payments processed securely by Stripe. Your card data never touches our servers.
          </p>
          <p style={{ margin: 0 }}>
            Questions?{' '}
            <a
              href="mailto:christine@riverhousedairy.com"
              style={{ color: '#105040', textDecoration: 'none' }}
            >
              Email us
            </a>
            {' '}— we respond within one business day.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────

function PlanCard({
  name, price, period, subPrice, savingsBadge, description,
  features, highlighted, ctaLabel, onCta, ctaHref, isContact, loading, disabled,
}) {
  return (
    <div style={{
      background: highlighted ? '#105040' : '#FFFFFF',
      border: highlighted ? 'none' : '1px solid #E0E0E0',
      borderRadius: 12,
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      boxShadow: highlighted ? '0 4px 24px rgba(16,80,64,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      {savingsBadge && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: '#289878', color: 'white', fontSize: 11, fontWeight: 700,
          padding: '4px 14px', borderRadius: 20, letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}>
          {savingsBadge}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: highlighted ? '#B8DCC8' : '#6A7E70',
          marginBottom: 8,
        }}>
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 40, fontWeight: 400,
            color: highlighted ? '#FFFFFF' : '#081810',
          }}>
            {price}
          </span>
          <span style={{ fontSize: 14, color: highlighted ? '#B8DCC8' : '#6A7E70' }}>
            {period}
          </span>
        </div>
        {subPrice && (
          <div style={{ fontSize: 12, color: highlighted ? '#B8DCC8' : '#6A7E70', marginTop: 2 }}>
            {subPrice}
          </div>
        )}
      </div>

      <p style={{
        fontSize: 13, lineHeight: 1.6, marginBottom: 20,
        color: highlighted ? '#E8E0D8' : '#384E42',
      }}>
        {description}
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            fontSize: 13, marginBottom: 8,
            color: highlighted ? '#E8E0D8' : '#384E42',
          }}>
            <span style={{ color: highlighted ? '#B8DCC8' : '#289878', flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {isContact ? (
        <a
          href={ctaHref}
          style={{
            display: 'block', textAlign: 'center',
            padding: '12px 20px',
            background: 'transparent',
            border: '1px solid #E0E0E0',
            borderRadius: 6, fontSize: 14, fontWeight: 600,
            color: '#105040', textDecoration: 'none', cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </a>
      ) : (
        <button
          onClick={onCta}
          disabled={loading || disabled}
          style={{
            display: 'block', width: '100%',
            padding: '12px 20px',
            background: highlighted ? '#FFFFFF' : '#105040',
            color: highlighted ? '#105040' : '#FFFFFF',
            border: 'none', borderRadius: 6,
            fontSize: 14, fontWeight: 600,
            cursor: loading || disabled ? 'not-allowed' : 'pointer',
            opacity: disabled && !loading ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ─── Error Box ────────────────────────────────────────────────────────────

function ErrorBox({ message }) {
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
      padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#9B1C1C',
    }}>
      {message}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const pageStyle = {
  padding: 32,
  minHeight: '100vh',
  background: '#FAFAF9',
  fontFamily: "'DM Sans', -apple-system, sans-serif",
};

const headingStyle = {
  fontFamily: "'DM Serif Display', Georgia, serif",
  fontSize: 24,
  fontWeight: 400,
  color: '#081810',
  margin: '0 0 8px',
};

const primaryBtnStyle = {
  padding: '12px 28px',
  background: '#105040',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
