import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/Modal';

const EVENT_PURPOSES = [
  'Education', 'Advocacy', 'Membership', 'Governance', 'Fundraising', 'Community', 'Other'
];

function genTempId() { return '_tmp_' + Math.random().toString(36).substr(2, 8); }

export default function EventEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchFullEvent, saveEvent, deleteEvent } = useEvents();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [subcommittees, setSubcommittees] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isNew = !id;

  // Fetch subcommittees for dropdown
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('subcommittees').select('id, name, is_active')
      .eq('organization_id', profile.organization_id).eq('is_active', true).order('name')
      .then(({ data }) => setSubcommittees(data || []));
  }, [profile?.organization_id]);

  // Load existing event or initialize new
  useEffect(() => {
    if (isNew) {
      setDraft({
        _isNew: true,
        id: genTempId(),
        name: '',
        date: '',
        time: '',
        location: '',
        description: '',
        desired_outcome: '',
        purpose: '',
        subcommittee_id: null,
        source_minutes_id: null,
        budget_total: '',
        event_vendors: [],
      });
    } else {
      fetchFullEvent(id).then(data => {
        if (!data) { navigate('/events'); return; }
        setDraft(data);
      });
    }
  }, [id, isNew, fetchFullEvent, navigate]);

  if (!draft) return <div style={{ padding: 32, color: '#64748b' }}>Loading...</div>;

  const u = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!draft.name) { toast.warning('Please enter an event name.'); return; }
    if (!draft.date) { toast.warning('Please set a date for the event.'); return; }
    setSaving(true);
    try {
      const newId = await saveEvent(draft);
      toast.success('Event saved.');
      if (isNew) navigate(`/events/${newId}`, { replace: true });
    } catch (err) {
      toast.error(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEvent(draft.id);
      toast.success('Event deleted.');
      navigate('/events');
    } catch (err) {
      toast.error('Unable to delete event.');
    }
  };

  // Vendor helpers
  const addVendor = () => {
    u('event_vendors', [...(draft.event_vendors || []), {
      _id: genTempId(), name: '', vendor_type: 'vendor',
      contact_name: '', contact_phone: '', contact_email: '', notes: '', budget: '',
    }]);
  };

  const updateVendor = (idx, updates) => {
    const vendors = [...(draft.event_vendors || [])];
    vendors[idx] = { ...vendors[idx], ...updates };
    u('event_vendors', vendors);
  };

  const removeVendor = (idx) => {
    u('event_vendors', (draft.event_vendors || []).filter((_, i) => i !== idx));
  };

  const vendorSubtotal = (draft.event_vendors || []).reduce((sum, v) => sum + (parseFloat(v.budget) || 0), 0);

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
  const sel = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 };
  const ta = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', minHeight: 70 };

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/events" style={{ padding: '7px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, textDecoration: 'none', color: '#374151' }}>← Back</Link>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>{isNew ? 'New Event' : 'Edit Event'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isNew && (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Delete</button>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 18px', background: '#059669', color: 'white',
            border: 'none', borderRadius: 6, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 13, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving...' : '💾 Save Event'}
          </button>
        </div>
      </div>

      {/* Orphaned warning */}
      {draft.is_orphaned && (
        <div style={{ maxWidth: 900, margin: '16px auto 0', padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, color: '#92400e', fontSize: 14 }}>⚠ Orphaned Event</div>
          <div style={{ fontSize: 13, color: '#92400e' }}>The source minutes for this event have been deleted.</div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0 40px' }}>
        {/* Event Details */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>Event Details</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Event Name *</label>
            <input type="text" value={draft.name || ''} onChange={e => u('name', e.target.value)} placeholder="Enter event name" style={inp} />
          </div>

          <div className="goto-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Date *</label>
              <input type="date" value={draft.date || ''} onChange={e => u('date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Time</label>
              <input type="text" value={draft.time || ''} onChange={e => u('time', e.target.value)} placeholder="e.g., 9:00 AM or TBD" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Location</label>
              <input type="text" value={draft.location || ''} onChange={e => u('location', e.target.value)} placeholder="Event location" style={inp} />
            </div>
          </div>

          <div className="goto-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Purpose</label>
              <select value={draft.purpose || ''} onChange={e => u('purpose', e.target.value)} style={sel}>
                <option value="">Select purpose...</option>
                {EVENT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Subcommittee (optional)</label>
              <select value={draft.subcommittee_id || ''} onChange={e => u('subcommittee_id', e.target.value || null)} style={sel}>
                <option value="">None</option>
                {subcommittees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Description</label>
            <textarea value={draft.description || ''} onChange={e => u('description', e.target.value)} placeholder="Describe the event..." style={ta} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Desired Outcome</label>
            <textarea value={draft.desired_outcome || ''} onChange={e => u('desired_outcome', e.target.value)} placeholder="What should this event achieve?" style={{ ...ta, minHeight: 55 }} />
          </div>
        </div>

        {/* Vendors / Speakers */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>Vendors / Speakers</h3>
            <button onClick={addVendor} style={{ padding: '7px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Add</button>
          </div>

          {(draft.event_vendors || []).length === 0 ? (
            <div style={{ padding: 24, background: '#f8fafc', borderRadius: 8, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No vendors or speakers added yet.
            </div>
          ) : (
            (draft.event_vendors || []).map((v, idx) => (
              <div key={v.id || v._id} style={{ padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={v.name || ''} onChange={e => updateVendor(idx, { name: e.target.value })} placeholder="Name" style={{ ...inp, flex: 1 }} />
                  <select value={v.vendor_type || 'vendor'} onChange={e => updateVendor(idx, { vendor_type: e.target.value })} style={{ ...sel, width: 130 }}>
                    <option value="vendor">Vendor</option>
                    <option value="speaker">Speaker</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" inputMode="decimal" value={v.budget || ''} onChange={e => updateVendor(idx, { budget: e.target.value })} placeholder="Budget" style={{ ...inp, width: 100 }} />
                  <button onClick={() => removeVendor(idx)} style={{ padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                <div className="goto-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input type="text" value={v.contact_name || ''} onChange={e => updateVendor(idx, { contact_name: e.target.value })} placeholder="Contact name" style={{ ...inp, fontSize: 13 }} />
                  <input type="text" value={v.contact_phone || ''} onChange={e => updateVendor(idx, { contact_phone: e.target.value })} placeholder="Phone" style={{ ...inp, fontSize: 13 }} />
                  <input type="email" value={v.contact_email || ''} onChange={e => updateVendor(idx, { contact_email: e.target.value })} placeholder="Email" style={{ ...inp, fontSize: 13 }} />
                </div>
                <input type="text" value={v.notes || ''} onChange={e => updateVendor(idx, { notes: e.target.value })} placeholder="Notes (optional)" style={{ ...inp, fontSize: 13, marginTop: 8 }} />
              </div>
            ))
          )}

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Total Budget</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="text" inputMode="decimal" value={draft.budget_total || ''} onChange={e => u('budget_total', e.target.value)} placeholder="0.00" style={{ ...inp, width: 200 }} />
              {(draft.event_vendors || []).length > 0 && (
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Vendor subtotal: ${vendorSubtotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="This will permanently delete this event and all associated vendors. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
