import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useMinutes } from '../hooks/useMinutes.jsx';
import { useMembers } from '../hooks/useMembers.jsx';
import { useOrganization } from '../hooks/useOrganization.jsx';
import { supabase } from '../lib/supabase';
import SendEmailModal from '../components/email/SendEmailModal.jsx';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/Modal';
import { downloadMinutesPDF } from '../utils/generateMinutesPDF';

const MEETING_TYPES = [
  { value: 'BOARD', label: 'Board' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SUBCOMMITTEE', label: 'Subcommittee' },
];

const QUORUM_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'not_present', label: 'Not Present' },
  { value: 'not_recorded', label: 'Not Recorded' },
];

const emptyMotion = { text: '', movedBy: '', secondedBy: '', decision: '', vote: '' };

function genTempId() { return '_tmp_' + Math.random().toString(36).substr(2, 8); }

export default function MinutesEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { fetchFullMinutes, saveMinutes, deleteMinutes } = useMinutes();
  const { members } = useMembers();
  const { organization } = useOrganization();
  const [activeTab, setActiveTab] = useState('meeting-info');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [upcomingDbEvents, setUpcomingDbEvents] = useState([]);
  const [linkedEvents, setLinkedEvents] = useState([]);
  const [subcommittees, setSubcommittees] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [distributionLogs, setDistributionLogs] = useState([]);

