import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAgendas } from '../hooks/useAgendas.jsx';
import { useOrganization } from '../hooks/useOrganization.jsx';
import { useAuth } from '../hooks/useAuth';
import SendEmailModal from '../components/email/SendEmailModal.jsx';

import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/Modal';
const MEETING_TYPES = [
  { value: 'BOARD', label: 'Board' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SUBCOMMITTEE', label: 'Subcommittee' },
];

function genTempId() { return '_tmp_' + Math.random().toString(36).substr(2, 8); }

export default function AgendaEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchFullAgenda, saveAgenda, deleteAgenda, getStandardItems, fetchSuggestedItems } = useAgendas();
  const { organization } = useOrganization();
  const { isEditor } = useAuth();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // BUG-038: synchronous guard against double-submit
  const [showSendModal, setShowSendModal] = useState(false);

  // BUG-036: Warn on unsaved changes when navigating away
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

const isNew = !id;

  useEffect(() => {
    if (isNew) {
      setDraft({
        meeting_type: 'BOARD', meeting_date: '', meeting_time: '', location: '', status: 'draft',
        items: getStandardItems().map((item, i) => ({ ...item, _id: genTempId(), sort_order: i + 1 })),
      });
      // Fetch suggestions from recent minutes
      setSuggestionsLoading(true);
      fetchSuggestedItems('BOARD').then(items => {
        setSuggestions(items);
        setSuggestionsLoading(false);
      }).catch(() => setSuggestionsLoading(false));
    } else {
      fetchFullAgenda(id).then(data => { if (!data) navigate('/agendas'); else setDraft(data); });
    }
  }, [id, isNew, fetchFullAgenda, navigate, getStandardItems, fetchSuggestedItems]);

  if (!draft) return <div style={{ padding: 32, color: '#64748b' }}>Loading...</div>;

  const u = (field, value) => {
    setIsDirty(true);
    setDraft(prev => ({ ...prev, [field]: value }));
    // Refresh suggestions when meeting type changes
    if (field === 'meeting_type' && isNew) {
      setSuggestionsLoading(true);
      fetchSuggestedItems(value).then(items => {
        setSuggestions(items);
        setSuggestionsLoading(false);
      }).catch(() => setSuggestionsLoading(false));
    }
  };

  const handleSave = async (status) => {
    // BUG-038: Synchronous double-submit guard
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const newId = await saveAgenda({ ...draft, status: status || draft.status });
      const newStatus = status || draft.status;
      setDraft(prev => ({ ...prev, id: newId || prev.id, status: newStatus }));
      setIsDirty(false); // BUG-036: Clear dirty flag on success
      toast.success('Agenda saved.');
      if (isNew && newId) navigate('/agendas/' + newId, { replace: true });
    } catch (err) { toast.error(`Save failed: ${err.message || 'Please try again.'}`); }
    finally { setSaving(false); savingRef.current = false; }
  };

  const handleFinalize = () => {
    if (!draft.meeting_date) { toast.warning('Please set a meeting date before finalizing.'); return; }
    handleSave('final');
  };

  const handleDelete = async () => {
    await deleteAgenda(draft.id);
    navigate('/agendas');
  };

  const addItem = () => {
    const maxOrder = Math.max(0, ...draft.items.map(i => i.sort_order || 0));
    u('items', [...draft.items, { _id: genTempId(), title: '', description: '', is_standard: false, sort_order: maxOrder + 1 }]);
  };

  const acceptSuggestion = (suggestion) => {
    // Insert before the last 2 standard items (Good of the Order, Adjournment)
    const items = [...draft.items];
    const insertIdx = Math.max(0, items.length - 2);
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order || 0));
    const newItem = {
      _id: genTempId(),
      title: suggestion.title,
      description: suggestion.description || '',
      is_standard: false,
      is_inherited: true,
      source_minutes_id: suggestion.source_minutes_id,
      sort_order: maxOrder + 1,
    };
    items.splice(insertIdx, 0, newItem);
    items.forEach((item, i) => item.sort_order = i + 1);
    u('items', items);
    // Remove from suggestions
    setSuggestions(prev => prev.filter(s => s !== suggestion));
    toast.success(`Added "${suggestion.title}" to agenda.`);
  };

  const updateItem = (idx, updates) => {
    const items = [...draft.items];
    items[idx] = { ...items[idx], ...updates };
    u('items', items);
  };

  const removeItem = (idx) => u('items', draft.items.filter((_, i) => i !== idx));

  const moveItem = (idx, dir) => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= draft.items.length) return;
    const items = [...draft.items];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    items.forEach((item, i) => item.sort_order = i + 1);
    u('items', items);
  };

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const mt = MEETING_TYPES.find(t => t.value === draft.meeting_type)?.label || 'Board';

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => { if (!isDirty || window.confirm('You have unsaved changes. Are you sure you want to leave?')) navigate('/agendas'); }} style={{ padding: '7px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#374151' }}>← Back</button>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>{isNew ? 'Create' : 'Edit'} Agenda</h1>
          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: draft.status === 'sent' ? '#dcfce7' : draft.status === 'final' ? '#dbeafe' : '#fef3c7', color: draft.status === 'sent' ? '#166534' : draft.status === 'final' ? '#1e40af' : '#92400e' }}>{draft.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isNew && <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Delete</button>}
          <button onClick={() => handleSave()} disabled={saving} style={{ padding: '8px 18px', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{saving ? 'Saving...' : 'Save'}</button>
          {draft.status === 'draft' && <button onClick={handleFinalize} disabled={saving} style={{ padding: '8px 18px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: 13 }}>Finalize</button>}
          {draft.status !== 'draft' && !isNew && (
            <button onClick={() => setShowSendModal(true)} style={{ padding: '8px 18px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>✉ Send</button>
          )}
          {draft.status !== 'draft' && <button onClick={() => navigate('/minutes/new?agendaId=' + draft.id)} style={{ padding: '8px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Create Minutes →</button>}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0 40px' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>Meeting Details</h3>
          <div className="goto-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Meeting Type</label><select value={draft.meeting_type} onChange={e => u('meeting_type', e.target.value)} disabled={draft.status !== 'draft'} style={inp}>{MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Meeting Date *</label><input type="date" value={draft.meeting_date || ''} onChange={e => u('meeting_date', e.target.value)} style={inp} /></div>
          </div>
          <div className="goto-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Time</label><input type="text" value={draft.meeting_time || ''} onChange={e => u('meeting_time', e.target.value)} placeholder="e.g., 7:00 PM" style={inp} /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Location</label><input type="text" value={draft.location || ''} onChange={e => u('location', e.target.value)} placeholder="Meeting location" style={inp} /></div>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: 0 }}>Agenda Items</h3>
            <button onClick={addItem} style={{ padding: '7px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>+ Add Item</button>
          </div>
          {draft.items.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No items yet.</div>
          ) : draft.items.map((item, idx) => (
            <div key={item.id || item._id} style={{ display: 'flex', gap: 10, marginBottom: 10, padding: 12, background: item.is_inherited ? '#fffbeb' : '#f8fafc', border: '1px solid ' + (item.is_inherited ? '#fde68a' : '#e2e8f0'), borderRadius: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} style={{ padding: '3px 8px', background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.4 : 1, fontSize: 12 }}>↑</button>
                <button onClick={() => moveItem(idx, 'down')} disabled={idx === draft.items.length - 1} style={{ padding: '3px 8px', background: '#f1f5f9', border: 'none', borderRadius: 4, cursor: idx === draft.items.length - 1 ? 'default' : 'pointer', opacity: idx === draft.items.length - 1 ? 0.4 : 1, fontSize: 12 }}>↓</button>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: '#64748b', fontSize: 13, minWidth: 24 }}>{idx + 1}.</span>
                  <input type="text" value={item.title} onChange={e => updateItem(idx, { title: e.target.value })} placeholder="Agenda item title" style={{ ...inp, fontWeight: 500 }} />
                  {item.is_standard && <span style={{ fontSize: 10, padding: '2px 8px', background: '#e0e7ff', color: '#4338ca', borderRadius: 10, whiteSpace: 'nowrap' }}>Standard</span>}
                  {item.is_inherited && <span style={{ fontSize: 10, padding: '2px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 10, whiteSpace: 'nowrap' }}>Carried Over</span>}
                </div>
                <input type="text" value={item.description || ''} onChange={e => updateItem(idx, { description: e.target.value })} placeholder="Description (optional)" style={{ ...inp, fontSize: 13 }} />
              </div>
              {!item.is_standard && <button onClick={() => removeItem(idx)} style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-start', fontSize: 14 }}>×</button>}
            </div>
          ))}
        </div>

        {/* Suggested items from recent minutes */}
        {isNew && suggestions.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 24, marginTop: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#92400e', margin: '0 0 8px' }}>Suggested Items from Recent Minutes</h3>
            <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 16px' }}>These items from your most recent meeting may need follow-up. Click to add them to this agenda.</p>
            {suggestions.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, padding: 10, background: 'white', border: '1px solid #fde68a', borderRadius: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>{s.title}</div>
                  {s.description && <div style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>{s.description}</div>}
                  <span style={{ fontSize: 10, padding: '2px 8px', background: s._reason === 'tabled' ? '#fef2f2' : s._reason === 'pending_action' ? '#eff6ff' : '#f1f5f9', color: s._reason === 'tabled' ? '#dc2626' : s._reason === 'pending_action' ? '#1e40af' : '#64748b', borderRadius: 10, marginTop: 4, display: 'inline-block' }}>
                    {s._reason === 'tabled' ? 'Tabled Motion' : s._reason === 'pending_action' ? 'Pending Action Item' : 'Unresolved Business'}
                  </span>
                </div>
                <button onClick={() => acceptSuggestion(s)} style={{ padding: '6px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
              </div>
            ))}
          </div>
        )}
        {isNew && suggestionsLoading && (
          <div style={{ marginTop: 16, padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Checking recent minutes for suggested items...</div>
        )}
      </div>
<ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Agenda"
        message="This will permanently delete this agenda. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Send Email Modal — only mount when open to prevent hook-related render crash */}
      {showSendModal && <SendEmailModal
        open={showSendModal}
        onClose={() => setShowSendModal(false)}
        documentType="agenda"
        documentId={draft.id}
        subject={`${mt} Meeting Agenda — ${fmtDate(draft.meeting_date)}`}
        htmlBody={generateAgendaEmailHtml(draft, mt, fmtDate, organization)}
        fromName={organization?.name || 'GoodOfTheOrder'}
      />}
    </div>
  );
}

// HTML escape helper (BUG-025: prevent XSS in email HTML)
const escA = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function generateAgendaEmailHtml(draft, mt, fmtDate, org) {
  let html = `<div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;color:#1e293b">`;
  html += `<div style="text-align:center;margin-bottom:24px">`;
  html += `<h1 style="font-size:20px;color:#1e293b;margin:0 0 4px">${mt} Meeting Agenda</h1>`;
  html += `<div style="color:#64748b;font-size:14px">${escA(org?.name || 'Organization')}</div>`;
  html += `</div>`;
  html += `<div style="margin-bottom:20px;font-size:14px;line-height:1.8">`;
  html += `<div><strong>Date:</strong> ${fmtDate(draft.meeting_date) || '[TBD]'}</div>`;
  if (draft.meeting_time) html += `<div><strong>Time:</strong> ${escA(draft.meeting_time)}</div>`;
  if (draft.location) html += `<div><strong>Location:</strong> ${escA(draft.location)}</div>`;
  html += `</div>`;
  html += `<h3 style="color:#1e293b;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:20px 0 12px">Agenda Items</h3>`;
  html += `<ol style="margin:0;padding-left:20px;font-size:14px;line-height:2">`;
  draft.items.forEach(item => {
    html += `<li style="margin-bottom:4px"><strong>${escA(item.title)}</strong>`;
    if (item.description) html += `<br><span style="color:#64748b;font-size:13px">${escA(item.description)}</span>`;
    html += `</li>`;
  });
  html += `</ol></div>`;
  return html;
}
