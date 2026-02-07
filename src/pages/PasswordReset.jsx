import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD — User requests a password reset email
// ═══════════════════════════════════════════════════════════════════════════════

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={styles.logo}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>GO</span>
          </div>
          <h1 style={styles.heading}>Reset your password</h1>
          <p style={styles.subtext}>
            {submitted
              ? "Check your email for a reset link."
              : "Enter your email and we'll send you a link to reset your password."
            }
          </p>
        </div>

        <div style={styles.card}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              {/* Success state */}
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}>
                We sent a password reset link to:
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: '0 0 20px' }}>
                {email}
              </p>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => { setSubmitted(false); setEmail(''); }}
                  style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={styles.label}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@organization.com"
                  style={styles.input}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitBtn,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p style={styles.bottomLink}>
          Remember your password?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD — User sets a new password (arrived via email link)
// ═══════════════════════════════════════════════════════════════════════════════

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={styles.logo}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>GO</span>
          </div>
          <h1 style={styles.heading}>
            {success ? 'Password updated' : 'Set a new password'}
          </h1>
          <p style={styles.subtext}>
            {success
              ? 'Your password has been changed successfully.'
              : 'Choose a strong password for your account.'
            }
          </p>
        </div>

        <div style={styles.card}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <Link
                to="/login"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: '#1e293b',
                  color: 'white',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Sign in with new password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={styles.label}>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="At least 8 characters"
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={styles.label}>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  style={styles.input}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitBtn,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>

        <p style={styles.bottomLink}>
          <Link to="/login" style={styles.link}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}


// ─── Shared styles (matches Login page) ──────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  logo: {
    width: 56,
    height: 56,
    background: '#1e293b',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  heading: {
    fontSize: 24,
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  subtext: {
    color: '#64748b',
    fontSize: 14,
    margin: 0,
    lineHeight: 1.5,
  },
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 24,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  submitBtn: {
    width: '100%',
    padding: '10px 16px',
    background: '#1e293b',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  errorBox: {
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 16,
  },
  bottomLink: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: '#64748b',
  },
  link: {
    color: '#1e40af',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