const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isNew = !id;

  // Fetch subcommittees for the dropdown
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('subcommittees').select('id, name, is_active')
      .eq('organization_id', profile.organization_id).eq('is_active', true).order('name')
      .then(({ data }) => setSubcommittees(data || []));
  }, [profile?.organization_id]);

  useEffect(() => {
    if (isNew) {
      setDraft({
        meeting_type: 'BOARD',
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_time: '', location: '', status: 'draft',
        facilitator_id: null, recorder_id: null,
        time_called_to_order: '', time_adjourned: '',
        invocation: '', pledge_recited: true, quorum: 'present', guests: '',
        agenda_changes: '', agenda_approval_motion: emptyMotion, agenda_no_motion: false,
        previous_meeting_dates: '', minutes_approval_motion: emptyMotion, minutes_no_motion: false,
        total_donations_ytd: '', donations_since_last_meeting: '', current_account_balance: '',
        accounts: [],
        financial_report_motion: emptyMotion, financial_no_motion: false,
        correspondence: '',
        presidents_report: '', presidents_report_motion: emptyMotion, presidents_report_no_motion: true,
        member_services_report: '', member_services_motion: emptyMotion, member_services_no_motion: true,
        state_board_report: '', state_board_motion: emptyMotion, state_board_no_motion: true,
        membership_committee: '', new_members: '', membership_motion: emptyMotion, membership_no_motion: true,
        pac_committee: '', pac_motion: emptyMotion, pac_no_motion: true,
        nomination_committee: '', nomination_motion: emptyMotion, nomination_no_motion: true,
        policy_committee: '', policy_motion: emptyMotion, policy_no_motion: true,
        good_of_the_order: '',
        adjournment_motion: emptyMotion, adjournment_no_motion: true,
        attendance: [],
        businessItems: [],
        actionItems: [],
        financialItems: [],
        upcomingEvents: [],
      });
    } else {
      fetchFullMinutes(id).then(data => {
        if (!data) { navigate('/minutes'); return; }
        // Normalize motions from JSONB
        const motionFields = [
          'agenda_approval_motion', 'minutes_approval_motion', 'financial_report_motion',
          'presidents_report_motion', 'member_services_motion', 'state_board_motion',
          'membership_motion', 'pac_motion', 'nomination_motion', 'policy_motion', 'adjournment_motion',
        ];
        motionFields.forEach(f => { if (!data[f]) data[f] = { ...emptyMotion }; });
        setDraft(data);
      });
    }
  }, [id, isNew, fetchFullMinutes, navigate]);

  // Fetch next 6 upcoming events + events linked to this minutes
  useEffect(() => {
    if (!draft) return;
    const today = new Date().toISOString().split('T')[0];

    // Board meetings: show ALL next 6 upcoming events
    // Subcommittee meetings: show next 6 events for THAT subcommittee
    let query = supabase
      .from('events')
      .select('id, name, date, time, location, subcommittee_id, subcommittees(name)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(6);

    if (draft.meeting_type === 'SUBCOMMITTEE' && draft.subcommittee_id) {
      query = query.eq('subcommittee_id', draft.subcommittee_id);
    }

    query.then(({ data }) => setUpcomingDbEvents(data || []));

    // Events created from this minutes record
    if (draft.id && !draft.id.startsWith('_tmp_')) {
      supabase
        .from('events')
        .select('id, name, date, time, location')
        .eq('source_minutes_id', draft.id)
        .order('date', { ascending: true })
        .then(({ data }) => setLinkedEvents(data || []));
    }
  }, [draft?.id, draft?.meeting_type]);

  // Fetch distribution logs for PDF export
  useEffect(() => {
    if (!draft?.id || draft.id.startsWith('_tmp_')) return;
    supabase
      .from('distribution_logs')
      .select('id, sent_at, recipient_emails, email_subject, sent_by, profiles!distribution_logs_sent_by_fkey(full_name)')
      .eq('document_type', 'minutes')
      .eq('document_id', draft.id)
      .order('sent_at', { ascending: false })
      .then(({ data }) => {
        setDistributionLogs((data || []).map(d => ({
          ...d,
          sent_by_profile: d.profiles || null,
        })));
      });
  }, [draft?.id, showSendModal]);

  if (!draft) return <div style={{ padding: 32, color: '#64748b' }}>Loading...</div>;

  const u = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  const handleSave = async (status) => {
    setSaving(true);
    setErrors([]);
    try {
      const newId = await saveMinutes({ ...draft, status: status || draft.status });
      if (isNew) navigate(`/minutes/${newId}`, { replace: true });
    } catch (err) {
      toast.error(`Save failed: ${err.message || 'Please try again.'}`);
    } finally { setSaving(false); }
  };

  const handleFinalize = async () => {
    const errs = [];
    if (!draft.meeting_date) errs.push('Meeting Date');
    if (!draft.meeting_time) errs.push('Meeting Time');
    if (!draft.location) errs.push('Location');
    if (!draft.facilitator_id) errs.push('Facilitator');
    if (!draft.recorder_id) errs.push('Recorder');
    if (draft.attendance.filter(a => a.status === 'present').length === 0) errs.push('At least one present member');
    if (errs.length > 0) { setErrors(errs); setActiveTab('meeting-info'); return; }
    await handleSave('approved');
  };

  const handleDelete = async () => {
    await deleteMinutes(draft.id);
    navigate('/minutes');
  };

  // Attendance helpers
  const setAttendance = (memberId, status) => {
    const existing = draft.attendance.filter(a => a.member_id !== memberId);
    u('attendance', [...existing, { member_id: memberId, status }]);
  };
  const getAttStatus = (memberId) => draft.attendance.find(a => a.member_id === memberId)?.status || '';

  const fmtMember = (memberId) => {
    const m = members.find(x => x.id === memberId);
    return m ? `${m.full_name}${m.board_position ? ' — ' + m.board_position : ''}` : '';
  };

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '[Not provided]';

  const isSC = draft.meeting_type === 'SUBCOMMITTEE';

  const tabs = [
    { id: 'meeting-info', label: 'Meeting Info' },
    { id: 'attendance', label: 'Attendance' },
    ...(isSC ? [] : [{ id: 'financial', label: 'Financial' }]),
    ...(isSC ? [] : [{ id: 'reports', label: 'Reports' }]),
    { id: 'business', label: 'Business' },
    { id: 'preview', label: 'Preview' },
  ];

  return (
    <div style={{ background: '#f8fafc', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {!isNew && <button onClick={() => navigate('/minutes')} style={{ padding: '7px 14px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>← Back</button>}
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1e293b' }}>{isNew ? 'New Meeting Minutes' : 'Edit Minutes'}</h1>
          <span style={{
            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
            background: draft.status === 'approved' ? '#dcfce7' : '#fef3c7',
            color: draft.status === 'approved' ? '#166534' : '#92400e',
          }}>{draft.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!isNew && <button onClick={() => setShowDeleteConfirm(true)} disabled={saving} style={{ padding: '8px 16px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: 13 }}>Delete</button>}
          <button onClick={() => handleSave()} disabled={saving} style={{ padding: '8px 18px', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {draft.status !== 'approved' && (
            <button onClick={handleFinalize} disabled={saving} style={{ padding: '8px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: 13 }}>Finalize</button>
          )}
          {draft.status === 'approved' && !isNew && (
            <>
              <button onClick={() => downloadMinutesPDF(draft, members, organization, distributionLogs)} disabled={saving} style={{ padding: '8px 18px', background: '#475569', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: 13 }}>📄 PDF</button>
              <button onClick={() => setShowSendModal(true)} disabled={saving} style={{ padding: '8px 18px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: 13 }}>✉ Send</button>
            </>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ maxWidth: 900, margin: '12px auto 0', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
          Missing required fields: {errors.join(', ')}
        </div>
      )}

      {/* Tabs */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 0 0' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
              borderBottom: activeTab === tab.id ? '2px solid #1e293b' : '2px solid transparent', marginBottom: -2,
              color: activeTab === tab.id ? '#1e293b' : '#64748b', fontWeight: activeTab === tab.id ? 600 : 400,
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 0 40px' }}>

        {/* ===== MEETING INFO ===== */}
        {activeTab === 'meeting-info' && (
          <>
            <Card title="Basic Information">
              <Row>
                <Field label="Meeting Type *">
                  <select value={draft.meeting_type} onChange={e => {
                    const newType = e.target.value;
                    u('meeting_type', newType);
                    // Reset to safe tab if current tab is board-only
                    if (newType === 'SUBCOMMITTEE' && (activeTab === 'financial' || activeTab === 'reports')) {
                      setActiveTab('meeting-info');
                    }
                    if (newType !== 'SUBCOMMITTEE') u('subcommittee_id', null);
                  }} style={sel}>
                    {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Meeting Date *">
                  <input type="date" value={draft.meeting_date || ''} onChange={e => u('meeting_date', e.target.value)} style={inp} />
                </Field>
              </Row>
              {isSC && (
                <Field label="Subcommittee *">
                  <select value={draft.subcommittee_id || ''} onChange={e => u('subcommittee_id', e.target.value || null)} style={sel}>
                    <option value="">Select subcommittee...</option>
                    {subcommittees.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              )}
              <Row>
                <Field label="Meeting Time *">
                  <input type="text" value={draft.meeting_time || ''} onChange={e => u('meeting_time', e.target.value)} placeholder="e.g., 7:00 PM" style={inp} />
                </Field>
                <Field label="Location *">
                  <input type="text" value={draft.location || ''} onChange={e => u('location', e.target.value)} placeholder="Meeting location" style={inp} />
                </Field>
              </Row>
              <Row>
                <Field label={isSC ? 'Chair *' : 'Facilitator/President *'}>
                  <select value={draft.facilitator_id || ''} onChange={e => u('facilitator_id', e.target.value || null)} style={sel}>
                    <option value="">Select...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{fmtMember(m.id)}</option>)}
                  </select>
                </Field>
                <Field label="Recorder/Secretary *">
                  <select value={draft.recorder_id || ''} onChange={e => u('recorder_id', e.target.value || null)} style={sel}>
                    <option value="">Select...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{fmtMember(m.id)}</option>)}
                  </select>
                </Field>
              </Row>
              <Row>
                <Field label="Time Called to Order">
                  <input type="text" value={draft.time_called_to_order || ''} onChange={e => u('time_called_to_order', e.target.value)} placeholder="e.g., 7:05 PM" style={inp} />
                </Field>
                <Field label="Time Adjourned">
                  <input type="text" value={draft.time_adjourned || ''} onChange={e => u('time_adjourned', e.target.value)} placeholder="e.g., 8:30 PM" style={inp} />
                </Field>
              </Row>
              {!isSC && (
                <>
                  <Field label="Invocation">
                    <textarea value={draft.invocation || ''} onChange={e => u('invocation', e.target.value)} placeholder="Invocation text or 'Invocation was given.'" style={ta} />
                  </Field>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                    <input type="checkbox" checked={draft.pledge_recited} onChange={e => u('pledge_recited', e.target.checked)} />
                    <span style={{ fontSize: 14, color: '#374151' }}>Pledge of Allegiance was recited</span>
                  </label>
                </>
              )}
            </Card>

            <Card title="Agenda & Previous Minutes">
              <Field label="Agenda Changes">
                <textarea value={draft.agenda_changes || ''} onChange={e => u('agenda_changes', e.target.value)} placeholder="List any changes or write 'None'" style={ta} />
              </Field>
              <MotionBlock label="Agenda Approval Motion" motion={draft.agenda_approval_motion} onChange={m => u('agenda_approval_motion', m)} noMotion={draft.agenda_no_motion} onNoMotionChange={v => u('agenda_no_motion', v)} />
              <Field label="Previous Meeting Date(s)" style={{ marginTop: 20 }}>
                <input type="text" value={draft.previous_meeting_dates || ''} onChange={e => u('previous_meeting_dates', e.target.value)} placeholder="Date(s)" style={inp} />
              </Field>
              <MotionBlock label="Minutes Approval Motion" motion={draft.minutes_approval_motion} onChange={m => u('minutes_approval_motion', m)} noMotion={draft.minutes_no_motion} onNoMotionChange={v => u('minutes_no_motion', v)} />
            </Card>
          </>
        )}

        {/* ===== ATTENDANCE ===== */}
        {activeTab === 'attendance' && (
          <Card title="Attendance">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Mark Attendance</div>
              {members.filter(m => m.is_active).map(m => {
                const st = getAttStatus(m.id);
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ flex: 1, fontSize: 14 }}>{m.full_name}{m.board_position ? ` — ${m.board_position}` : ''}</span>
                    {['present', 'absent', 'excused'].map(s => (
                      <button key={s} onClick={() => setAttendance(m.id, s)} style={{
                        padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500,
                        background: st === s ? (s === 'present' ? '#dcfce7' : s === 'absent' ? '#fef2f2' : '#fef3c7') : '#f8fafc',
                        border: st === s ? `1px solid ${s === 'present' ? '#86efac' : s === 'absent' ? '#fecaca' : '#fde68a'}` : '1px solid #e2e8f0',
                        color: st === s ? (s === 'present' ? '#166534' : s === 'absent' ? '#dc2626' : '#92400e') : '#64748b',
                      }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                    ))}
                  </div>
                );
              })}
            </div>
            <Field label="Guests">
              <textarea value={draft.guests || ''} onChange={e => u('guests', e.target.value)} placeholder="List any guests" style={ta} />
            </Field>
            <Field label="Quorum Status *">
              <select value={draft.quorum} onChange={e => u('quorum', e.target.value)} style={{ ...sel, maxWidth: 300 }}>
                {QUORUM_OPTIONS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </Field>
          </Card>
        )}

        {/* ===== FINANCIAL ===== */}
        {activeTab === 'financial' && (
          <Card title="Financial Summary">
            <Row>
              <Field label="Total Donations (YTD)">
                <input type="text" value={draft.total_donations_ytd || ''} onChange={e => u('total_donations_ytd', e.target.value)} placeholder="0.00" style={inp} />
              </Field>
              <Field label="Donations Since Last Meeting">
                <input type="text" value={draft.donations_since_last_meeting || ''} onChange={e => u('donations_since_last_meeting', e.target.value)} placeholder="0.00" style={inp} />
              </Field>
            </Row>

            {/* Multi-Account Balances */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Account Balances</span>
                <button onClick={() => u('accounts', [...(draft.accounts || []), { _id: genTempId(), name: '', balance: '' }])} style={addBtn}>+ Add Account</button>
              </div>
              {(draft.accounts || []).length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#f9fafb', borderRadius: 6 }}>No accounts added. Click "+ Add Account" to track account balances.</div>
              ) : (
                (draft.accounts || []).map((acct, i) => (
                  <div key={acct.id || acct._id || i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="text" value={acct.name} onChange={e => { const a = [...draft.accounts]; a[i] = { ...a[i], name: e.target.value }; u('accounts', a); }} placeholder="Account name (e.g., Checking, Savings, PAC)" style={{ ...inp, flex: 1 }} />
                    <input type="text" value={acct.balance} onChange={e => { const a = [...draft.accounts]; a[i] = { ...a[i], balance: e.target.value }; u('accounts', a); }} placeholder="Balance" style={{ ...inp, width: 140 }} />
                    <button onClick={() => u('accounts', draft.accounts.filter((_, idx) => idx !== i))} style={delBtn}>×</button>
                  </div>
                ))
              )}
              {(draft.accounts || []).length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748b', textAlign: 'right' }}>
                  Total: ${(draft.accounts || []).reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0).toFixed(2)}
                </div>
              )}
            </div>

            {/* Legacy single balance field for backward compat */}
            {draft.current_account_balance && !(draft.accounts || []).length && (
              <Field label="Current Account Balance (Legacy)" style={{ marginTop: 16 }}>
                <input type="text" value={draft.current_account_balance || ''} onChange={e => u('current_account_balance', e.target.value)} placeholder="0.00" style={inp} />
              </Field>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Fundraising Events</span>
                <button onClick={() => u('financialItems', [...draft.financialItems, { _id: genTempId(), item_type: 'fundraising', description: '', amount: '' }])} style={addBtn}>+ Add</button>
              </div>
              {draft.financialItems.filter(f => f.item_type === 'fundraising').map((f, i) => (
                <div key={f.id || f._id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={f.description} onChange={e => { const items = [...draft.financialItems]; const idx = items.indexOf(f); items[idx] = { ...f, description: e.target.value }; u('financialItems', items); }} placeholder="Event name" style={{ ...inp, flex: 1 }} />
                  <input type="text" value={f.amount} onChange={e => { const items = [...draft.financialItems]; const idx = items.indexOf(f); items[idx] = { ...f, amount: e.target.value }; u('financialItems', items); }} placeholder="Amount" style={{ ...inp, width: 120 }} />
                  <button onClick={() => u('financialItems', draft.financialItems.filter(x => x !== f))} style={delBtn}>×</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Expenses</span>
                <button onClick={() => u('financialItems', [...draft.financialItems, { _id: genTempId(), item_type: 'expense', description: '', amount: '' }])} style={addBtn}>+ Add</button>
              </div>
              {draft.financialItems.filter(f => f.item_type === 'expense').map((f, i) => (
                <div key={f.id || f._id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={f.description} onChange={e => { const items = [...draft.financialItems]; const idx = items.indexOf(f); items[idx] = { ...f, description: e.target.value }; u('financialItems', items); }} placeholder="Description" style={{ ...inp, flex: 1 }} />
                  <input type="text" value={f.amount} onChange={e => { const items = [...draft.financialItems]; const idx = items.indexOf(f); items[idx] = { ...f, amount: e.target.value }; u('financialItems', items); }} placeholder="Amount" style={{ ...inp, width: 120 }} />
                  <button onClick={() => u('financialItems', draft.financialItems.filter(x => x !== f))} style={delBtn}>×</button>
                </div>
              ))}
            </div>

            <MotionBlock label="Financial Report Approval" motion={draft.financial_report_motion} onChange={m => u('financial_report_motion', m)} noMotion={draft.financial_no_motion} onNoMotionChange={v => u('financial_no_motion', v)} />
          </Card>
        )}

        {/* ===== REPORTS (Board/Annual only) ===== */}
        {activeTab === 'reports' && !isSC && (
          <>
            <Card title="Correspondence">
              <textarea value={draft.correspondence || ''} onChange={e => u('correspondence', e.target.value)} placeholder="List correspondence or write 'None'" style={{ ...ta, minHeight: 80 }} />
            </Card>
            <Card title="President's Report">
              <textarea value={draft.presidents_report || ''} onChange={e => u('presidents_report', e.target.value)} placeholder="Enter report details..." style={{ ...ta, minHeight: 100 }} />
              <MotionBlock label="Motion" motion={draft.presidents_report_motion} onChange={m => u('presidents_report_motion', m)} noMotion={draft.presidents_report_no_motion} onNoMotionChange={v => u('presidents_report_no_motion', v)} />
            </Card>
            <Card title="Member Services / Coordinator Report">
              <textarea value={draft.member_services_report || ''} onChange={e => u('member_services_report', e.target.value)} placeholder="Enter report details..." style={{ ...ta, minHeight: 100 }} />
              <MotionBlock label="Motion" motion={draft.member_services_motion} onChange={m => u('member_services_motion', m)} noMotion={draft.member_services_no_motion} onNoMotionChange={v => u('member_services_no_motion', v)} />
            </Card>
            <Card title="State Board / County Reports">
              <textarea value={draft.state_board_report || ''} onChange={e => u('state_board_report', e.target.value)} placeholder="Enter report details..." style={{ ...ta, minHeight: 100 }} />
              <MotionBlock label="Motion" motion={draft.state_board_motion} onChange={m => u('state_board_motion', m)} noMotion={draft.state_board_no_motion} onNoMotionChange={v => u('state_board_no_motion', v)} />
            </Card>
            <Card title="Committee Reports">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 8 }}>Membership Committee</div>
                <textarea value={draft.membership_committee || ''} onChange={e => u('membership_committee', e.target.value)} placeholder="Report summary..." style={ta} />
                <Field label="New Members" style={{ marginTop: 8 }}>
                  <input type="text" value={draft.new_members || ''} onChange={e => u('new_members', e.target.value)} placeholder="List new member names" style={inp} />
                </Field>
                <MotionBlock label="Motion" motion={draft.membership_motion} onChange={m => u('membership_motion', m)} noMotion={draft.membership_no_motion} onNoMotionChange={v => u('membership_no_motion', v)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 8 }}>PAC Committee</div>
                <textarea value={draft.pac_committee || ''} onChange={e => u('pac_committee', e.target.value)} placeholder="Report summary..." style={ta} />
                <MotionBlock label="Motion" motion={draft.pac_motion} onChange={m => u('pac_motion', m)} noMotion={draft.pac_no_motion} onNoMotionChange={v => u('pac_no_motion', v)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 8 }}>Nomination Committee</div>
                <textarea value={draft.nomination_committee || ''} onChange={e => u('nomination_committee', e.target.value)} placeholder="Report summary..." style={ta} />
                <MotionBlock label="Motion" motion={draft.nomination_motion} onChange={m => u('nomination_motion', m)} noMotion={draft.nomination_no_motion} onNoMotionChange={v => u('nomination_no_motion', v)} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 8 }}>Policy Committee (Optional)</div>
                <textarea value={draft.policy_committee || ''} onChange={e => u('policy_committee', e.target.value)} placeholder="Leave blank if not applicable..." style={ta} />
                <MotionBlock label="Motion" motion={draft.policy_motion} onChange={m => u('policy_motion', m)} noMotion={draft.policy_no_motion} onNoMotionChange={v => u('policy_no_motion', v)} />
              </div>
            </Card>
          </>
        )}

        {/* ===== BUSINESS ===== */}
        {activeTab === 'business' && (
          <>
            <Card title="Old Business">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => u('businessItems', [...draft.businessItems, { _id: genTempId(), item_type: 'old', title: '', discussion: '', motion: emptyMotion, no_motion: true }])} style={addBtn}>+ Add Item</button>
              </div>
              {draft.businessItems.filter(b => b.item_type === 'old').length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No old business items</div>
              ) : draft.businessItems.filter(b => b.item_type === 'old').map((item, i) => (
                <div key={item.id || item._id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <input type="text" value={item.title} onChange={e => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, title: e.target.value }; u('businessItems', items); }} placeholder="Business item title" style={{ ...inp, fontWeight: 500, marginBottom: 8 }} />
                  <textarea value={item.discussion || ''} onChange={e => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, discussion: e.target.value }; u('businessItems', items); }} placeholder="Discussion notes..." style={ta} />
                  <MotionBlock label="Motion" motion={item.motion || emptyMotion} onChange={m => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, motion: m }; u('businessItems', items); }} noMotion={item.no_motion} onNoMotionChange={v => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, no_motion: v }; u('businessItems', items); }} />
                  <button onClick={() => u('businessItems', draft.businessItems.filter(x => x !== item))} style={{ marginTop: 10, ...delBtnText }}>Remove</button>
                </div>
              ))}
            </Card>

            <Card title="New Business">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => u('businessItems', [...draft.businessItems, { _id: genTempId(), item_type: 'new', title: '', discussion: '', motion: emptyMotion, no_motion: true }])} style={addBtn}>+ Add Item</button>
              </div>
              {draft.businessItems.filter(b => b.item_type === 'new').length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No new business items</div>
              ) : draft.businessItems.filter(b => b.item_type === 'new').map((item, i) => (
                <div key={item.id || item._id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <input type="text" value={item.title} onChange={e => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, title: e.target.value }; u('businessItems', items); }} placeholder="Business item title" style={{ ...inp, fontWeight: 500, marginBottom: 8 }} />
                  <textarea value={item.discussion || ''} onChange={e => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, discussion: e.target.value }; u('businessItems', items); }} placeholder="Discussion notes..." style={ta} />
                  <MotionBlock label="Motion" motion={item.motion || emptyMotion} onChange={m => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, motion: m }; u('businessItems', items); }} noMotion={item.no_motion} onNoMotionChange={v => { const items = [...draft.businessItems]; const idx = items.indexOf(item); items[idx] = { ...item, no_motion: v }; u('businessItems', items); }} />
                  <button onClick={() => u('businessItems', draft.businessItems.filter(x => x !== item))} style={{ marginTop: 10, ...delBtnText }}>Remove</button>
                </div>
              ))}
            </Card>

            <Card title="Upcoming Events">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => u('upcomingEvents', [...draft.upcomingEvents, { _id: genTempId(), name: '', date: '', location: '' }])} style={addBtn}>+ Add Event</button>
              </div>
              {draft.upcomingEvents.map((evt) => (
                <div key={evt.id || evt._id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={evt.name} onChange={e => { const evts = [...draft.upcomingEvents]; const idx = evts.indexOf(evt); evts[idx] = { ...evt, name: e.target.value }; u('upcomingEvents', evts); }} placeholder="Event name" style={{ ...inp, flex: 1 }} />
                  <input type="text" value={evt.date || ''} onChange={e => { const evts = [...draft.upcomingEvents]; const idx = evts.indexOf(evt); evts[idx] = { ...evt, date: e.target.value }; u('upcomingEvents', evts); }} placeholder="Date" style={{ ...inp, width: 120 }} />
                  <input type="text" value={evt.location || ''} onChange={e => { const evts = [...draft.upcomingEvents]; const idx = evts.indexOf(evt); evts[idx] = { ...evt, location: e.target.value }; u('upcomingEvents', evts); }} placeholder="Location" style={{ ...inp, width: 150 }} />
                  <button onClick={() => u('upcomingEvents', draft.upcomingEvents.filter(x => x !== evt))} style={delBtn}>×</button>
                </div>
              ))}
            </Card>

            <Card title="Good of the Order">
              <textarea value={draft.good_of_the_order || ''} onChange={e => u('good_of_the_order', e.target.value)} placeholder="Notes and announcements..." style={{ ...ta, minHeight: 100 }} />
            </Card>

            <Card title="Adjournment">
              <MotionBlock label="Adjournment Motion" motion={draft.adjournment_motion} onChange={m => u('adjournment_motion', m)} noMotion={draft.adjournment_no_motion} onNoMotionChange={v => u('adjournment_no_motion', v)} />
            </Card>

            <Card title="Action Items">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => u('actionItems', [...draft.actionItems, { _id: genTempId(), task: '', assignee_name: '', due_date: '' }])} style={addBtn}>+ Add Action Item</button>
              </div>
              {draft.actionItems.map((item) => (
                <div key={item.id || item._id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input type="text" value={item.task} onChange={e => { const items = [...draft.actionItems]; const idx = items.indexOf(item); items[idx] = { ...item, task: e.target.value }; u('actionItems', items); }} placeholder="Task description" style={{ ...inp, flex: 1 }} />
                  <input type="text" value={item.assignee_name || ''} onChange={e => { const items = [...draft.actionItems]; const idx = items.indexOf(item); items[idx] = { ...item, assignee_name: e.target.value }; u('actionItems', items); }} placeholder="Assignee" style={{ ...inp, width: 150 }} />
                  <input type="text" value={item.due_date || ''} onChange={e => { const items = [...draft.actionItems]; const idx = items.indexOf(item); items[idx] = { ...item, due_date: e.target.value }; u('actionItems', items); }} placeholder="Due date" style={{ ...inp, width: 120 }} />
                  <button onClick={() => u('actionItems', draft.actionItems.filter(x => x !== item))} style={delBtn}>×</button>
                </div>
              ))}
            </Card>

            {/* Events Created From This Meeting */}
            <Card title="Events From This Meeting">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                {draft.id && !draft.id.startsWith('_tmp_') && (
                  <Link
                    to={`/events/new?minutesId=${draft.id}&meetingType=${draft.meeting_type}${draft.subcommittee_id ? `&subcommitteeId=${draft.subcommittee_id}` : ''}`}
                    style={{ padding: '6px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}
                  >+ Create Event</Link>
                )}
                {(!draft.id || draft.id.startsWith('_tmp_')) && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Save minutes first to create events</span>
                )}
              </div>
              {linkedEvents.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No events created from this meeting yet.</div>
              ) : (
                linkedEvents.map(e => (
                  <Link key={e.id} to={`/events/${e.id}`} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontSize: 12, color: '#64748b', minWidth: 80 }}>{e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{e.location || 'TBD'}</div>
                    <span style={{ color: '#9ca3af' }}>→</span>
                  </Link>
                ))
              )}
            </Card>

            {/* Next 6 Upcoming Events - Board: all events, Subcommittee: filtered to that subcommittee */}
            {upcomingDbEvents.length > 0 && (
              <Card title={draft.meeting_type === 'SUBCOMMITTEE' ? 'Next 6 Committee Events' : 'Next 6 Upcoming Events'}>
                {upcomingDbEvents.map(e => (
                  <div key={e.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <div style={{ color: '#64748b', minWidth: 80 }}>{e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}</div>
                    <div style={{ flex: 1, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ color: '#64748b' }}>{e.time || ''}</div>
                    <div style={{ color: '#64748b' }}>{e.location || 'TBD'}</div>
                    {e.subcommittees?.name && draft.meeting_type === 'BOARD' && <span style={{ fontSize: 11, padding: '2px 8px', background: '#f3e8ff', color: '#7c3aed', borderRadius: 10 }}>{e.subcommittees.name}</span>}
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ===== PREVIEW ===== */}
        {activeTab === 'preview' && (
          <Card>
            <div style={{ textAlign: organization?.logo_position || 'center', marginBottom: 24 }}>
              {organization?.logo_url && (
                <img src={organization.logo_url} alt={organization?.name || 'Logo'} style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', marginBottom: 12 }} />
              )}
              <h1 style={{ fontSize: 20, color: '#1e293b', fontWeight: 600, margin: '0 0 4px' }}>
                {isSC
                  ? `${subcommittees.find(s => s.id === draft.subcommittee_id)?.name || 'Subcommittee'} Meeting Minutes`
                  : `${MEETING_TYPES.find(t => t.value === draft.meeting_type)?.label || 'Board'} Meeting Minutes`
                }
              </h1>
              <div style={{ color: '#64748b', fontSize: 14 }}>{organization?.name || 'Organization'}</div>
            </div>

            <PreviewSection title="Meeting Information">
              <PLine label="Date" value={fmtDate(draft.meeting_date)} />
              <PLine label="Time" value={draft.meeting_time} />
              <PLine label="Location" value={draft.location} />
              <PLine label={isSC ? 'Chair' : 'Facilitator'} value={fmtMember(draft.facilitator_id)} />
              <PLine label="Recorder" value={fmtMember(draft.recorder_id)} />
            </PreviewSection>

            <PreviewSection title="Call to Order">
              <PLine label="Called to Order" value={draft.time_called_to_order} />
              {!isSC && <PLine label="Invocation" value={draft.invocation || 'Invocation was given.'} />}
              {!isSC && <PLine label="Pledge" value={draft.pledge_recited ? 'Pledge was recited.' : 'Not recited.'} />}
            </PreviewSection>

            <PreviewSection title="Attendance">
              <PLine label="Present" value={draft.attendance.filter(a => a.status === 'present').map(a => fmtMember(a.member_id)).join(', ') || '[None]'} />
              <PLine label="Absent" value={draft.attendance.filter(a => a.status === 'absent').map(a => fmtMember(a.member_id)).join(', ') || '[None]'} />
              <PLine label="Excused" value={draft.attendance.filter(a => a.status === 'excused').map(a => fmtMember(a.member_id)).join(', ') || '[None]'} />
              <PLine label="Guests" value={draft.guests} />
              <PLine label="Quorum" value={QUORUM_OPTIONS.find(q => q.value === draft.quorum)?.label} />
            </PreviewSection>

            {!isSC && (
            <PreviewSection title="Financial Report">
              <PLine label="Total Donations (YTD)" value={draft.total_donations_ytd ? `$${draft.total_donations_ytd}` : null} />
              <PLine label="Donations Since Last Meeting" value={draft.donations_since_last_meeting ? `$${draft.donations_since_last_meeting}` : null} />
              {(draft.accounts || []).length > 0 ? (
                <>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8, marginBottom: 4 }}>Account Balances:</div>
                  {draft.accounts.map((a, i) => (
                    <div key={i} style={{ fontSize: 14, marginLeft: 16 }}>{a.name}: ${a.balance || '0.00'}</div>
                  ))}
                  <div style={{ fontSize: 14, marginLeft: 16, fontWeight: 600, marginTop: 4 }}>
                    Total: ${draft.accounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0).toFixed(2)}
                  </div>
                </>
              ) : (
                <PLine label="Account Balance" value={draft.current_account_balance ? `$${draft.current_account_balance}` : null} />
              )}
              <PreviewMotion motion={draft.financial_report_motion} noMotion={draft.financial_no_motion} />
            </PreviewSection>
            )}

            {!isSC && (
            <PreviewSection title="Correspondence">
              <div style={{ fontSize: 14 }}>{draft.correspondence || 'None'}</div>
            </PreviewSection>
            )}

            {!isSC && (
            <PreviewSection title="President's Report">
              <div style={{ fontSize: 14 }}>{draft.presidents_report || '[Not provided]'}</div>
              <PreviewMotion motion={draft.presidents_report_motion} noMotion={draft.presidents_report_no_motion} />
            </PreviewSection>
            )}

            {draft.businessItems.filter(b => b.item_type === 'old').length > 0 && (
              <PreviewSection title="Old Business">
                {draft.businessItems.filter(b => b.item_type === 'old').map((item, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    {item.discussion && <div style={{ fontSize: 14, marginLeft: 16 }}>{item.discussion}</div>}
                    <PreviewMotion motion={item.motion} noMotion={item.no_motion} />
                  </div>
                ))}
              </PreviewSection>
            )}

            {draft.businessItems.filter(b => b.item_type === 'new').length > 0 && (
              <PreviewSection title="New Business">
                {draft.businessItems.filter(b => b.item_type === 'new').map((item, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    {item.discussion && <div style={{ fontSize: 14, marginLeft: 16 }}>{item.discussion}</div>}
                    <PreviewMotion motion={item.motion} noMotion={item.no_motion} />
                  </div>
                ))}
              </PreviewSection>
            )}

            <PreviewSection title="Good of the Order">
              <div style={{ fontSize: 14 }}>{draft.good_of_the_order || '[Not provided]'}</div>
            </PreviewSection>

            <PreviewSection title="Adjournment">
              <PLine label="Time Adjourned" value={draft.time_adjourned} />
              <PreviewMotion motion={draft.adjournment_motion} noMotion={draft.adjournment_no_motion} />
            </PreviewSection>

            {draft.actionItems.length > 0 && (
              <PreviewSection title="Action Items">
                {draft.actionItems.map((item, i) => (
                  <div key={i} style={{ fontSize: 14, marginBottom: 4 }}>
                    • {item.task} {item.assignee_name && `(${item.assignee_name})`} {item.due_date && `— Due: ${item.due_date}`}
                  </div>
                ))}
              </PreviewSection>
            )}
          </Card>
        )}
      </div>
<ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Minutes"
        message="This will permanently delete this minutes record. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
      {/* Send Email Modal */}
      <SendEmailModal
        open={showSendModal}
        onClose={() => setShowSendModal(false)}
        documentType="minutes"
        documentId={draft.id}
        subject={`${MEETING_TYPES.find(t => t.value === draft.meeting_type)?.label || 'Board'} Meeting Minutes — ${fmtDate(draft.meeting_date)}`}
        htmlBody={generateMinutesEmailHtml(draft, fmtMember, fmtDate, isSC, MEETING_TYPES, QUORUM_OPTIONS, organization)}
        fromName={organization?.name || 'GoodOfTheOrder'}
      />
    </div>
  );
}

