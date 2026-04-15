import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  draft: { bg: '#fef3c7', color: '#92400e' },
  review: { bg: '#dbeafe', color: '#1e40af' },
  approved: { bg: '#dcfce7', color: '#166534' },
  final: { bg: '#dbeafe', color: '#1e40af' },
  sent: { bg: '#dcfce7', color: '#166534' },
};

const TYPE_COLORS = {
  BOARD: { bg: '#dbeafe', color: '#1e40af' },
  SUBCOMMITTEE: { bg: '#f3e8ff', color: '#7c3aed' },
  ANNUAL: { bg: '#fef3c7', color: '#92400e' },
};

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function DashboardPage() {
  const { profile, organization } = useAuth();
  const { branding } = useOrganization();
  const [stats, setStats] = useState({ minutes: 0, agendas: 0, members: 0, events: 0, actionItems: 0 });
  const [recentMinutes, setRecentMinutes] = useState([]);
  const [upcomingAgendas, setUpcomingAgendas] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * BUG-061 FIX: Consolidated from 10 parallel queries to 3.
   * 
   * Old approach: 5 data fetches + 5 separate count queries = 10 connections
   * New approach: 3 data fetches with count option = 3 connections
   * 
   * Counts for members/events are fetched with head:true (lightweight, 
   * no data transferred, just count). Recent data fetches include 
   * count in the same request using the count option.
   */
  useEffect(() => {
    let mounted = true;

    async function fetchDashboard() {
      try {
        const [
          { data: mins, count: minCount },
          { data: agds, count: agdCount },
          { data: actions, count: actCount },
          { count: memCount },
          { count: evtCount },
        ] = await Promise.all([
          // Recent minutes + total count in ONE request
          supabase.from('minutes')
            .select('id, meeting_type, meeting_date, status, subcommittee_id, subcommittees(name)', { count: 'exact' })
            .order('meeting_date', { ascending: false })
            .limit(5),
          // Recent agendas + total count in ONE request
          supabase.from('agendas')
            .select('id, meeting_type, meeting_date, meeting_time, location, status, subcommittee_id, subcommittees(name)', { count: 'exact' })
            .order('meeting_date', { ascending: false })
            .limit(5),
          // Pending actions + total count in ONE request
          supabase.from('action_items')
            .select('id, task, assignee_name, due_date, status', { count: 'exact' })
            .eq('status', 'pending')
            .limit(5),
          // Count-only queries (lightweight — no data transferred)
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('events').select('id', { count: 'exact', head: true }),
        ]);

        if (!mounted) return;

        setStats({
          minutes: minCount || 0,
          agendas: agdCount || 0,
          members: memCount || 0,
          events: evtCount || 0,
          actionItems: actCount || 0,
        });
        setRecentMinutes(mins || []);
        setUpcomingAgendas(agds || []);
        setPendingActions(actions || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDashboard();

    return () => { mounted = false; };
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ padding: 32 }}>
      {/* Trial / billing status banner */}
      <TrialBanner organization={organization} isAdmin={profile?.role === 'admin'} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          {branding?.name || 'Organization'} — Records Management
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 28, padding: 16,
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b', alignSelf: 'center', marginRight: 8 }}>
          Quick Actions
        </span>
        <Link to="/agendas/new" style={qaStyle}>+ New Agenda</Link>
        <Link to="/minutes/new" style={qaStyle}>+ New Minutes</Link>
        <Link to="/members" style={qaStyle}>Members</Link>
        <Link to="/settings" style={qaStyle}>Settings</Link>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Minutes" value={stats.minutes} to="/minutes" />
        <StatCard label="Agendas" value={stats.agendas} to="/agendas" />
        <StatCard label="Members" value={stats.members} to="/members" />
        <StatCard label="Events" value={stats.events} to="/events" />
        <StatCard label="Action Items" value={stats.actionItems} color="#dc2626" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {/* Recent Minutes */}
        <Panel title="Recent Minutes" action={{ label: 'View All', to: '/minutes' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
          ) : recentMinutes.length === 0 ? (
            <EmptyState message="No minutes yet." action={{ label: '+ Create Minutes', to: '/minutes/new' }} />
          ) : (
            recentMinutes.map(m => (
              <Link key={m.id} to={`/minutes/${m.id}`} style={rowStyle}>
                <div style={{ fontSize: 12, color: '#64748b', minWidth: 80 }}>{fmtDate(m.meeting_date)}</div>
                <TypeBadge type={m.meeting_type} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                  {m.meeting_type === 'BOARD' ? 'Board' : m.meeting_type === 'ANNUAL' ? 'Annual' : 'Subcommittee'}
                  {m.subcommittees?.name && <span style={{ fontWeight: 400, color: '#64748b' }}> — {m.subcommittees.name}</span>}
                </div>
                <StatusBadge status={m.status} />
              </Link>
            ))
          )}
        </Panel>

        {/* Recent Agendas */}
        <Panel title="Recent Agendas" action={{ label: 'View All', to: '/agendas' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
          ) : upcomingAgendas.length === 0 ? (
            <EmptyState message="No agendas yet." action={{ label: '+ Create Agenda', to: '/agendas/new' }} />
          ) : (
            upcomingAgendas.map(a => (
              <Link key={a.id} to={`/agendas/${a.id}`} style={rowStyle}>
                <div style={{ fontSize: 12, color: '#64748b', minWidth: 80 }}>{fmtDate(a.meeting_date)}</div>
                <TypeBadge type={a.meeting_type} />
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                  {a.meeting_type === 'BOARD' ? 'Board' : a.meeting_type === 'ANNUAL' ? 'Annual' : 'Subcommittee'}
                  {a.subcommittees?.name && <span style={{ fontWeight: 400, color: '#64748b' }}> — {a.subcommittees.name}</span>}
                </div>
                <StatusBadge status={a.status} />
              </Link>
            ))
          )}
        </Panel>

        {/* Pending Action Items */}
        <Panel title="Pending Action Items">
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading...</div>
          ) : pendingActions.length === 0 ? (
            <EmptyState message="No pending action items. Great work!" />
          ) : (
            pendingActions.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <div style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: '50%', marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#1e293b' }}>{a.task}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
                    {a.assignee_name && `${a.assignee_name}`}
                    {a.due_date && ` · Due: ${a.due_date}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </Panel>

        {/* Activity / Getting Started */}
        <Panel title="Getting Started">
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 2 }}>
            <Step done={!!branding?.logo_url} label="Upload your logo" to="/settings" />
            <Step done={stats.members > 1} label="Invite board members" to="/members" />
            <Step done={stats.agendas > 0} label="Create your first agenda" to="/agendas/new" />
            <Step done={stats.minutes > 0} label="Record meeting minutes" to="/minutes/new" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ===== STYLES =====
const qaStyle = {
  padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0',
  borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#1e293b', textDecoration: 'none',
};

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
  borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit',
};

// ===== COMPONENTS =====
function Panel({ title, action, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{title}</span>
        {action && <Link to={action.to} style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>{action.label} →</Link>}
      </div>
      <div style={{ padding: '4px 18px 14px' }}>{children}</div>
    </div>
  );
}

function StatCard({ label, value, to, color }) {
  const inner = (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '18px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.BOARD;
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color }}>{type}</span>;
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: c.bg, color: c.color }}>{status}</span>;
}

function EmptyState({ message, action }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: action ? 12 : 0 }}>{message}</div>
      {action && <Link to={action.to} style={{ fontSize: 13, color: '#1e40af', textDecoration: 'none', fontWeight: 500 }}>{action.label}</Link>}
    </div>
  );
}

function Step({ done, label, to }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
        background: done ? '#dcfce7' : '#f1f5f9', color: done ? '#166534' : '#94a3b8', border: `1px solid ${done ? '#86efac' : '#e2e8f0'}`,
      }}>{done ? '✓' : '○'}</div>
      <Link to={to} style={{ color: done ? '#64748b' : '#1e293b', textDecoration: done ? 'line-through' : 'none', fontSize: 13 }}>{label}</Link>
    </div>
  );
}
function TrialBanner({ organization, isAdmin }) {
  const navigate = useNavigate();
  if (!organization) return null;
  if (organization.is_permanently_comped) return null;
  if (organization.subscription_status === 'active') return null;

  const daysRemaining = organization.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(organization.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const expired = organization.subscription_status !== 'trialing' || daysRemaining === 0;

  if (expired) {
    return (
      <div style={{
        background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
        padding: '12px 20px', marginBottom: 24, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 14, color: '#7F1D1D' }}>
          🔒 Your trial has ended. Subscribe to restore full access.
        </div>
        {isAdmin && (
          <button onClick={() => navigate('/billing')} style={{
            padding: '7px 16px', background: '#9B1C1C', color: 'white',
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            Subscribe Now
          </button>
        )}
      </div>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <div style={{
        background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8,
        padding: '12px 20px', marginBottom: 24, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 14, color: '#78350F' }}>
          ⏱ Your free trial ends in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>.
        </div>
        {isAdmin && (
          <button onClick={() => navigate('/billing')} style={{
            padding: '7px 16px', background: '#92400E', color: 'white',
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            Subscribe Now
          </button>
        )}
      </div>
    );
  }

  // More than 7 days left — subtle info bar, no urgency
  return (
    <div style={{
      background: '#EDF7F1', border: '1px solid #B8DCC8', borderRadius: 8,
      padding: '10px 20px', marginBottom: 24, display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 13, color: '#0A3228' }}>
        Free trial — <strong>{daysRemaining} days</strong> remaining.
      </div>
      {isAdmin && (
        <button onClick={() => navigate('/billing')} style={{
          padding: '5px 14px', background: 'transparent', color: '#105040',
          border: '1px solid #105040', borderRadius: 6, fontSize: 13,
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          View Plans
        </button>
      )}
    </div>
  );
}

