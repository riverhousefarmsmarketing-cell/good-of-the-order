import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMinutes } from '../hooks/useMinutes.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/Modal';

const MEETING_TYPES = [
  { value: 'BOARD', label: 'Board' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SUBCOMMITTEE', label: 'Subcommittee' },
];

const STATUS_COLORS = {
  draft: { bg: '#fef3c7', color: '#92400e' },
  review: { bg: '#dbeafe', color: '#1e40af' },
  approved: { bg: '#dcfce7', color: '#166534' },
  revised: { bg: '#e2e8f0', color: '#475569' },
};

export default function MinutesArchivePage() {
  const { minutesList, loading, deleteMinutes, searchMinutes } = useMinutes();
  const { isEditor } = useAuth();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deepSearchIds, setDeepSearchIds] = useState(null); // null = no deep filter active
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Debounced deep search — triggers 500ms after typing stops
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) { setDeepSearchIds(null); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const ids = await searchMinutes(searchQuery);
        setDeepSearchIds(ids);
      } catch (err) {
        console.error('Search error:', err);
        setDeepSearchIds(null);
      }
      setSearching(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchMinutes]);

  const filtered = minutesList
    .filter(m => filter === 'all' || m.meeting_type === filter)
    .filter(m => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      // Client-side: match on list-level fields (date, type, subcommittee, status)
      const dateStr = m.meeting_date ? new Date(m.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase() : '';
      const type = MEETING_TYPES.find(t => t.value === m.meeting_type)?.label?.toLowerCase() || '';
      const sc = m.subcommittee?.name?.toLowerCase() || '';
      const status = m.status?.toLowerCase() || '';
      const clientMatch = dateStr.includes(q) || type.includes(q) || sc.includes(q) || status.includes(q);
      // Server-side: match on deep content (motions, reports, business items, etc.)
      const deepMatch = deepSearchIds ? deepSearchIds.has(m.id) : false;
      return clientMatch || deepMatch;
    });

 const handleDelete = async () => {
    try { await deleteMinutes(deleteTarget); setDeleteTarget(null); } catch (err) { toast.error('Unable to delete minutes.'); setDeleteTarget(null); }
  };

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>Loading minutes...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: 0 }}>Minutes Archive</h1>
        {isEditor && <Link to="/minutes/new" style={{
          padding: '10px 20px', background: '#1e293b', color: 'white',
          border: 'none', borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: 14,
        }}>+ New Minutes</Link>}
      </div>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search minutes by date, type, content, motions, reports..."
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
        />
        {searching && <span style={{ position: 'absolute', right: 12, top: 12, fontSize: 12, color: '#94a3b8' }}>Searching...</span>}
        {searchQuery.trim() && !searching && <span style={{ position: 'absolute', right: 12, top: 12, fontSize: 12, color: '#94a3b8' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>}
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
        <div style={{ padding: 64, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📄</div>
          <div style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No minutes found</div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Create your first meeting minutes to start building your records archive.</div>
          <Link to="/minutes/new" style={{ display: 'inline-block', padding: '10px 20px', background: '#1e293b', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>+ Create Minutes</Link>
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
              }}>{m.status === 'approved' ? 'Approved' : m.status === 'review' ? 'In Review' : m.status === 'revised' ? 'Revised' : 'Draft'}{m.revision_number > 0 && m.status !== 'revised' ? ` (rev. ${m.revision_number})` : ''}</span>
             {isEditor && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(m.id); }} style={{
                padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#dc2626',
              }}>Delete</button>}
              <span style={{ color: '#9ca3af' }}>→</span>
            </Link>
          ))}
        </div>
      )}
<ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Minutes"
        message="This will permanently delete this minutes record."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
