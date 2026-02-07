import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { OrganizationProvider } from './hooks/useOrganization.jsx';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordReset';
import DashboardPage from './pages/Dashboard';
import MembersPage from './pages/Members';
import SettingsPage from './pages/Settings';
import MinutesArchivePage from './pages/MinutesArchive';
import MinutesEditPage from './pages/MinutesEdit';
import AgendasListPage from './pages/AgendasList';
import AgendaEditPage from './pages/AgendaEdit';
import EventsListPage from './pages/EventsList';
import EventEditPage from './pages/EventEdit';
import DistributionListPage from './pages/DistributionList';
import EmailHistoryPage from './pages/EmailHistory';
import AppLayout from './components/layout/AppLayout';

/**
 * LandingOrDashboard — shows LandingPage for visitors, Dashboard for logged-in users.
 */
function LandingOrDashboard() {
  const { user, profile, organization, loading, loadingSlow } = useAuth();

  if (loading) return <LoadingScreen slow={loadingSlow} />;

  // Not logged in → show marketing landing page
  if (!user) return <LandingPage />;

  // Logged in → show dashboard inside app layout
  return (
    <OrganizationProvider organization={organization}>
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    </OrganizationProvider>
  );
}

function ProtectedLayout() {
  const { user, profile, organization, loading, loadingSlow } = useAuth();

  if (loading) return <LoadingScreen slow={loadingSlow} />;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <OrganizationProvider organization={organization}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </OrganizationProvider>
  );
}

function LoadingScreen({ slow }) {
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
        <div style={{ color: '#64748b', fontSize: 14 }}>
          {slow ? 'Taking longer than expected...' : 'Loading...'}
        </div>
        {slow && (
          <button onClick={() => window.location.reload()} style={{
            marginTop: 12, padding: '8px 20px', background: '#475569',
            color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}>Retry</button>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingOrDashboard />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="minutes" element={<MinutesArchivePage />} />
              <Route path="minutes/new" element={<MinutesEditPage />} />
              <Route path="minutes/:id" element={<MinutesEditPage />} />
              <Route path="agendas" element={<AgendasListPage />} />
              <Route path="agendas/new" element={<AgendaEditPage />} />
              <Route path="agendas/:id" element={<AgendaEditPage />} />
              <Route path="events" element={<EventsListPage />} />
              <Route path="events/new" element={<EventEditPage />} />
              <Route path="events/:id" element={<EventEditPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="distribution" element={<DistributionListPage />} />
              <Route path="email-history" element={<EmailHistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
