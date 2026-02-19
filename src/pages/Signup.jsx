import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ORG_TYPES = [
  'Farm Bureau',
  'Nonprofit',
  'HOA / Community Association',
  'School Board',
  'Chamber of Commerce',
  'Other',
];

// BUG-083 FIX: Ensure error messages are always strings, never objects
// Supabase can return errors where .message is an object, causing React error #300
function safeErrorMessage(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';
  if (typeof err === 'string') return err;
  if (typeof err.message === 'string' && err.message) return err.message;
  if (typeof err.msg === 'string' && err.msg) return err.msg;
  if (typeof err.error_description === 'string') return err.error_description;
  try {
    return JSON.stringify(err);
  } catch {
    return 'An unexpected error occurred. Please try again.';
  }
}

export default function SignupPage() {
  const { user, signUp, signUpWithInvite, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // BUG-802 FIX: Detect and handle invitation tokens
  const [inviteData, setInviteData] = useState(null); // {id, organization_id, email, role, board_position}
  const [inviteLoading, setInviteLoading] = useState(false);
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (!inviteToken) return;
    setInviteLoading(true);
    supabase.rpc('lookup_invitation', { invite_token: inviteToken })
      .then(({ data, error: lookupErr }) => {
        if (lookupErr) {
          console.error('Invite lookup error:', lookupErr);
          setError('This invitation link is invalid or has expired.');
          setInviteData(null);
        } else if (!data || (Array.isArray(data) && data.length === 0)) {
          setError('This invitation link is invalid or has expired.');
          setInviteData(null);
        } else {
          const inv = Array.isArray(data) ? data[0] : data;
          setInviteData(inv);
          setForm(prev => ({ ...prev, email: inv.email || '' }));
        }
        setInviteLoading(false);
      })
      .catch((err) => {
        console.error('Invite lookup exception:', err);
        setError('Unable to verify invitation. Please try again.');
        setInviteLoading(false);
      });
  }, [inviteToken]);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    organizationName: '',
    organizationSlug: '',
    organizationType: '',
  });

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const autoSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    // BUG-802 FIX: If invite token, submit directly (skip org creation step)
    if (inviteData) {
      handleInviteSignup();
      return;
    }
    setStep(2);
  };

  // BUG-802 FIX: Handle invited user signup
  const handleInviteSignup = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { error: signUpError } = await signUpWithInvite({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        invitationToken: inviteToken,
      });
      if (signUpError) {
        // BUG-083 FIX: Safe error extraction
        setError(safeErrorMessage(signUpError));
        setSubmitting(false);
      }
      // On success, auth state change will redirect
    } catch (err) {
      console.error('Invite signup exception:', err);
      setError(safeErrorMessage(err));
      setSubmitting(false);
    }
  };

  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // BUG-083 FIX: Navigate must be AFTER all hooks to avoid React error #300
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const checkSlugAvailability = async (slug) => {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    // BUG-009 fix: Use RPC function that bypasses RLS for unauthenticated users
    const { data, error } = await supabase.rpc('check_slug_available', { check_slug: slug });
    if (error) {
      console.error('Slug check error:', error);
      setSlugAvailable(null);
    } else {
      setSlugAvailable(data === true);
    }
    setCheckingSlug(false);
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.organizationName || !form.organizationSlug) {
      setError('Organization name and short name are required.');
      return;
    }

    if (!/^[a-z0-9]{3,10}$/.test(form.organizationSlug)) {
      setError('Short name must be 3-10 lowercase letters/numbers only.');
      return;
    }

    if (slugAvailable === false) {
      setError('That short name is already taken. Please choose another.');
      return;
    }

    // BUG-203: Verify slug if check hasn't run yet (user never blurred)
    if (slugAvailable === null) {
      await checkSlugAvailability(form.organizationSlug);
      // Re-check after async call — if taken, abort
      // Note: We need to re-read from the check function directly
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', form.organizationSlug)
        .maybeSingle();
      if (existing) {
        setSlugAvailable(false);
        setError('That short name is already taken. Please choose another.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data, error: signUpError } = await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        organizationName: form.organizationName,
        organizationSlug: form.organizationSlug,
        organizationType: form.organizationType,
      });

      if (signUpError) {
        // BUG-083 FIX: Safe error message extraction
        const msg = safeErrorMessage(signUpError);
        // BUG-806 FIX: Map raw Postgres duplicate key error to friendly message
        if (msg.includes('duplicate key') || msg.includes('slug') || msg.includes('already exists')) {
          setSlugAvailable(false);
          setError('That short name is already taken. Please choose another.');
        } else {
          setError(msg);
        }
        setSubmitting(false);
        return;
      }

      // BUG-083 FIX: Check if email confirmation is required
      // If session is null but user exists, email confirmation is pending
      if (data?.user && !data?.session) {
        setError(null);
        setStep(3); // New step: email confirmation message
        setSubmitting(false);
        return;
      }

      // On success with session, auth state change will redirect
    } catch (err) {
      console.error('Signup exception:', err);
      setError(safeErrorMessage(err));
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: '#1e293b',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>GO</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>
            {inviteData ? 'Join Your Organization' :
             step === 3 ? 'Check Your Email' :
             'Create Your GoodOfTheOrder Portal'}
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {inviteData
              ? `You've been invited to join as ${inviteData.role || 'a member'}`
              : step === 3
                ? 'One more step to get started'
                : `Step ${step} of 2 - ${step === 1 ? 'Your Account' : 'Organization Setup'}`
            }
          </p>
        </div>

        {/* Progress bar */}
        {!inviteData && step !== 3 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#1e293b' }} />
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 2 ? '#1e293b' : '#e2e8f0' }} />
          </div>
        )}

        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 24,
        }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#dc2626',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {/* BUG-083 FIX: Double-safety — always coerce to string */}
              {typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.'}
            </div>
          )}

          {/* BUG-083 FIX: Step 3 — Email confirmation pending */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: 24,
              }}>✉</div>
              <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
                We sent a verification link to <strong>{form.email}</strong>.
              </p>
              <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
                Please check your email and click the link to activate your account. 
                You can close this tab — the link will log you in automatically.
              </p>
              <Link to="/login" style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#1e293b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                Go to Login
              </Link>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Your Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => updateForm('fullName', e.target.value)}
                  required
                  autoFocus
                  placeholder="Jane Smith"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  required
                  readOnly={!!inviteData?.email}
                  placeholder="jane@organization.com"
                  style={{
                    ...inputStyle,
                    ...(inviteData?.email ? { background: '#f1f5f9', color: '#64748b' } : {}),
                  }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  style={inputStyle}
                />
              </div>
              <button type="submit" disabled={submitting || inviteLoading} style={{
                width: '100%',
                padding: '10px 16px',
                background: '#1e293b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? 'Creating...' : inviteData ? 'Join Organization' : 'Continue'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Organization Name</label>
                <input
                  type="text"
                  value={form.organizationName}
                  onChange={(e) => {
                    updateForm('organizationName', e.target.value);
                    if (!form.organizationSlug || form.organizationSlug === autoSlug(form.organizationName)) {
                      updateForm('organizationSlug', autoSlug(e.target.value));
                    }
                  }}
                  required
                  autoFocus
                  placeholder="Lewis County Farm Bureau"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Short Name (for filenames)
                  <span style={{ fontWeight: 400, color: '#94a3b8' }}> - 3-10 chars, letters/numbers only</span>
                </label>
                <input
                  type="text"
                  value={form.organizationSlug}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
                    updateForm('organizationSlug', val);
                    setSlugAvailable(null);
                  }}
                  onBlur={() => checkSlugAvailability(form.organizationSlug)}
                  required
                  placeholder="lcfb"
                  style={{
                    ...inputStyle,
                    borderColor: slugAvailable === false ? '#dc2626' : slugAvailable === true ? '#059669' : '#d1d5db',
                  }}
                />
                {checkingSlug && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Checking availability...</div>}
                {slugAvailable === false && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>This short name is already taken.</div>}
                {slugAvailable === true && <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>✓ Available</div>}
                {form.organizationSlug && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Files will be named like: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                      {form.organizationSlug}_minutes_board_2026-01-15.pdf
                    </code>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Organization Type</label>
                <select
                  value={form.organizationType}
                  onChange={(e) => updateForm('organizationType', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Select type (optional)</option>
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  style={{
                    padding: '10px 16px',
                    background: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#1e293b',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1e40af', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
