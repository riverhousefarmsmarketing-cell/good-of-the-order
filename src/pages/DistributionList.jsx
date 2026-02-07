import { useState } from 'react';
import { useEmail } from '../hooks/useEmail.jsx';
import { useMembers } from '../hooks/useMembers.jsx';
import { ConfirmDialog } from '../components/ui/Modal';

const GROUP_OPTIONS = ['Board', 'Committee', 'Staff', 'Guest', 'Other'];

export default function DistributionListPage() {
  const { contacts, contactsLoading, saveContact, deleteContact, importContactsFromMembers } = useEmail();
  const { members } = useMembers();
  const [editing, setEditing] = useState(null); // null | 'new' | contact.id
  const [form, setForm] = useState({ full_name: '', email: '', group_label: 'Board', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
const [removeTarget, setRemoveTarget] = useState(null);

  const openEdit = (contact = null) => {
    setError(null);
    if (contact) {
      setForm({ full_name: contact.full_name, email: contact.email, group_label: contact.group_label || 'Board', is_active: contact.is_active });
      setEditing(contact.id);
    } else {
      setForm({ full_name: '', email: '', group_label: 'Board', is_active: true });
      setEditing('new');
    }
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) { setError('Name and email are required.'); return; }
    setSaving(true); setError(null);
    try {
      await saveContact(editing === 'new' ? form : { id: editing, ...form });
      setEditing(null);
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const handleRemove = async () => {
    try { await deleteContact(removeTarget); if (editing === removeTarget) setEditing(null); setRemoveTarget(null); }
    catch (err) { setError(err.message); setRemoveTarget(null); }
  };

  const handleImport = async () => {
    setImportMsg(null);
    try {
      const count = await importContactsFromMembers(members);
      setImportMsg(count > 0 ? `Imported ${count} member(s).` : 'All members already in the list.');
    } catch (err) { setError(err.message); }
  };

  // Group contacts
  const groups = {};
  contacts.forEach(c => {
    const g = c.group_label || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Distribution List</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Manage email recipients for minutes and agenda distribution. {contacts.length} contact{contacts.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleImport} style={{
            padding: '10px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0',
            borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#475569',
          }}>Import from Members</button>
          <button onClick={() => openEdit()} style={{
            padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none',
            borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>+ Add Contact</button>
        </div>
      </div>

      {importMsg && (
        <div style={{ marginBottom: 16, padding: 12, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, color: '#166534', fontSize: 13 }}>
          {importMsg}
        </div>
      )}
      {error && !editing && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      {contactsLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : contacts.length === 0 ? (
        <div style={{ padding: 48, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
          No contacts yet. Add contacts manually or import from your Members list.
        </div>
      ) : (
        Object.keys(groups).sort().map(groupName => (
          <div key={groupName} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {groupName} ({groups[groupName].length})
            </div>
            {groups[groupName].map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 6,
                opacity: c.is_active ? 1 : 0.5,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#1e293b', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13,
                }}>
                  {c.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {c.full_name}
                    {!c.is_active && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', background: '#f1f5f9', borderRadius: 8, color: '#94a3b8' }}>Inactive</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{c.email}</div>
                </div>
                <button onClick={() => openEdit(c)} style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#475569' }}>Edit</button>
                <button onClick={() => setRemoveTarget(c.id)} style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>×</button>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Edit/Create Modal */}
      {editing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditing(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 20px', color: '#1e293b' }}>
              {editing === 'new' ? 'Add Contact' : 'Edit Contact'}
            </h2>
            {error && editing && (
              <div style={{ marginBottom: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', fontSize: 13 }}>{error}</div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Full Name *</label>
              <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Smith" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Group</label>
              <select value={form.group_label} onChange={e => setForm({ ...form, group_label: e.target.value })} style={inp}>
                {GROUP_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <span style={{ fontSize: 14, color: '#374151' }}>Active</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none',
                borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.5 : 1,
              }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
<ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title="Remove Contact"
        message="Remove this contact from the distribution list?"
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}

const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
