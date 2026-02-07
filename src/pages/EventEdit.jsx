import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents.jsx';
import { supabase } from '../lib/supabase';

const EVENT_PURPOSES = ['Education', 'Advocacy', 'Membership', 'Governance', 'Fundraising', 'Community', 'Other'];

function genTempId() { return '_tmp_' + Math.random().toString(36).substr(2, 8); }

export default function EventEditPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchFullEvent, saveEvent, deleteEvent } = useEvents();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [subcommittees, setSubcommittees] = useState([]);
  const [sourceMinutes, setSourceMinutes] = useState(null);

  const isNew = !id;

  useEffect(() => {
    // Fetch subcommittees for dropdown
    supabase.from('subcommittees').select('id, name').eq('is_active', true).then(({ data }) => setSubcommittees(data || []));

    if (isNew) {
      const minutesId = searchParams.get('minutesId');
      const meetingType = searchParams.get('meetingType');
      const subcommitteeId = searchParams.get('subcommitteeId');

      setDraft({
        _isNew: true,
        source_minutes_id: minutesId || null,
        source_meeting_type: meetingType || null,
        subcommittee_id: subcommitteeId || null,
        name: '',
        date: '',
        time: '',
        location: '',
        description: '',
        desired_outcome: '',
        purpose: '',
        budget_total: '',
        event_vendors: [],
      });

      // Fetch source minutes info if linked
      if (minutesId) {
        supabase.from('minutes').select('id, meeting_type, meeting_date, subcommittee_id, subcommittees(name)')
          .eq('id', minutesId).single()
          .then(({ data }) => {
            if (data) {
              setSourceMinutes(data);
              // Auto-attach subcommittee from source minutes
              if (data.subcommittee_id) {
                setDraft(prev => prev ? ({ ...prev, subcommittee_id: data.subcommittee_id }) : prev);
              }
            }
          });
      }
    } else {
      fetchFullEvent(id).then(data => {
        if (!data) { navigate('/events'); return; }
        setDraft(data);
        // Fetch source minutes if linked
        if (data.source_minutes_id) {
          supabase.from('minutes').select('id, meeting_type, meeting_date, subcommittee_id, subcommittees(name)')
            .eq('id', data.source_minutes_id).single()
            .then(({ data: m }) => { if (m) setSourceMinutes(m); });
        }
      });
    }
  }, [id, isNew, fetchFullEvent, navigate, searchParams]);

  if (!draft) return <div style={{ padding: 32, color: '#64748b' }}>Loading event...</div>;

  const u = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  const addVendor = () => u('event_vendors', [...(draft.event_vendors || []), { _id: genTempId(), name: '', vendor_type: 'vendor', budget: '' }]);
  const updateVendor = (idx, field, value) => {
    const v = [...draft.event_vendors]; v[idx] = { ...v[idx], [field]: value }; u('event_vendors', v);
  };
  const removeVendor = (idx) => u('event_vendors', draft.event_vendors.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!draft.name || !draft.date) { alert('Event name and date are required.'); return; }
    setSaving(true);
    try {
      const eventId = await saveEvent(draft);
      navigate(`/events/${eventId}`);
    } catch (err) { alert('Save error: ' + err.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this event?')) return;
    try { await deleteEvent(id); navigate('/events'); } catch (err) { alert('Error: ' + err.message); }
  };

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/events" style={{ padding: '7px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 13, textDecoration: 'none', color: '#374151' }}>← Back</Link>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>{isNew ? 'Create' : 'Edit'} Event</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isNew && <button onClick={handleDelete} style={{ padding: '8px 18px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Delete</button>}
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Event'}</button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0 40px' }}>
        {/* Source info */}
        {draft.is_orphaned && (
          <div style={{ marginBottom: 16, padding: 14, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: 13 }}>⚠ Orphaned Event — source minutes have been deleted.</div>
          </div>
        )}
        {sourceMinutes && !draft.is_orphaned && (
          <div style={{ marginBottom: 16, padding: 14, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: 13, color: '#0369a1' }}>
            Created from: <strong>{sourceMinutes.meeting_type === 'BOARD' ? 'Board' : sourceMinutes.meeting_type === 'SUBCOMMITTEE' ? 'Subcommittee' : 'Annual'}</strong> minutes on {fmtDate(sourceMinutes.meeting_date)}
            {sourceMinutes.subcommittees?.name && <span> — {sourceMinutes.subcommittees.name}</span>}
            <Link to={`/minutes/${sourceMinutes.id}`} style={{ marginLeft: 12, color: '#0369a1', fontWeight: 600 }}>View Minutes →</Link>
          </div>
        )}

        {/* Event Details */}
        <Card title="Event Details">
          <div style={{ marginBottom: 16 }}>
            <Label required>Event Name</Label>
            <input type="text" value={draft.name} onChange={e => u('name', e.target.value)} placeholder="Event name" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div><Label required>Date</Label><input type="date" value={draft.date || ''} onChange={e => u('date', e.target.value)} style={inp} /></div>
            <div><Label>Time</Label><input type="text" value={draft.time || ''} onChange={e => u('time', e.target.value)} placeholder="e.g., 9:00 AM" style={inp} /></div>
            <div><Label>Location</Label><input type="text" value={draft.location || ''} onChange={e => u('location', e.target.value)} placeholder="Location" style={inp} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <Label>Purpose</Label>
              <select value={draft.purpose || ''} onChange={e => u('purpose', e.target.value)} style={inp}>
                <option value="">Select purpose...</option>
                {EVENT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Subcommittee</Label>
              <select value={draft.subcommittee_id || ''} onChange={e => u('subcommittee_id', e.target.value || null)} style={inp}>
                <option value="">None (General / Board)</option>
                {subcommittees.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Label>Description</Label>
            <textarea value={draft.description || ''} onChange={e => u('description', e.target.value)} placeholder="Event description..." style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
          </div>
          <div>
            <Label>Desired Outcome</Label>
            <textarea value={draft.desired_outcome || ''} onChange={e => u('desired_outcome', e.target.value)} placeholder="What should this event achieve?" style={{ ...inp, minHeight: 60, resize: 'vertical' }} />
          </div>
        </Card>

        {/* Vendors */}
        <Card title="Vendors / Speakers" action={<button onClick={addVendor} style={addBtn}>+ Add</button>}>
          {(draft.event_vendors || []).length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No vendors or speakers added.</div>
          ) : (
            draft.event_vendors.map((v, i) => (
              <div key={v.id || v._id || i} style={{ marginBottom: 10, padding: 12, background: '#f9fafb', borderRadius: 6 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={v.name} onChange={e => updateVendor(i, 'name', e.target.value)} placeholder="Name" style={{ ...inp, flex: 1 }} />
                  <select value={v.vendor_type || 'vendor'} onChange={e => updateVendor(i, 'vendor_type', e.target.value)} style={{ ...inp, width: 130 }}>
                    <option value="vendor">Vendor</option>
                    <option value="food">Food</option>
                    <option value="beverage">Beverage</option>
                    <option value="speaker">Speaker</option>
                    <option value="display">Display</option>
                    <option value="farm">Farm</option>
                    <option value="product">Product</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="rental">Rental</option>
                    <option value="sponsor">Sponsor</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" value={v.budget || ''} onChange={e => updateVendor(i, 'budget', parseFloat(e.target.value) || null)} placeholder="Budget" style={{ ...inp, width: 100 }} />
                  <button onClick={() => removeVendor(i)} style={delBtn}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input type="text" value={v.contact_name || ''} onChange={e => updateVendor(i, 'contact_name', e.target.value)} placeholder="Contact name" style={{ ...inp, fontSize: 13 }} />
                  <input type="text" value={v.contact_phone || ''} onChange={e => updateVendor(i, 'contact_phone', e.target.value)} placeholder="Phone" style={{ ...inp, fontSize: 13 }} />
                  <input type="text" value={v.contact_email || ''} onChange={e => updateVendor(i, 'contact_email', e.target.value)} placeholder="Email" style={{ ...inp, fontSize: 13 }} />
                </div>
                <input type="text" value={v.notes || ''} onChange={e => updateVendor(i, 'notes', e.target.value)} placeholder="Notes (optional)" style={{ ...inp, fontSize: 13, marginTop: 8 }} />
              </div>
            ))
          )}
          <div style={{ marginTop: 14 }}>
            <Label>Total Budget</Label>
            <input type="number" value={draft.budget_total || ''} onChange={e => u('budget_total', parseFloat(e.target.value) || null)} placeholder="0.00" style={{ ...inp, width: 180 }} />
            {(draft.event_vendors || []).length > 0 && (
              <span style={{ marginLeft: 14, fontSize: 12, color: '#64748b' }}>
                Vendor subtotal: ${(draft.event_vendors || []).reduce((s, v) => s + (parseFloat(v.budget) || 0), 0).toFixed(2)}
              </span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, action, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Label({ children, required }) {
  return <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 4 }}>{children}{required && <span style={{ color: '#dc2626' }}> *</span>}</label>;
}

const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const addBtn = { padding: '6px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 };
const delBtn = { padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
