import { useEffect } from 'react';
import { useEmail } from '../hooks/useEmail.jsx';

export default function EmailHistoryPage() {
  const { logs, logsLoading, fetchLogs } = useEmail();

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' }}>Email History</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Log of all minutes and agenda distributions.</p>
      </div>

      {logsLoading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 48, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', color: '#94a3b8' }}>
          No emails sent yet.
        </div>
      ) : (
        <div>
          {logs.map(log => (
            <div key={log.id} style={{
              background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: 16, marginBottom: 8, display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: log.document_type === 'minutes' ? '#dbeafe' : '#f3e8ff',
                color: log.document_type === 'minutes' ? '#1e40af' : '#7c3aed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600, flexShrink: 0,
              }}>
                {log.document_type === 'minutes' ? '≡' : '☰'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: 10,
                    background: log.document_type === 'minutes' ? '#dbeafe' : '#f3e8ff',
                    color: log.document_type === 'minutes' ? '#1e40af' : '#7c3aed',
                  }}>{log.document_type}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{log.email_subject || 'No subject'}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 10,
                    background: log.delivery_status === 'sent' ? '#dcfce7' : log.delivery_status === 'failed' ? '#fef2f2' : '#fef3c7',
                    color: log.delivery_status === 'sent' ? '#166534' : log.delivery_status === 'failed' ? '#dc2626' : '#92400e',
                  }}>{log.delivery_status}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {new Date(log.sent_at).toLocaleString()}
                  {log.sent_by_profile?.full_name && ` — Sent by ${log.sent_by_profile.full_name}`}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {log.recipient_emails?.length} recipient{log.recipient_emails?.length !== 1 ? 's' : ''}:
                  {' '}{(log.recipient_emails || []).slice(0, 5).join(', ')}
                  {log.recipient_emails?.length > 5 && ` +${log.recipient_emails.length - 5} more`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
