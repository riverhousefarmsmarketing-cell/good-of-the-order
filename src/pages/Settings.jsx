import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useOrganization } from '../hooks/useOrganization.jsx';
import { supabase } from '../lib/supabase';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'meetings', label: 'Meeting Types' },
];

export default function SettingsPage() {
  const { profile, isAdmin } = useAuth();
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    timezone: '',
    fiscal_year_start: 1,
    primary_color: '#1e3a5f',
    accent_color: '#dc2626',
    default_roles: [],
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || '',
        slug: organization.slug || '',
        timezone: organization.timezone || 'America/Los_Angeles',
        fiscal_year_start: organization.fiscal_year_start || 1,
        primary_color: organization.primary_color || '#1e3a5f',
        accent_color: organization.accent_color || '#dc2626',
        default_roles: organization.default_roles || [
          { title: 'President', order: 1 },
          { title: 'Vice President', order: 2 },
          { title: 'Secretary', order: 3 },
          { title: 'Treasurer', order: 4 },
          { title: 'Board Member', order: 5 },
        ],
      });
      setLogoPreview(organization.logo_url);
    }
  }, [organization]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      let logoUrl = organization?.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${organization.id}/logo.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('org-assets')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('org-assets')
          .getPublicUrl(filePath);

        logoUrl = urlData.publicUrl;
      }

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name: form.name,
          timezone: form.timezone,
          fiscal_year_start: form.fiscal_year_start,
          primary_color: form.primary_color,
          accent_color: form.accent_color,
          default_roles: form.default_roles,
          logo_url: logoUrl,
        })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setSaved(true);
      setLogoFile(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addRole = () => {
    const maxOrder = Math.max(0, ...form.default_roles.map((r) => r.order));
    updateForm('default_roles', [...form.default_roles, { title: '', order: maxOrder + 1 }]);
  };

  const updateRole = (index, field, value) => {
    const updated = [...form.default_roles];
    updated[index] = { ...updated[index], [field]: value };
    updateForm('default_roles', updated);
  };

  const removeRole = (index) => {
    updateForm('default_roles', form.default_roles.filter((_, i) => i !== index));
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Settings</h1>
        <p>Only administrators can access organization settings.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Organization Settings</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Manage your organization's profile, branding, and configuration
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#059669', fontSize: 13, fontWeight: 500 }}>Saved!</span>}
          {error && <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', background: '#1e293b', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14,
              cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #1e293b' : '2px solid transparent',
              marginBottom: -2, fontSize: 14, cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#1e293b' : '#64748b',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div style={{ maxWidth: 600 }}>
          <Card title="Organization Info">
            <Field label="Organization Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Short Name (slug)" hint="Used in file naming. Cannot be changed after creation.">
              <input
                type="text"
                value={form.slug}
                disabled
                style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }}
              />
            </Field>
            <Field label="Timezone">
              <select
                value={form.timezone}
                onChange={(e) => updateForm('timezone', e.target.value)}
                style={inputStyle}
              >
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Anchorage">Alaska Time</option>
                <option value="Pacific/Honolulu">Hawaii Time</option>
              </select>
            </Field>
            <Field label="Fiscal Year Start">
              <select
                value={form.fiscal_year_start}
                onChange={(e) => updateForm('fiscal_year_start', parseInt(e.target.value))}
                style={inputStyle}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </Field>
          </Card>

          <Card title="Board Positions">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Define the positions available for your board members. These appear in member profiles and minutes.
            </p>
            {form.default_roles.map((role, index) => (
              <div key={index} style={{
                display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: '#94a3b8', width: 24, textAlign: 'center' }}>
                  {role.order}
                </span>
                <input
                  type="text"
                  value={role.title}
                  onChange={(e) => updateRole(index, 'title', e.target.value)}
                  placeholder="Position title"
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <button
                  onClick={() => removeRole(index)}
                  style={{
                    padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#dc2626',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addRole}
              style={{
                marginTop: 8, padding: '8px 14px', background: '#f1f5f9',
                border: '1px solid #e2e8f0', borderRadius: 6,
                fontSize: 13, cursor: 'pointer', color: '#475569',
              }}
            >
              + Add Position
            </button>
          </Card>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div style={{ maxWidth: 600 }}>
          <Card title="Logo">
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 100, height: 100, borderRadius: 8,
                  border: '2px dashed #d1d5db', background: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
                    Upload
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#475569', marginBottom: 8,
                  }}
                >
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </button>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  PNG, JPG, or SVG. Max 2MB. Square recommended.
                </div>
                {logoPreview && (
                  <button
                    onClick={() => { setLogoPreview(null); setLogoFile(null); setSaved(false); }}
                    style={{
                      marginTop: 8, padding: '4px 10px', background: 'white',
                      border: '1px solid #d1d5db', borderRadius: 4,
                      fontSize: 12, cursor: 'pointer', color: '#dc2626',
                    }}
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                style={{ display: 'none' }}
              />
            </div>
          </Card>

          <Card title="Colors">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              These colors are used in your navigation bar, buttons, and PDF exports.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Primary Color
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => updateForm('primary_color', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => updateForm('primary_color', e.target.value)}
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Navigation bar, headers</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Accent Color
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => updateForm('accent_color', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={form.accent_color}
                    onChange={(e) => updateForm('accent_color', e.target.value)}
                    style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                  />
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Buttons, highlights</div>
              </div>
            </div>
          </Card>

          <Card title="Preview">
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              This is how your branding will appear in the navigation:
            </div>
            <div style={{
              background: form.primary_color, borderRadius: 8, padding: '12px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="" style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4 }} />
              ) : (
                <div style={{
                  width: 32, height: 32, background: 'rgba(255,255,255,0.15)',
                  borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 12, fontWeight: 700,
                }}>
                  {form.name?.substring(0, 2).toUpperCase() || 'GO'}
                </div>
              )}
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{form.name || 'Organization'}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Records Management</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Dashboard</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Minutes</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Agendas</span>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <div style={{
                padding: '8px 16px', background: form.accent_color, color: 'white',
                borderRadius: 6, fontSize: 13, fontWeight: 600,
              }}>
                Sample Button
              </div>
              <div style={{
                padding: '8px 16px', background: 'white', border: `1px solid ${form.accent_color}`,
                color: form.accent_color, borderRadius: 6, fontSize: 13, fontWeight: 500,
              }}>
                Outline Button
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Meeting Types Tab */}
      {activeTab === 'meetings' && (
        <div style={{ maxWidth: 600 }}>
          <Card title="Meeting Types">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Standard meeting types available when creating minutes and agendas.
            </p>
            <div style={{
              padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
            }}>
              {['Board', 'Annual', 'Subcommittee'].map((type) => (
                <div key={type} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, background: '#1e293b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: 'white', fontSize: 11 }}>&#10003;</span>
                  </div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{type}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, padding: '2px 8px',
                    background: '#e2e8f0', borderRadius: 10, color: '#64748b',
                  }}>
                    Default
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
              Custom meeting types will be available in a future update.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

// Reusable components
const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
};

function Card({ title, children }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 24, marginBottom: 20,
    }}>
      {title && (
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
