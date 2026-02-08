import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ORG_TYPES = [
  'Farm Bureau',
  'Nonprofit',
  'HOA / Community Association',
  'School Board',
  'Chamber of Commerce',
  'Other',
];

export default function SignupPage() {
  const { user, signUp, loading } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    organizationName: '',
    organizationSlug: '',
    organizationType: '',
  });

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

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
    setStep(2);
  };

  const [slugAvailable, setSlugAvailable] = useState(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

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
    const { error: signUpError } = await signUp({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      organizationName: form.organizationName,
      organizationSlug: form.organizationSlug,
      organizationType: form.organizationType,
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
    }
    // On success, auth state change will redirect
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
            Create Your GoodOfTheOrder Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Step {step} of 2 - {step === 1 ? 'Your Account' : 'Organization Setup'}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#1e293b' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step >= 2 ? '#1e293b' : '#e2e8f0' }} />
        </div>

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
              {error}
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
                  placeholder="jane@organization.com"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  style={inputStyle}
                />
              </div>
              <button type="submit" style={{
                width: '100%',
                padding: '10px 16px',
                background: '#1e293b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Continue
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
