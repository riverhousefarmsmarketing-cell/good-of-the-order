import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { OrganizationProvider } from './hooks/useOrganization';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import DashboardPage from './pages/Dashboard';
import MembersPage from './pages/Members';
import SettingsPage from './pages/Settings';
import MinutesArchivePage from './pages/MinutesArchive';
import MinutesEditPage from './pages/MinutesEdit';
import AgendasListPage from './pages/AgendasList';
import AgendaEditPage from './pages/AgendaEdit';
import AppLayout from './components/layout/AppLayout';

function ProtectedLayout() {
  const { user, profile, organization, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f8fafc',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #e2e8f0',
            borderTopColor: '#475569', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <div style={{ color: '#64748b', fontSize: 14 }}>Loading...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <OrganizationProvider organization={organization}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </OrganizationProvider>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>{title}</h1>
      <p style={{ color: '#64748b' }}>Coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="minutes" element={<MinutesArchivePage />} />
          <Route path="minutes/new" element={<MinutesEditPage />} />
          <Route path="minutes/:id" element={<MinutesEditPage />} />
          <Route path="agendas" element={<AgendasListPage />} />
          <Route path="agendas/new" element={<AgendaEditPage />} />
          <Route path="agendas/:id" element={<AgendaEditPage />} />
          <Route path="events" element={<PlaceholderPage title="Events" />} />
          <Route path="events/:id" element={<PlaceholderPage title="Edit Event" />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
