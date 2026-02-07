import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMinutes } from '../hooks/useMinutes.jsx';

const MEETING_TYPES = [
  { value: 'BOARD', label: 'Board' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SUBCOMMITTEE', label: 'Subcommittee' },
];

const STATUS_COLORS = {
  draft: { bg: '#fef3c7', color: '#92400e' },
  review: { bg: '#dbeafe', color: '#1e40af' },
  approved: { bg: '#dcfce7', color: '#166534' },
};

export default function MinutesArchivePage() {
  const { minutesList, loading, deleteMinutes } = useMinutes();
  const [filter, setFilter] = useState('all');

  const filtered = minutesList.filter(m => filter === 'all' || m.meeting_type === filter);

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this minutes record?')) {
      try { await deleteMinutes(id); } catch (err) { alert('Error: ' + err.message); }
    }
  };

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>Loading minutes...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: 0 }}>Minutes Archive</h1>
        <Link to="/minutes/new" style={{
          padding: '10px 20px', background: '#1e293b', color: 'white',
          border: 'none', borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: 14,
        }}>+ New Minutes</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ value: 'all', label: 'All' }, ...MEETING_TYPES].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: filter === f.value ? '#1e293b' : 'white',
            color: filter === f.value ? 'white' : '#374151',
          }}>
            {f.label} {f.value !== 'all' && `(${minutesList.filter(m => m.meeting_type === f.value).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 48, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
          No minutes found. Create your first meeting minutes to get started.
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {filtered.map(m => (
            <Link key={m.id} to={`/minutes/${m.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{ fontSize: 13, color: '#64748b', minWidth: 100 }}>{fmtDate(m.meeting_date)}</div>
              <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: m.meeting_type === 'BOARD' ? '#dbeafe' : m.meeting_type === 'SUBCOMMITTEE' ? '#f3e8ff' : '#fef3c7',
                color: m.meeting_type === 'BOARD' ? '#1e40af' : m.meeting_type === 'SUBCOMMITTEE' ? '#7c3aed' : '#92400e',
              }}>{m.meeting_type}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>
                  {MEETING_TYPES.find(t => t.value === m.meeting_type)?.label} Meeting
                </span>
                {m.subcommittee?.name && <span style={{ color: '#64748b', fontSize: 13 }}> — {m.subcommittee.name}</span>}
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                ...(STATUS_COLORS[m.status] || STATUS_COLORS.draft),
              }}>{m.status}</span>
              <button onClick={(e) => handleDelete(e, m.id)} style={{
                padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#dc2626',
              }}>Delete</button>
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
