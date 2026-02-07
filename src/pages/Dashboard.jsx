import { useAuth } from '../hooks/useAuth.jsx';
import { useOrganization } from '../hooks/useOrganization.jsx';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { profile } = useAuth();
  const { branding } = useOrganization();

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>
          Minutes Dashboard
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          {branding?.name || 'Organization'} - Official Records
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 28,
        padding: 16,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b', alignSelf: 'center', marginRight: 8 }}>
          Quick Actions
        </span>
        <Link to="/agendas/new" style={quickActionStyle}>+ New Agenda</Link>
        <Link to="/minutes/new" style={quickActionStyle}>+ New Minutes</Link>
        <Link to="/events" style={quickActionStyle}>View Events</Link>
        <Link to="/members" style={quickActionStyle}>Members</Link>
      </div>

      {/* Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Minutes */}
        <Panel title="Recent Minutes" action={{ label: 'View All', to: '/minutes' }}>
          <EmptyState message="No minutes recorded yet. Create your first minutes after a meeting." />
        </Panel>

        {/* Upcoming Agendas */}
        <Panel title="Upcoming Agendas" action={{ label: 'View All', to: '/agendas' }}>
          <EmptyState message="No upcoming agendas. Create one before your next meeting." />
        </Panel>

        {/* Upcoming Events */}
        <Panel title="Upcoming Events" action={{ label: 'View All', to: '/events' }}>
          <EmptyState message="No events scheduled. Events are created from meeting minutes." />
        </Panel>

        {/* Overview */}
        <Panel title="Overview">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <StatBlock label="Total Minutes" value="0" />
            <StatBlock label="Total Agendas" value="0" />
            <StatBlock label="Active Members" value="1" />
            <StatBlock label="Upcoming Events" value="0" />
          </div>
        </Panel>
      </div>

      {/* Setup checklist for new orgs */}
      <div style={{
        marginTop: 28,
        padding: 20,
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: 8,
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#92400e', marginBottom: 8 }}>
          Getting Started
        </div>
        <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
          1. Go to <Link to="/settings" style={{ color: '#1e40af' }}>Settings</Link> to upload your logo and set branding colors.{'\n'}
          2. <Link to="/members" style={{ color: '#1e40af' }}>Invite your board members</Link> to join.{'\n'}
          3. <Link to="/agendas/new" style={{ color: '#1e40af' }}>Create your first agenda</Link> for your next meeting.
        </div>
      </div>
    </div>
  );
}

const quickActionStyle = {
  padding: '8px 14px',
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  color: '#1e293b',
  textDecoration: 'none',
  cursor: 'pointer',
};

function Panel({ title, action, children }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 18px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{title}</span>
        {action && (
          <Link to={action.to} style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
            {action.label} &rarr;
          </Link>
        )}
      </div>
      <div style={{ padding: 18 }}>
        {children}
      </div>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: 12 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      padding: 24,
      textAlign: 'center',
      color: '#94a3b8',
      fontSize: 13,
    }}>
      {message}
    </div>
  );
}