// Generate email HTML from minutes draft
// HTML escape helpers (BUG-025: prevent XSS in email HTML)
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escNl = (s) => esc(s).replace(/\n/g, '<br>');

function generateMinutesEmailHtml(draft, fmtMember, fmtDate, isSC, MEETING_TYPES, QUORUM_OPTIONS, org) {
  const mt = MEETING_TYPES.find(t => t.value === draft.meeting_type)?.label || 'Board';
  const np = '[Not provided]';
  const section = (title, content) => `<h3 style="color:#1e293b;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:20px 0 10px">${title}</h3>${content}`;
  const line = (label, value) => `<div style="font-size:14px;line-height:1.8"><strong>${label}:</strong> ${esc(value) || np}</div>`;

  let html = `<div style="max-width:700px;margin:0 auto;font-family:Arial,sans-serif;color:#1e293b">`;
  const logoAlign = org?.logo_position === 'left' ? 'left' : org?.logo_position === 'right' ? 'right' : 'center';
  if (org?.logo_url) {
    html += `<div style="text-align:${logoAlign};margin-bottom:16px"><img src="${org.logo_url}" alt="${esc(org.name || '')}" style="max-height:80px;max-width:240px;object-fit:contain" /></div>`;
  }
  html += `<div style="text-align:${logoAlign};margin-bottom:24px"><h1 style="font-size:20px;color:#1e293b;margin:0 0 4px">${mt} Meeting Minutes</h1><div style="color:#64748b;font-size:14px">${esc(org?.name || 'Organization')}</div></div>`;

  html += section('Meeting Information',
    line('Date', fmtDate(draft.meeting_date)) +
    line('Time', draft.meeting_time) +
    line('Location', draft.location) +
    line(isSC ? 'Chair' : 'Facilitator', fmtMember(draft.facilitator_id)) +
    line('Recorder', fmtMember(draft.recorder_id))
  );

  html += section('Call to Order', line('Called to Order', draft.time_called_to_order) +
    (!isSC ? line('Invocation', draft.invocation || 'Invocation was given.') + line('Pledge', draft.pledge_recited ? 'Pledge was recited.' : 'Not recited.') : '')
  );

  const present = draft.attendance?.filter(a => a.status === 'present').map(a => fmtMember(a.member_id)).join(', ') || np;
  const absent = draft.attendance?.filter(a => a.status === 'absent').map(a => fmtMember(a.member_id)).join(', ') || np;
  html += section('Attendance', line('Present', present) + line('Absent', absent) + line('Guests', draft.guests) +
    line('Quorum', QUORUM_OPTIONS.find(q => q.value === draft.quorum)?.label)
  );

  if (!isSC) {
    let finContent = line('Total Donations (YTD)', draft.total_donations_ytd ? `$${esc(draft.total_donations_ytd)}` : null) +
      line('Donations Since Last Meeting', draft.donations_since_last_meeting ? `$${esc(draft.donations_since_last_meeting)}` : null);
    if ((draft.accounts || []).length > 0) {
      finContent += '<div style="margin-top:8px"><strong>Account Balances:</strong></div>';
      draft.accounts.forEach(a => { finContent += `<div style="margin-left:16px">${esc(a.name)}: $${esc(a.balance) || '0.00'}</div>`; });
    }
    html += section("Treasurer's Report", finContent);

    if (draft.correspondence) html += section('Correspondence', `<div>${escNl(draft.correspondence)}</div>`);
    if (draft.presidents_report) html += section("President's Report", `<div>${escNl(draft.presidents_report)}</div>`);
  }

  const oldBiz = (draft.businessItems || []).filter(b => b.item_type === 'old');
  if (oldBiz.length > 0) {
    html += section('Old Business', oldBiz.map(b => `<div style="margin-bottom:8px"><strong>${esc(b.title)}</strong>${b.discussion ? `<div style="margin-left:16px">${escNl(b.discussion)}</div>` : ''}</div>`).join(''));
  }
  const newBiz = (draft.businessItems || []).filter(b => b.item_type === 'new');
  if (newBiz.length > 0) {
    html += section('New Business', newBiz.map(b => `<div style="margin-bottom:8px"><strong>${esc(b.title)}</strong>${b.discussion ? `<div style="margin-left:16px">${escNl(b.discussion)}</div>` : ''}</div>`).join(''));
  }

  if (draft.good_of_the_order) html += section('Good of the Order', `<div>${escNl(draft.good_of_the_order)}</div>`);

  html += section('Adjournment', line('Time Adjourned', draft.time_adjourned));

  if ((draft.actionItems || []).length > 0) {
    html += section('Action Items', draft.actionItems.map(a => `<div>• ${esc(a.task)}${a.assignee_name ? ` (${esc(a.assignee_name)})` : ''}${a.due_date ? ` — Due: ${esc(a.due_date)}` : ''}</div>`).join(''));
  }

  html += '</div>';
  return html;
}

