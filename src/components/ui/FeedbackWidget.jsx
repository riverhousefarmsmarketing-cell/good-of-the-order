import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from './Toast';

const TYPES = [
  { value: 'bug',        label: '🐛 Bug',        desc: 'Something is broken or not working right' },
  { value: 'suggestion', label: '💡 Suggestion',  desc: 'An idea to improve the app' },
  { value: 'compliment', label: '⭐ Compliment',  desc: 'Something you love about the app' },
];

export function FeedbackWidget({ open: controlledOpen, onOpenChange }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val) => {
    setInternalOpen(val);
    onOpenChange?.(val);
  };
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!profile) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Store in DB
      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          organization_id: profile.organization_id,
          submitted_by:    profile.id,
          type,
          message:         message.trim(),
          page_url:        window.location.pathname,
        });
      if (insertError) throw insertError;

      // Email notification
      const typeLabel = TYPES.find((t) => t.value === type)?.label || type;
      await supabase.functions.invoke('send-email', {
        body: {
          to: ['christine@riverhousedairy.com'],
          subject: `[GoodOfTheOrder Feedback] ${typeLabel} from ${profile.full_name}`,
          html: `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1e293b">
              <h2 style="margin:0 0 16px">New Feedback Received</h2>
              <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                <tr>
                  <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:140px">Type</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0">${typeLabel}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">From</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0">${profile.full_name} (${profile.email})</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Organization</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0">${profile.organization_id}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Page</td>
                  <td style="padding:8px 12px;border:1px solid #e2e8f0">${window.location.pathname}</td>
                </tr>
              </table>
              <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;white-space:pre-wrap">${message.trim()}</div>
            </div>
          `,
          from_name: 'GoodOfTheOrder Feedback',
        },
      });

      toast.success('Thank you — your feedback was submitted!');
      setOpen(false);
      setMessage('');
      setType('suggestion');
    } catch (err) {
      setError(err.message || 'Unable to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Submit feedback"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 90,
          width: 48, height: 48, borderRadius: '50%',
          background: '#0A3228', color: 'white',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          fontSize: 20, lineHeight: 1,
        }}
      >
        💬
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          tabIndex={-1}
        >
          <div
            style={{
              background: 'white', borderRadius: 10, padding: 28,
              width: '100%', maxWidth: 460, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0A3228', margin: '0 0 4px' }}>
                  Submit Feedback
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Help us improve GoodOfTheOrder
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 20, color: '#94a3b8', padding: 4, lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 6, color: '#dc2626', fontSize: 13, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* Type selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                What kind of feedback?
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    title={t.desc}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', textAlign: 'center',
                      border: type === t.value ? '2px solid #0A3228' : '2px solid #e2e8f0',
                      background: type === t.value ? '#f0fdf4' : 'white',
                      color: type === t.value ? '#0A3228' : '#64748b',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>
                {TYPES.find((t) => t.value === type)?.desc}
              </p>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Your feedback
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
                placeholder={
                  type === 'bug'        ? 'Describe what happened and what you expected...' :
                  type === 'suggestion' ? 'Describe your idea...' :
                  'Tell us what you love...'
                }
                rows={5}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
                  resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
                }}
              />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Submitted as {profile.full_name}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '9px 18px', background: 'white', border: '1px solid #d1d5db',
                    borderRadius: 6, fontSize: 14, cursor: 'pointer', color: '#374151',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  style={{
                    padding: '9px 18px', background: '#0A3228', color: 'white',
                    border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: !message.trim() || submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
