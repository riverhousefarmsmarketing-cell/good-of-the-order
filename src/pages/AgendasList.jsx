import { Link } from 'react-router-dom';
import { useAgendas } from '../hooks/useAgendas.jsx';

const MEETING_TYPES = [
  { value: 'BOARD', label: 'Board' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'SUBCOMMITTEE', label: 'Subcommittee' },
];

const STATUS_COLORS = {
  draft: { bg: '#fef3c7', color: '#92400e' },
  final: { bg: '#dbeafe', color: '#1e40af' },
  sent: { bg: '#dcfce7', color: '#166534' },
};

export default function AgendasListPage() {
  const { agendasList, loading } = useAgendas();

  const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>Loading agendas...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: 0 }}>Agendas</h1>
        <Link to="/agendas/new" style={{
          padding: '10px 20px', background: '#1e293b', color: 'white',
          border: 'none', borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: 14,
        }}>+ New Agenda</Link>
      </div>

      {agendasList.length === 0 ? (
        <div style={{ padding: 48, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
          No agendas created yet.
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {agendasList.map(a => {
            const sc = STATUS_COLORS[a.status] || STATUS_COLORS.draft;
            return (
              <Link key={a.id} to={`/agendas/${a.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit',
              }}>
                <div style={{ fontSize: 13, color: '#64748b', minWidth: 100 }}>{fmtDate(a.meeting_date)}</div>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: a.meeting_type === 'BOARD' ? '#dbeafe' : '#f3e8ff', color: a.meeting_type === 'BOARD' ? '#1e40af' : '#7c3aed' }}>{a.meeting_type}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{MEETING_TYPES.find(t => t.value === a.meeting_type)?.label} Meeting</span>
                  {a.subcommittee?.name && <span style={{ color: '#64748b', fontSize: 13 }}> — {a.subcommittee.name}</span>}
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{a.status}</span>
                <span style={{ color: '#9ca3af' }}>→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
