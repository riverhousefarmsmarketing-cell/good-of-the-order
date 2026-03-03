import { useState, useEffect } from 'react';
import { useEmail } from '../../hooks/useEmail.jsx';
import { useMembers } from '../../hooks/useMembers.jsx';

/**
 * SendEmailModal - send dialog with GROUP-BASED recipient selection
 * 
 * Groups:
 *   - Board Officers (President, VP, Secretary, Treasurer from members)
 *   - All Members (all active members)
 *   - Distribution list groups (Board, Staff, Committee, Guest, etc.)
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   documentType: 'minutes' | 'agenda'
 *   documentId: string (UUID)
 *   subject: string (default subject line)
 *   htmlBody: string (email HTML content)
 *   fromName: string (org name)
 *   members: array (optional — if provided, skips internal useMembers call)
 */
export default function SendEmailModal({ open, onClose, documentType, documentId, subject: defaultSubject, htmlBody, fromName, members: membersProp }) {
  const { contacts, contactsLoading, sendEmail, fetchLogsForDocument } = useEmail();
  // BUG-704 FIX: Use passed members prop if available, otherwise fetch internally
  const { members: membersInternal } = useMembers();
  const members = membersProp || membersInternal;
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [subject, setSubject] = useState(defaultSubject || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject || '');
      setSent(false);
      setError(null);
      // Pre-select all active contacts by email
      const allEmails = new Set();
      (contacts || []).filter(c => c.is_active).forEach(c => { if (c.email) allEmails.add(c.email); });
      setSelectedEmails(allEmails);
      // Fetch send history
      if (documentId) {
        fetchLogsForDocument(documentType, documentId).then(setLogs);
      }
    }
  }, [open, contacts, defaultSubject, documentId]);

  if (!open) return null;

  // ─── Build groups ──────────────────────────────────────────────
  const activeMembers = (members || []).filter(m => m.is_active !== false);
  const activeContacts = (contacts || []).filter(c => c.is_active);

  // Board Officers: match common officer roles
  const officerKeywords = ['president', 'vice president', 'vice_president', 'secretary', 'treasurer'];
  const boardOfficers = activeMembers.filter(m => {
    const role = (m.board_position || m.role || '').toLowerCase();
    return officerKeywords.some(k => role.includes(k));
  });
  const boardOfficerEmails = boardOfficers.map(m => m.email).filter(Boolean);

  // All Members
  const allMemberEmails = activeMembers.map(m => m.email).filter(Boolean);

  // Distribution list groups (by group_label)
  const distGroups = {};
  activeContacts.forEach(c => {
    const label = c.group_label || 'Other';
    if (!distGroups[label]) distGroups[label] = [];
    distGroups[label].push(c);
  });
  const distGroupNames = Object.keys(distGroups).sort();

  // All unique emails
  const allAvailableEmails = new Set();
  allMemberEmails.forEach(e => allAvailableEmails.add(e));
  activeContacts.forEach(c => { if (c.email) allAvailableEmails.add(c.email); });

  // ─── Selection helpers ─────────────────────────────────────────
  const toggleEmail = (email) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
  };

  const toggleGroup = (emails) => {
    const valid = emails.filter(Boolean);
    setSelectedEmails(prev => {
      const next = new Set(prev);
      const allIn = valid.every(e => next.has(e));
      valid.forEach(e => allIn ? next.delete(e) : next.add(e));
      return next;
    });
  };

  const selectAll = () => setSelectedEmails(new Set(allAvailableEmails));
  const clearAll = () => setSelectedEmails(new Set());

  // ─── Send ──────────────────────────────────────────────────────
  const [lastSendTime, setLastSendTime] = useState(0);

  const handleSend = async () => {
    const recipients = Array.from(selectedEmails).filter(Boolean);
    if (recipients.length === 0) { setError('Select at least one recipient.'); return; }
    if (!subject.trim()) { setError('Subject is required.'); return; }

    // BUG-011: Client-side rate limit
    const now = Date.now();
    if (now - lastSendTime < 10000) {
      setError('Please wait a few seconds before sending again.');
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendEmail({
        to: recipients,
        subject: subject.trim(),
        html: htmlBody || '<p>No content</p>',
        documentType,
        documentId,
        fromName,
      });
      setSent(true);
      setLastSendTime(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to send');
    }
    setSending(false);
  };

  // ─── GroupChip component ───────────────────────────────────────
  const GroupChip = ({ label, emails, color = '#1e40af' }) => {
    const valid = emails.filter(Boolean);
    if (valid.length === 0) return null;
    const allIn = valid.every(e => selectedEmails.has(e));
    const someIn = valid.some(e => selectedEmails.has(e));

    return (
      <button
        onClick={() => toggleGroup(valid)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 20,
          background: allIn ? color : someIn ? `${color}18` : '#f8fafc',
          color: allIn ? 'white' : color,
          border: `1.5px solid ${allIn || someIn ? color : '#e2e8f0'}`,
          cursor: 'pointer', fontSize: 13, fontWeight: 500,
          transition: 'all 0.15s ease',
        }}
      >
        {label}
        <span style={{
          background: allIn ? 'rgba(255,255,255,0.25)' : `${color}15`,
          padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600,
          color: allIn ? 'white' : color,
        }}>{valid.length}</span>
      </button>
    );
  };

  // ─── Individual contact row ────────────────────────────────────
  const ContactRow = ({ name, email, detail, isLast }) => (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', cursor: 'pointer',
      background: selectedEmails.has(email) ? '#f0f9ff' : 'white',
      borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
    }}>
      <input
        type="checkbox"
        checked={selectedEmails.has(email)}
        onChange={() => toggleEmail(email)}
        style={{ accentColor: '#1e293b' }}
      />
      <span style={{ flex: 1, fontSize: 14 }}>
        {name}
        {detail && <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8' }}>{detail}</span>}
      </span>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>{email}</span>
    </label>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Send {documentType === 'minutes' ? 'Minutes' : 'Agenda'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Select recipients by group or individually
          </p>
          {sent && (
            <div style={{ marginTop: 12, padding: 12, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, color: '#166534', fontSize: 13 }}>
              ✓ Sent to {selectedEmails.size} recipient{selectedEmails.size !== 1 ? 's' : ''}!
            </div>
          )}
          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>

          {/* Subject */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* ─── Quick Select Groups ──────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Select
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={selectAll} style={linkBtn}>Select All</button>
                <button onClick={clearAll} style={linkBtn}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <GroupChip label="Board Officers" emails={boardOfficerEmails} color="#1e40af" />
              <GroupChip label="All Members" emails={allMemberEmails} color="#059669" />
              {distGroupNames.map(label => (
                <GroupChip
                  key={label}
                  label={label}
                  emails={distGroups[label].map(c => c.email)}
                  color={groupColor(label)}
                />
              ))}
            </div>
          </div>

          {/* ─── Individual Recipients ────────────────────────── */}
          {contactsLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading contacts...</div>
          ) : (
            <>
              {/* Members section */}
              {activeMembers.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Members ({activeMembers.filter(m => m.email && selectedEmails.has(m.email)).length}/{activeMembers.filter(m => m.email).length})
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    {activeMembers.filter(m => m.email).map((m, i) => (
                      <ContactRow
                        key={m.id}
                        name={m.full_name}
                        email={m.email}
                        detail={m.board_position || m.role}
                        isLast={i === activeMembers.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Distribution contacts section */}
              {activeContacts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Distribution List ({activeContacts.filter(c => c.email && selectedEmails.has(c.email)).length}/{activeContacts.length})
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 240, overflow: 'auto' }}>
                    {distGroupNames.map(groupName => {
                      const groupContacts = distGroups[groupName];
                      return (
                        <div key={groupName}>
                          <div
                            onClick={() => toggleGroup(groupContacts.map(c => c.email))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                              background: '#f8fafc', borderBottom: '1px solid #e2e8f0', cursor: 'pointer',
                              position: 'sticky', top: 0, zIndex: 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={groupContacts.every(c => selectedEmails.has(c.email))}
                              readOnly
                              style={{ accentColor: '#1e293b' }}
                            />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {groupName} ({groupContacts.length})
                            </span>
                          </div>
                          {groupContacts.map((c, i) => (
                            <ContactRow
                              key={c.id}
                              name={c.full_name}
                              email={c.email}
                              detail={null}
                              isLast={i === groupContacts.length - 1 && groupName === distGroupNames[distGroupNames.length - 1]}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeMembers.length === 0 && activeContacts.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f9fafb', borderRadius: 8 }}>
                  No recipients available. Add members on the Members page or contacts in Distribution List.
                </div>
              )}
            </>
          )}

          {/* Previous sends */}
          {logs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Previously Sent</div>
              {logs.slice(0, 3).map(log => (
                <div key={log.id} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  {new Date(log.sent_at).toLocaleString()} — {Array.isArray(log.recipient_emails) ? log.recipient_emails.length : 0} recipients
                  {(() => { const p = Array.isArray(log.sent_by_profile) ? log.sent_by_profile[0] : log.sent_by_profile; return p?.full_name ? ` — by ${p.full_name}` : ''; })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {selectedEmails.size} recipient{selectedEmails.size !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', background: 'white', border: '1px solid #d1d5db',
              borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}>{sent ? 'Close' : 'Cancel'}</button>
            {!sent && (
              <button
                onClick={handleSend}
                disabled={sending || selectedEmails.size === 0}
                style={{
                  padding: '10px 24px', background: '#1e293b', color: 'white', border: 'none',
                  borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 13,
                  opacity: sending || selectedEmails.size === 0 ? 0.5 : 1,
                }}
              >
                {sending ? 'Sending...' : `Send to ${selectedEmails.size}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const linkBtn = {
  padding: '4px 10px', background: 'transparent', border: 'none',
  fontSize: 12, cursor: 'pointer', color: '#1e40af', textDecoration: 'underline',
};

function groupColor(label) {
  const l = label.toLowerCase();
  if (l === 'board') return '#7c3aed';
  if (l === 'staff') return '#0891b2';
  if (l.includes('committee')) return '#ea580c';
  if (l === 'guest') return '#64748b';
  return '#475569';
}
