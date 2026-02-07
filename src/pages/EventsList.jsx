import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents.jsx';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/Modal';

const PURPOSE_COLORS = {
  Education: '#dbeafe', Advocacy: '#fee2e2', Membership: '#dcfce7',
  Governance: '#f3e8ff', Fundraising: '#fef3c7', Community: '#e0f2fe', Other: '#f1f5f9',
};

const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function EventsListPage() {
  const { eventsList, loading, deleteEvent } = useEvents();
  const [view, setView] = useState('list');
  const [calMonth, setCalMonth] = useState(new Date());
const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = eventsList.filter(e => e.date && new Date(e.date + 'T23:59:59') >= now);
  const past = eventsList.filter(e => e.date && new Date(e.date + 'T23:59:59') < now);

  // Calendar helpers
  const monthStart = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const startDay = monthStart.getDay();
  const monthEvents = eventsList.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear();
  });
  const eventsForDay = (day) => monthEvents.filter(e => new Date(e.date + 'T12:00:00').getDate() === day);

  const handleDelete = async () => {
    try { await deleteEvent(deleteTarget); setDeleteTarget(null); } catch (err) { toast.error('Unable to delete event.'); setDeleteTarget(null); }
  };

  if (loading) return <div style={{ padding: 32, color: '#64748b' }}>Loading events...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: 0 }}>Events</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('list')} style={tabBtn(view === 'list')}>List</button>
          <button onClick={() => setView('calendar')} style={tabBtn(view === 'calendar')}>Calendar</button>
          <Link to="/events/new" style={{
            padding: '10px 20px', background: '#1e293b', color: 'white',
            border: 'none', borderRadius: 6, fontWeight: 600, textDecoration: 'none', fontSize: 14, marginLeft: 8,
          }}>+ New Event</Link>
        </div>
      </div>

      {view === 'calendar' ? (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))} style={navBtn}>← Prev</button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))} style={navBtn}>Next →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e5e7eb' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ background: '#f9fafb', padding: 8, textAlign: 'center', fontWeight: 600, fontSize: 12, color: '#64748b' }}>{d}</div>
            ))}
            {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} style={{ background: 'white', padding: 8, minHeight: 80 }} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const de = eventsForDay(day);
              return (
                <div key={day} style={{ background: 'white', padding: 8, minHeight: 80 }}>
                  <div style={{ fontSize: 13, fontWeight: de.length > 0 ? 700 : 400, color: de.length > 0 ? '#1e40af' : '#374151' }}>{day}</div>
                  {de.slice(0, 2).map(ev => (
                    <Link key={ev.id} to={`/events/${ev.id}`} style={{
                      display: 'block', fontSize: 10, padding: '2px 4px', marginTop: 3,
                      background: ev.is_orphaned ? '#fef3c7' : '#dbeafe', borderRadius: 3,
                      textDecoration: 'none', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{ev.name}</Link>
                  ))}
                  {de.length > 2 && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>+{de.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title={`Upcoming (${upcoming.length})`} color="#059669">
             {upcoming.map(e => <EventRow key={e.id} event={e} onDelete={setDeleteTarget} />)}
            </Section>
          )}
          {past.length > 0 && (
            <Section title={`Past (${past.length})`} color="#64748b">
              {past.slice(0, 10).map(e => <EventRow key={e.id} event={e} onDelete={setDeleteTarget} faded />)}
            </Section>
          )}
          {eventsList.length === 0 && (
            <div style={{ padding: 64, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📅</div>
              <div style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No events yet</div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Events can be created from meeting minutes or added directly.</div>
              <Link to="/events/new" style={{ display: 'inline-block', padding: '10px 20px', background: '#1e293b', color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>+ Create Event</Link>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="This will permanently delete this event."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function EventRow({ event: e, onDelete, faded }) {
  return (
    <Link to={`/events/${e.id}`} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
      borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: 'inherit', opacity: faded ? 0.6 : 1,
    }}>
      <div style={{
        background: '#f0fdf4', borderRadius: 6, padding: '6px 10px', textAlign: 'center', minWidth: 44,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a472a' }}>{new Date(e.date + 'T12:00:00').getDate()}</div>
        <div style={{ fontSize: 10, color: '#1a472a', textTransform: 'uppercase', fontWeight: 600 }}>
          {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {e.name}
          {e.is_orphaned && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4 }}>⚠ Orphaned</span>}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {e.time || 'TBD'} · {e.location || 'TBD'}
          {e.subcommittees?.name && <span> · {e.subcommittees.name}</span>}
        </div>
      </div>
      {e.purpose && <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 500, background: PURPOSE_COLORS[e.purpose] || '#f1f5f9', color: '#374151' }}>{e.purpose}</span>}
      <button onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onDelete(e.id); }} style={{
        padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#dc2626',
      }}>Delete</button>
      <span style={{ color: '#9ca3af' }}>→</span>
    </Link>
  );
}

const tabBtn = (active) => ({
  padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
  background: active ? '#1e293b' : 'white', color: active ? 'white' : '#374151',
});
const navBtn = { padding: '8px 16px', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
