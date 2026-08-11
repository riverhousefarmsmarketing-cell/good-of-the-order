import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useOrganization } from '../hooks/useOrganization.jsx';
import { supabase } from '../lib/supabase';
import { ConfirmDialog } from '../components/ui/Modal';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'subcommittees', label: 'Subcommittees' },
  { id: 'accounts', label: 'Financial Accounts' },
  { id: 'meetings', label: 'Meeting Types' },
  { id: 'billing', label: 'Billing' },
];

const LOGO_POSITIONS = [
  { value: 'left', label: 'Left', align: 'flex-start' },
  { value: 'center', label: 'Center', align: 'center' },
  { value: 'right', label: 'Right', align: 'flex-end' },
];

export default function SettingsPage() {
  const { profile, isAdmin } = useAuth();
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
const [deleteScTarget, setDeleteScTarget] = useState(null);

  const [form, setForm] = useState({
    name: '', slug: '', timezone: '', fiscal_year_start: 1,
    primary_color: '#1e3a5f', accent_color: '#dc2626', default_roles: [],
    logo_position: 'center',
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  // === Subcommittees state ===
  const [subcommittees, setSubcommittees] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [editingSC, setEditingSC] = useState(null);
  const [scSaving, setScSaving] = useState(false);
  const [scForm, setScForm] = useState({
    name: '', chair_id: '', description: '', is_active: true, memberIds: [],
  });

  // === Financial Accounts state ===
  const [orgAccounts, setOrgAccounts] = useState([]);
  const [editingAcct, setEditingAcct] = useState(null);
  const [acctSaving, setAcctSaving] = useState(false);
  const [deleteAcctTarget, setDeleteAcctTarget] = useState(null);
  const [acctForm, setAcctForm] = useState({
    name: '', notes: '', is_active: true, sort_order: 0,
  });

  // Load org data
  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || '', slug: organization.slug || '',
        timezone: organization.timezone || 'America/Los_Angeles',
        fiscal_year_start: organization.fiscal_year_start || 1,
        primary_color: organization.primary_color || '#1e3a5f',
        accent_color: organization.accent_color || '#dc2626',
        logo_position: organization.logo_position || 'center',
        default_roles: organization.default_roles || [
          { title: 'President', order: 1 }, { title: 'Vice President', order: 2 },
          { title: 'Secretary', order: 3 }, { title: 'Treasurer', order: 4 },
          { title: 'Board Member', order: 5 },
        ],
      });
      setLogoPreview(organization.logo_url);
    }
  }, [organization]);

  // Load subcommittees + members
  useEffect(() => {
    if (!organization) return;
    fetchSubcommittees();
    supabase.from('members').select('id, full_name, board_position')
      .eq('organization_id', organization.id).eq('is_active', true).order('full_name')
      .then(({ data }) => setAllMembers(data || []));
    fetchOrgAccounts();
  }, [organization]);

  const fetchOrgAccounts = async () => {
    if (!organization) return;
    const { data } = await supabase
      .from('organization_accounts')
      .select('*')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    setOrgAccounts(data || []);
  };

  const fetchSubcommittees = async () => {
    if (!organization) return;
    const { data } = await supabase
      .from('subcommittees')
      .select('*, chair:members!subcommittees_chair_id_fkey(id, full_name), subcommittee_members(member_id, member:members!subcommittee_members_member_id_fkey(id, full_name))')
      .eq('organization_id', organization.id)
      .order('name');
    setSubcommittees(data || []);
  };

  const updateForm = (field, value) => { setForm(prev => ({ ...prev, [field]: value })); setSaved(false); };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2MB'); return; }
    setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); setSaved(false);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      let logoUrl = organization?.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${organization.id}/logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('org-assets').upload(filePath, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('org-assets').getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }
      const { error: updateError } = await supabase.from('organizations').update({
        name: form.name, timezone: form.timezone, fiscal_year_start: form.fiscal_year_start,
        primary_color: form.primary_color, accent_color: form.accent_color,
        default_roles: form.default_roles, logo_url: logoUrl,
        logo_position: form.logo_position,
      }).eq('id', organization.id);
      if (updateError) throw updateError;
      setSaved(true); setLogoFile(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const addRole = () => {
    const maxOrder = Math.max(0, ...form.default_roles.map(r => r.order));
    updateForm('default_roles', [...form.default_roles, { title: '', order: maxOrder + 1 }]);
  };
  const updateRole = (index, field, value) => {
    const updated = [...form.default_roles]; updated[index] = { ...updated[index], [field]: value };
    updateForm('default_roles', updated);
  };
  const removeRole = (index) => updateForm('default_roles', form.default_roles.filter((_, i) => i !== index));

  // === Subcommittee CRUD ===
  const openSCModal = (sc = null) => {
    setError(null);
    if (sc) {
      const memberIds = (sc.subcommittee_members || []).map(sm => sm.member_id);
      setScForm({
        name: sc.name || '', chair_id: sc.chair_id || '', description: sc.description || '',
        is_active: sc.is_active !== false, memberIds,
      });
      setEditingSC(sc.id);
    } else {
      setScForm({ name: '', chair_id: '', description: '', is_active: true, memberIds: [] });
      setEditingSC('new');
    }
  };

  const saveSC = async () => {
    if (!scForm.name) { setError('Subcommittee name is required.'); return; }
    setScSaving(true); setError(null);
    try {
      let scId;
      const payload = {
        name: scForm.name, chair_id: scForm.chair_id || null,
        description: scForm.description || null, is_active: scForm.is_active,
      };
      if (editingSC === 'new') {
        const { data, error: err } = await supabase.from('subcommittees')
          .insert({ ...payload, organization_id: organization.id }).select().single();
        if (err) throw err;
        scId = data.id;
      } else {
        const { error: err } = await supabase.from('subcommittees').update(payload).eq('id', editingSC);
        if (err) throw err;
        scId = editingSC;
      }
      // Sync members. Check these errors: supabase-js does not throw, so a
      // returned { error } here (RLS/constraint) was invisible and the roster
      // was silently lost while the save reported success.
      const { error: delMembersErr } = await supabase.from('subcommittee_members').delete().eq('subcommittee_id', scId);
      if (delMembersErr) throw delMembersErr;
      let memberIds = [...scForm.memberIds];
      if (scForm.chair_id && !memberIds.includes(scForm.chair_id)) memberIds.push(scForm.chair_id);
      if (memberIds.length > 0) {
        const rows = memberIds.map(mid => ({ subcommittee_id: scId, member_id: mid }));
        const { error: insMembersErr } = await supabase.from('subcommittee_members').insert(rows);
        if (insMembersErr) throw insMembersErr;
      }
      await fetchSubcommittees();
      setEditingSC(null);
    } catch (err) { setError(err.message); }
    setScSaving(false);
  };

  const deleteSC = async () => {
    const { error: err } = await supabase.from('subcommittees').delete().eq('id', deleteScTarget);
    if (err) { setError(err.message); setDeleteScTarget(null); return; }
    await fetchSubcommittees();
    setEditingSC(null);
    setDeleteScTarget(null);
  };

  const toggleSCMember = (memberId) => {
    setScForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter(id => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

// === Financial Account CRUD ===
  const openAcctModal = (acct = null) => {
    setError(null);
    if (acct) {
      setAcctForm({
        name: acct.name || '', notes: acct.notes || '',
        is_active: acct.is_active !== false, sort_order: acct.sort_order || 0,
      });
      setEditingAcct(acct.id);
    } else {
      const maxOrder = Math.max(0, ...orgAccounts.map(a => a.sort_order || 0));
      setAcctForm({ name: '', notes: '', is_active: true, sort_order: maxOrder + 1 });
      setEditingAcct('new');
    }
  };

  const saveAcct = async () => {
    if (!acctForm.name) { setError('Account name is required.'); return; }
    setAcctSaving(true); setError(null);
    try {
      const payload = {
        name: acctForm.name, notes: acctForm.notes || '',
        is_active: acctForm.is_active, sort_order: acctForm.sort_order,
      };
      if (editingAcct === 'new') {
        const { error: err } = await supabase.from('organization_accounts')
          .insert({ ...payload, organization_id: organization.id });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('organization_accounts')
          .update(payload).eq('id', editingAcct);
        if (err) throw err;
      }
      await fetchOrgAccounts();
      setEditingAcct(null);
    } catch (err) { setError(err.message); }
    setAcctSaving(false);
  };

  const deleteAcct = async () => {
    const { error: err } = await supabase.from('organization_accounts').delete().eq('id', deleteAcctTarget);
    if (err) { setError(err.message); setDeleteAcctTarget(null); return; }
    await fetchOrgAccounts();
    setEditingAcct(null);
    setDeleteAcctTarget(null);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Settings</h1>
        <p>Only administrators can access organization settings.</p>
      </div>
    );
  }

  const activeSCs = subcommittees.filter(s => s.is_active);
  const inactiveSCs = subcommittees.filter(s => !s.is_active);

  const logoAlign = LOGO_POSITIONS.find(p => p.value === form.logo_position)?.align || 'center';

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Organization Settings</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Manage your organization profile, branding, and configuration</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#059669', fontSize: 13, fontWeight: 500 }}>Saved!</span>}
          {error && <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>}
          {activeTab !== 'subcommittees' && activeTab !== 'accounts' && activeTab !== 'billing' && (
            <button onClick={handleSave} disabled={saving} style={{
              padding: '10px 24px', background: '#1e293b', color: 'white', border: 'none',
              borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving...' : 'Save Changes'}</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(null); }} style={{
            padding: '10px 20px', background: 'transparent', border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #1e293b' : '2px solid transparent',
            marginBottom: -2, fontSize: 14, cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? '#1e293b' : '#64748b',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* GENERAL */}
      {activeTab === 'general' && (
        <div style={{ maxWidth: 600 }}>
          <Card title="Organization Info">
            <Field label="Organization Name">
              <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} style={inp} />
            </Field>
            <Field label="Short Name (slug)" hint="Used in file naming. Contact support to change.">
              <input type="text" value={form.slug} disabled style={{ ...inp, background: '#f9fafb', color: '#94a3b8' }} />
            </Field>
            <Field label="Timezone">
              <select value={form.timezone} onChange={e => updateForm('timezone', e.target.value)} style={inp}>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/New_York">Eastern Time</option>
              </select>
            </Field>
            <Field label="Fiscal Year Start">
              <select value={form.fiscal_year_start} onChange={e => updateForm('fiscal_year_start', parseInt(e.target.value))} style={inp}>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </Field>
          </Card>
          <Card title="Default Roles">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Roles assigned to board members.</p>
            {form.default_roles.sort((a, b) => a.order - b.order).map((role, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 30, padding: '8px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{role.order}.</span>
                <input type="text" value={role.title} onChange={e => updateRole(i, 'title', e.target.value)} placeholder="Role title" style={{ ...inp, flex: 1 }} />
                <button onClick={() => removeRole(i)} style={delBtn}>×</button>
              </div>
            ))}
            <button onClick={addRole} style={addBtnStyle}>+ Add Role</button>
          </Card>
        </div>
      )}

      {/* BRANDING */}
      {activeTab === 'branding' && (
        <div style={{ maxWidth: 600 }}>
          <Card title="Logo">
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{
                width: 80, height: 80, border: '2px dashed #d1d5db', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                cursor: 'pointer', background: '#f9fafb',
              }} onClick={() => fileInputRef.current?.click()}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>Upload
                  </div>
                )}
              </div>
              <div>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                  borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#475569', marginBottom: 8,
                }}>{logoPreview ? 'Change Logo' : 'Upload Logo'}</button>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>PNG, JPG, or SVG. Max 2MB.</div>
                {logoPreview && (
                  <button onClick={() => { setLogoPreview(null); setLogoFile(null); setSaved(false); }} style={{
                    marginTop: 8, padding: '4px 10px', background: 'white', border: '1px solid #d1d5db',
                    borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#dc2626',
                  }}>Remove Logo</button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} style={{ display: 'none' }} />
            </div>
            {/* Logo Position Selector */}
            {logoPreview && (
              <div style={{ marginTop: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Logo Position on Documents</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {LOGO_POSITIONS.map(pos => (
                    <button
                      key={pos.value}
                      onClick={() => updateForm('logo_position', pos.value)}
                      style={{
                        flex: 1, padding: '10px 16px', borderRadius: 6, cursor: 'pointer',
                        fontSize: 13, fontWeight: 500, transition: 'all 0.15s ease',
                        background: form.logo_position === pos.value ? '#1e293b' : '#f8fafc',
                        color: form.logo_position === pos.value ? 'white' : '#475569',
                        border: form.logo_position === pos.value ? '1.5px solid #1e293b' : '1.5px solid #e2e8f0',
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>Controls where the logo appears on PDFs, the preview tab, and emails.</div>
              </div>
            )}
          </Card>
          <Card title="Colors">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Used in navigation, buttons, and PDF exports.</p>
            <div className="goto-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[{ f: 'primary_color', l: 'Primary Color', h: 'Navigation bar, headers' },
                { f: 'accent_color', l: 'Accent Color', h: 'Buttons, highlights' }].map(c => (
                <div key={c.f}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{c.l}</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form[c.f]} onChange={e => updateForm(c.f, e.target.value)} style={{ width: 40, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }} />
                    <input type="text" value={form[c.f]} onChange={e => updateForm(c.f, e.target.value)} style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{c.h}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Preview">
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>How your branding will appear on documents:</div>
            {/* Document-style preview */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: logoAlign, marginBottom: 12 }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="" style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 48, height: 48, background: form.accent_color || '#dc2626', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700 }}>
                    {form.name?.substring(0, 2).toUpperCase() || 'GO'}
                  </div>
                )}
              </div>
              <div style={{ textAlign: form.logo_position || 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Board Meeting Minutes</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{form.name || 'Organization Name'}</div>
              </div>
            </div>
            {/* Nav-style preview */}
            <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Navigation bar preview:</div>
            <div style={{ background: form.primary_color, borderRadius: 8, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {logoPreview ? (
                <img src={logoPreview} alt="" style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4 }} />
              ) : (
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                  {form.name?.substring(0, 2).toUpperCase() || 'GO'}
                </div>
              )}
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{form.name || 'Organization'}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Records Management</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SUBCOMMITTEES */}
      {activeTab === 'subcommittees' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1e293b' }}>Subcommittees</h2>
            <button onClick={() => openSCModal()} style={{
              padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none',
              borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>+ New Subcommittee</button>
          </div>

          {activeSCs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 10 }}>Active ({activeSCs.length})</div>
              {activeSCs.map(sc => (
                <div key={sc.id} onClick={() => openSCModal(sc)} style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
                  marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{sc.name}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Chair: {sc.chair?.full_name || 'Not assigned'}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{(sc.subcommittee_members || []).length} member{(sc.subcommittee_members || []).length !== 1 ? 's' : ''}</div>
                    {sc.description && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sc.description}</div>}
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>Edit →</span>
                </div>
              ))}
            </div>
          )}

          {inactiveSCs.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Inactive ({inactiveSCs.length})</div>
              {inactiveSCs.map(sc => (
                <div key={sc.id} onClick={() => openSCModal(sc)} style={{
                  background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
                  marginBottom: 8, cursor: 'pointer', opacity: 0.7,
                }}>
                  <div style={{ fontWeight: 600 }}>{sc.name}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Chair: {sc.chair?.full_name || 'Not assigned'} · {(sc.subcommittee_members || []).length} members</div>
                </div>
              ))}
            </div>
          )}

          {subcommittees.length === 0 && (
            <div style={{ padding: 48, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
              No subcommittees yet. Create one to get started.
            </div>
          )}
        </div>
      )}

{/* FINANCIAL ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1e293b' }}>Financial Accounts</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Define accounts reported on during meetings (e.g., Checking, Investment, PAC Fund).</p>
            </div>
            <button onClick={() => openAcctModal()} style={{
              padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none',
              borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>+ New Account</button>
          </div>

          {orgAccounts.filter(a => a.is_active).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 10 }}>Active ({orgAccounts.filter(a => a.is_active).length})</div>
              {orgAccounts.filter(a => a.is_active).map(acct => (
                <div key={acct.id} onClick={() => openAcctModal(acct)} style={{
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
                  marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{acct.name}</div>
                    {acct.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{acct.notes}</div>}
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>Edit →</span>
                </div>
              ))}
            </div>
          )}

          {orgAccounts.filter(a => !a.is_active).length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Inactive ({orgAccounts.filter(a => !a.is_active).length})</div>
              {orgAccounts.filter(a => !a.is_active).map(acct => (
                <div key={acct.id} onClick={() => openAcctModal(acct)} style={{
                  background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16,
                  marginBottom: 8, cursor: 'pointer', opacity: 0.7,
                }}>
                  <div style={{ fontWeight: 600 }}>{acct.name}</div>
                  {acct.notes && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{acct.notes}</div>}
                </div>
              ))}
            </div>
          )}

          {orgAccounts.length === 0 && (
            <div style={{ padding: 48, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 15, marginBottom: 8 }}>No financial accounts defined yet.</div>
              <div style={{ fontSize: 13 }}>Create accounts like "Checking" or "Investment" to use in meeting minutes.</div>
            </div>
          )}
        </div>
      )}

      {/* MEETING TYPES */}
      {activeTab === 'meetings' && (
        <div style={{ maxWidth: 600 }}>
          <Card title="Meeting Types">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Standard meeting types for minutes and agendas.</p>
            <div style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
              {['Board', 'Annual', 'Subcommittee'].map(type => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: 11 }}>&#10003;</span>
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{type}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', background: '#e2e8f0', borderRadius: 10, color: '#64748b' }}>Default</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>Custom meeting types coming in a future update.</p>
          </Card>
        </div>
      )}
{/* BILLING */}
      {activeTab === 'billing' && (
        <BillingTab organization={organization} supabase={supabase} />
      )}
      {/* SUBCOMMITTEE MODAL */}
      {editingSC && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditingSC(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#1e293b' }}>
              {editingSC === 'new' ? 'Create' : 'Edit'} Subcommittee
            </h2>

            <Field label="Name *">
              <input type="text" value={scForm.name} onChange={e => setScForm({ ...scForm, name: e.target.value })} placeholder="Subcommittee name" style={inp} />
            </Field>

            <Field label="Chair">
              <select value={scForm.chair_id} onChange={e => {
                const cid = e.target.value;
                setScForm(prev => ({
                  ...prev, chair_id: cid,
                  memberIds: cid && !prev.memberIds.includes(cid) ? [...prev.memberIds, cid] : prev.memberIds,
                }));
              }} style={inp}>
                <option value="">Select chair...</option>
                {allMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </Field>

            <Field label="Members">
              <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                {allMembers.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No members found. Invite members first.</div>
                ) : allMembers.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, cursor: 'pointer', opacity: m.id === scForm.chair_id ? 0.6 : 1 }}>
                    <input type="checkbox" checked={scForm.memberIds.includes(m.id)} onChange={() => toggleSCMember(m.id)} disabled={m.id === scForm.chair_id} style={{ accentColor: '#059669' }} />
                    <span style={{ fontSize: 14 }}>{m.full_name}</span>
                    {m.id === scForm.chair_id && <span style={{ fontSize: 11, color: '#64748b' }}>(Chair)</span>}
                    {m.board_position && <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 6px', background: '#f1f5f9', borderRadius: 8, color: '#64748b' }}>{m.board_position}</span>}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Description">
              <textarea value={scForm.description} onChange={e => setScForm({ ...scForm, description: e.target.value })} placeholder="Optional description..." style={{ ...inp, minHeight: 60, resize: 'vertical' }} />
            </Field>

            <Field label="Status">
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" checked={scForm.is_active} onChange={() => setScForm({ ...scForm, is_active: true })} style={{ accentColor: '#059669' }} />
                  <span>Active</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" checked={!scForm.is_active} onChange={() => setScForm({ ...scForm, is_active: false })} style={{ accentColor: '#64748b' }} />
                  <span>Inactive</span>
                </label>
              </div>
            </Field>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <div>
                {editingSC !== 'new' && (
                  <button onClick={() => setDeleteScTarget(editingSC)} style={{
                    padding: '10px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  }}>Delete</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditingSC(null)} style={{
                  padding: '10px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                }}>Cancel</button>
                <button onClick={saveSC} disabled={scSaving || !scForm.name} style={{
                  padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none',
                  borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: scSaving || !scForm.name ? 0.5 : 1,
                }}>{scSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT MODAL */}
      {editingAcct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditingAcct(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#1e293b' }}>
              {editingAcct === 'new' ? 'Create' : 'Edit'} Financial Account
            </h2>

            <Field label="Account Name *" hint="e.g., Checking, Investment, PAC Fund">
              <input type="text" value={acctForm.name} onChange={e => setAcctForm({ ...acctForm, name: e.target.value })} placeholder="Account name" style={inp} />
            </Field>

            <Field label="Notes" hint="Who has access, account number last 4 digits, signing authority, etc.">
              <textarea value={acctForm.notes} onChange={e => setAcctForm({ ...acctForm, notes: e.target.value })} placeholder="Optional notes about this account..." style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
            </Field>

            <Field label="Display Order" hint="Lower numbers appear first in the dropdown.">
              <input type="number" value={acctForm.sort_order} onChange={e => setAcctForm({ ...acctForm, sort_order: parseInt(e.target.value) || 0 })} style={{ ...inp, maxWidth: 100 }} />
            </Field>

            <Field label="Status">
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" checked={acctForm.is_active} onChange={() => setAcctForm({ ...acctForm, is_active: true })} style={{ accentColor: '#059669' }} />
                  <span>Active</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="radio" checked={!acctForm.is_active} onChange={() => setAcctForm({ ...acctForm, is_active: false })} style={{ accentColor: '#64748b' }} />
                  <span>Inactive</span>
                </label>
              </div>
            </Field>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <div>
                {editingAcct !== 'new' && (
                  <button onClick={() => setDeleteAcctTarget(editingAcct)} style={{
                    padding: '10px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                    borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  }}>Delete</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditingAcct(null)} style={{
                  padding: '10px 20px', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                }}>Cancel</button>
                <button onClick={saveAcct} disabled={acctSaving || !acctForm.name} style={{
                  padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none',
                  borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: acctSaving || !acctForm.name ? 0.5 : 1,
                }}>{acctSaving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteScTarget}
        onClose={() => setDeleteScTarget(null)}
        onConfirm={deleteSC}
        title="Delete Subcommittee"
        message="This will permanently delete this subcommittee and remove all member assignments. Minutes referencing this subcommittee will keep their data."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={!!deleteAcctTarget}
        onClose={() => setDeleteAcctTarget(null)}
        onConfirm={deleteAcct}
        title="Delete Financial Account"
        message="This will permanently delete this account definition. Existing minutes that reference it will keep their data."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const addBtnStyle = { padding: '6px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 };
const delBtn = { padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

function Card({ title, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 20 }}>
      {title && <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>{title}</h3>}
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function BillingTab({ organization, supabase }) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState(null);

  const SUPABASE_FUNCTIONS_URL = 'https://qacoauhyahswkluayxhm.supabase.co/functions/v1';

  const handlePortal = async () => {
    setPortalError(null);
    setLoadingPortal(true);
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
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal');
      window.location.href = data.url;
    } catch (err) {
      setPortalError(err.message);
    } finally {
      setLoadingPortal(false);
    }
  };

  if (!organization) return null;

  const { is_permanently_comped, subscription_status, trial_ends_at, stripe_customer_id } = organization;

  const daysRemaining = trial_ends_at
    ? Math.max(0, Math.ceil((new Date(trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const statusLabel = {
    comped:    { text: 'Complimentary — no charge', color: '#166534', bg: '#dcfce7' },
    active:    { text: 'Active', color: '#166534', bg: '#dcfce7' },
    trialing:  { text: daysRemaining > 0 ? `Free trial — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` : 'Trial expired', color: daysRemaining > 0 ? '#92400E' : '#9B1C1C', bg: daysRemaining > 0 ? '#fef3c7' : '#fee2e2' },
    past_due:  { text: 'Past due — payment required', color: '#9B1C1C', bg: '#fee2e2' },
    canceled:  { text: 'Canceled', color: '#9B1C1C', bg: '#fee2e2' },
  }[subscription_status] || { text: subscription_status, color: '#64748b', bg: '#f1f5f9' };

  return (
    <div style={{ maxWidth: 560 }}>
      <Card title="Subscription">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Current status</div>
          <span style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, background: statusLabel.bg, color: statusLabel.color,
          }}>
            {statusLabel.text}
          </span>
        </div>

        {is_permanently_comped ? (
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            This organization is a founding partner and has complimentary access. No billing required.
          </p>
        ) : subscription_status === 'active' && stripe_customer_id ? (
          <div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Manage your payment method, view invoices, or cancel your subscription through the billing portal.
            </p>
            {portalError && (
              <div style={{ fontSize: 13, color: '#9B1C1C', background: '#fee2e2', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
                {portalError}
              </div>
            )}
            <button onClick={handlePortal} disabled={loadingPortal} style={{
              padding: '10px 20px', background: '#105040', color: 'white',
              border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
              cursor: loadingPortal ? 'wait' : 'pointer', opacity: loadingPortal ? 0.7 : 1,
            }}>
              {loadingPortal ? 'Opening portal…' : 'Manage Billing →'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {subscription_status === 'trialing' && daysRemaining > 0
                ? 'Subscribe before your trial ends to keep access to your minutes and records.'
                : 'Your trial has ended. Subscribe to restore access.'}
            </p>
            <a href="/billing" style={{
              display: 'inline-block', padding: '10px 20px', background: '#105040',
              color: 'white', borderRadius: 6, fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
            }}>
              View Plans →
            </a>
          </div>
        )}
      </Card>

      <Card title="Plan Details">
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
          <div>All plans include unlimited users, unlimited minutes, PDF export, and email distribution.</div>
          <div style={{ marginTop: 8 }}>
            Questions about your plan?{' '}
            <a href="mailto:christine@riverhousedairy.com" style={{ color: '#105040' }}>
              Contact support
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
