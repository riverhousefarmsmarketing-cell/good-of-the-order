import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useMembers } from '../hooks/useMembers.jsx';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/Modal';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access, manage members & settings' },
  { value: 'editor', label: 'Editor', desc: 'Create and edit minutes, agendas, events' },
  { value: 'viewer', label: 'Viewer', desc: 'View-only access to records' },
];

const BOARD_POSITIONS = [
  'President', 'Vice President', 'Secretary', 'Treasurer', 'Board Member',
  'Committee Chair', 'Ex Officio', '',
];

export default function MembersPage() {
  const { isAdmin, profile } = useAuth();
  const { members, invitations, loading, updateMember, deactivateMember, reactivateMember, sendInvitation, cancelInvitation } = useMembers();
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'editor', boardPosition: '' });
  const [inviteError, setInviteError] = useState(null);
  const [inviteSending, setInviteSending] = useState(false);
const { toast } = useToast();
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  const [lastInviteUrl, setLastInviteUrl] = useState(null);

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviteError(null);
    setInviteSending(true);
    try {
      const result = await sendInvitation(inviteForm);
      setInviteForm({ email: '', role: 'editor', boardPosition: '' });
      if (result?.inviteUrl) {
        setLastInviteUrl(result.inviteUrl);
      } else {
        setShowInvite(false);
      }
      toast.success('Invitation created');
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteSending(false);
    }
  };

  const handleUpdateMember = async (id, field, value) => {
    try {
      await updateMember(id, { [field]: value });
    } catch (err) {
      toast.error('Unable to update member. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
        Loading members...
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Members</h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: '10px 20px', background: '#1e293b', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div style={{
          marginBottom: 24, padding: 16,
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e', marginBottom: 12 }}>
            Pending Invitations ({invitations.length})
          </div>
          {invitations.map((inv) => (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '10px 0', borderBottom: '1px solid #fde68a',
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>{inv.email}</span>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#64748b' }}>
                  {inv.role} {inv.board_position ? `- ${inv.board_position}` : ''}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Sent {new Date(inv.created_at).toLocaleDateString()}
              </span>
              {isAdmin && (
                <button
                  onClick={() => cancelInvitation(inv.id)}
                  style={{
                    padding: '4px 10px', background: 'white', border: '1px solid #d1d5db',
                    borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#64748b',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active Members */}
      <div style={{
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 140px 100px',
          padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <div>Member</div>
          <div>Position</div>
          <div>Role</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        {activeMembers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            No members yet. Invite your board members to get started.
          </div>
        ) : (
          activeMembers.map((member) => {
            const isEditing = editingId === member.id;
            const isCurrentUser = member.id === profile?.id;
            return (
              <div
                key={member.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 140px 100px',
                  padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center',
                  background: isEditing ? '#f8fafc' : 'white',
                }}
              >
                {/* Name & Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#1e293b', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                  }}>
                    {member.full_name?.split(' ').map((n) => n[0]).join('') || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>
                      {member.full_name}
                      {isCurrentUser && (
                        <span style={{
                          marginLeft: 8, fontSize: 11, padding: '2px 6px',
                          background: '#dbeafe', color: '#1e40af', borderRadius: 4,
                        }}>You</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{member.email}</div>
                  </div>
                </div>

                {/* Position */}
                <div>
                  {isEditing && isAdmin ? (
                    <select
                      value={member.board_position || ''}
                      onChange={(e) => handleUpdateMember(member.id, 'board_position', e.target.value || null)}
                      style={{
                        width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
                        borderRadius: 4, fontSize: 13,
                      }}
                    >
                      <option value="">No position</option>
                      {BOARD_POSITIONS.filter(Boolean).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{
                      fontSize: 13,
                      color: member.board_position ? '#1e293b' : '#94a3b8',
                    }}>
                      {member.board_position || 'No position'}
                    </span>
                  )}
                </div>

                {/* Role */}
                <div>
                  {isEditing && isAdmin && !isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateMember(member.id, 'role', e.target.value)}
                      style={{
                        width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
                        borderRadius: 4, fontSize: 13,
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: member.role === 'admin' ? '#dbeafe' : member.role === 'editor' ? '#dcfce7' : '#f3f4f6',
                      color: member.role === 'admin' ? '#1e40af' : member.role === 'editor' ? '#166534' : '#64748b',
                    }}>
                      {ROLES.find((r) => r.value === member.role)?.label || member.role}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ textAlign: 'right' }}>
                  {isAdmin && (
                    <>
                      {isEditing ? (
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: '5px 12px', background: '#1e293b', color: 'white',
                            border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                          }}
                        >
                          Done
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setEditingId(member.id)}
                            style={{
                              padding: '5px 10px', background: '#f1f5f9',
                              border: '1px solid #e2e8f0', borderRadius: 4,
                              fontSize: 12, cursor: 'pointer', color: '#475569',
                            }}
                          >
                            Edit
                          </button>
                          {!isCurrentUser && (
                            <button
                              onClick={() => setDeactivateTarget(member)}
                              style={{
                                padding: '5px 10px', background: '#fef2f2',
                                border: '1px solid #fecaca', borderRadius: 4,
                                fontSize: 12, cursor: 'pointer', color: '#dc2626',
                              }}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowInactive(!showInactive)}
            style={{
              padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0',
              borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#64748b',
            }}
          >
            {showInactive ? 'Hide' : 'Show'} Inactive Members ({inactiveMembers.length})
          </button>
          {showInactive && (
            <div style={{
              marginTop: 12, background: 'white', border: '1px solid #e2e8f0',
              borderRadius: 8, overflow: 'hidden', opacity: 0.7,
            }}>
              {inactiveMembers.map((member) => (
                <div key={member.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px', borderBottom: '1px solid #f1f5f9',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 500, color: '#64748b' }}>{member.full_name}</span>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8' }}>{member.email}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => reactivateMember(member.id)}
                      style={{
                        padding: '5px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#166534',
                      }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BUG-052: Invite Modal — added onKeyDown for Escape, tabIndex, and autoFocus */}
      {showInvite && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
          onClick={() => setShowInvite(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowInvite(false); }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div
            style={{
              background: 'white', borderRadius: 10, padding: 28,
              width: '100%', maxWidth: 440,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: '0 0 20px' }}>
              Invite Member
            </h2>

            {inviteError && (
              <div style={{
                padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 6, color: '#dc2626', fontSize: 13, marginBottom: 16,
              }}>
                {inviteError}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="member@example.com"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') setShowInvite(false); }}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>

            <div className="goto-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: 6, fontSize: 14,
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {ROLES.find((r) => r.value === inviteForm.role)?.desc}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Board Position
                </label>
                <select
                  value={inviteForm.boardPosition}
                  onChange={(e) => setInviteForm({ ...inviteForm, boardPosition: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                    borderRadius: 6, fontSize: 14,
                  }}
                >
                  <option value="">None</option>
                  {BOARD_POSITIONS.filter(Boolean).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{
              padding: 14, background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 6, marginBottom: 20, fontSize: 13, color: '#64748b',
            }}>
              The invited person will need to create an account. Their invitation link will include a token that automatically adds them to your organization.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  padding: '10px 20px', background: 'white', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteForm.email || inviteSending}
                style={{
                  padding: '10px 20px', background: '#1e293b', color: 'white',
                  border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  cursor: inviteSending ? 'wait' : 'pointer',
                  opacity: !inviteForm.email || inviteSending ? 0.6 : 1,
                }}
              >
                {inviteSending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
            {lastInviteUrl && (
              <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#166534', marginBottom: 6 }}>✓ Invitation created! Share this link:</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="text" readOnly value={lastInviteUrl} style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, background: 'white' }} />
                  <button onClick={() => { navigator.clipboard.writeText(lastInviteUrl); toast.success('Link copied!'); }} style={{ padding: '8px 14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Copy</button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>Email notification coming soon. For now, share this link manually.</div>
              </div>
            )}
          </div>
        </div>
      )}
<ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => { deactivateMember(deactivateTarget.id); setDeactivateTarget(null); }}
        title="Deactivate Member"
        message={`Deactivate ${deactivateTarget?.full_name}? They will lose access.`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