// ===== SHARED STYLES =====
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const sel = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 };
const ta = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', minHeight: 60 };
const addBtn = { padding: '7px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' };
const delBtn = { padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const delBtnText = { padding: '5px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 12 };

// ===== HELPER COMPONENTS =====
function Card({ title, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, marginBottom: 16 }}>
      {title && <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' }}>{title}</h3>}
      {children}
    </div>
  );
}

function Field({ label, children, style = {} }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>;
}

function MotionBlock({ label, motion, onChange, noMotion, onNoMotionChange }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#dc2626', marginBottom: 6 }}>{label}</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={noMotion} onChange={e => onNoMotionChange(e.target.checked)} />
        <span style={{ fontSize: 13, color: '#475569' }}>No motion was made</span>
      </label>
      {!noMotion && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <Field label="Motion"><textarea value={motion?.text || ''} onChange={e => onChange({ ...motion, text: e.target.value })} placeholder="Motion text" style={ta} /></Field>
          <Row>
            <Field label="Moved By"><input type="text" value={motion?.movedBy || ''} onChange={e => onChange({ ...motion, movedBy: e.target.value })} style={inp} /></Field>
            <Field label="Seconded By"><input type="text" value={motion?.secondedBy || ''} onChange={e => onChange({ ...motion, secondedBy: e.target.value })} style={inp} /></Field>
          </Row>
          <Row>
            <Field label="Decision"><input type="text" value={motion?.decision || ''} onChange={e => onChange({ ...motion, decision: e.target.value })} placeholder="Passed/Failed/Tabled" style={inp} /></Field>
            <Field label="Vote"><input type="text" value={motion?.vote || ''} onChange={e => onChange({ ...motion, vote: e.target.value })} placeholder="e.g., Unanimous, 5-2" style={inp} /></Field>
          </Row>
        </div>
      )}
    </div>
  );
}

function PreviewSection({ title, children }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <h2 style={{ color: '#1e293b', fontSize: 15, fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}

function PLine({ label, value }) {
  return <div style={{ fontSize: 14, lineHeight: 1.8 }}><strong>{label}:</strong> {value || '[Not provided]'}</div>;
}

function PreviewMotion({ motion, noMotion }) {
  if (noMotion || !motion?.text) return <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>No motion was made</div>;
  return (
    <div style={{ marginTop: 6, paddingLeft: 16, borderLeft: '3px solid #e2e8f0', fontSize: 14 }}>
      <div><strong>Motion:</strong> {motion.text}</div>
      {motion.movedBy && <div><strong>Moved by:</strong> {motion.movedBy}</div>}
      {motion.secondedBy && <div><strong>Seconded by:</strong> {motion.secondedBy}</div>}
      {motion.decision && <div><strong>Decision:</strong> {motion.decision}</div>}
      {motion.vote && <div><strong>Vote:</strong> {motion.vote}</div>}
    </div>
  );
}
