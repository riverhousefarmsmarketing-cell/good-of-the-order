import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { OrganizationProvider } from './hooks/useOrganization.jsx';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import React, { Suspense } from 'react';

// BUG-506 FIX: Lazy-load heavy pages — only fetched when user navigates to them
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const MinutesEditPage = React.lazy(() => import('./pages/MinutesEdit'));
const AgendaEditPage = React.lazy(() => import('./pages/AgendaEdit'));
const EventEditPage = React.lazy(() => import('./pages/EventEdit'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const DistributionListPage = React.lazy(() => import('./pages/DistributionList'));
const EmailHistoryPage = React.lazy(() => import('./pages/EmailHistory'));

// Eagerly load lightweight/critical-path pages
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordReset';
import DashboardPage from './pages/Dashboard';
import MembersPage from './pages/Members';
import MinutesArchivePage from './pages/MinutesArchive';
import AgendasListPage from './pages/AgendasList';
import EventsListPage from './pages/EventsList';
import AppLayout from './components/layout/AppLayout';

/**
 * LandingOrDashboard — shows LandingPage for visitors, Dashboard for logged-in users.
 */
function LandingOrDashboard() {
  const { user, profile, organization, loading, loadingSlow } = useAuth();

  if (loading) return <LoadingScreen slow={loadingSlow} />;

  // Not logged in → show marketing landing page
  if (!user) return <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>;

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

  // BUG-013: Check email verification
  if (user && !user.email_confirmed_at) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f8fafc',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24,
          }}>✉</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>Check your email</h2>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
            We sent a verification link to <strong>{user.email}</strong>. Please verify your email to continue.
          </p>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 16, padding: '10px 24px', background: '#1e293b',
            color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14,
          }}>I've verified — refresh</button>
        </div>
      </div>
    );
  }

  return (
    <OrganizationProvider organization={organization}>
      <AppLayout>
        <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading...</div>}>
          <Outlet />
        </Suspense>
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
