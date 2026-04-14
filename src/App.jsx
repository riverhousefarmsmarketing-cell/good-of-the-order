import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth';
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
import TermsPage from './pages/legal/Terms';
import PrivacyPage from './pages/legal/Privacy';

/**
 * LandingOrDashboard — shows LandingPage for visitors, Dashboard for logged-in users.
 * BUG-061 FIX: useAuth() now reads from shared AuthContext instead of creating independent state.
 */
function LandingOrDashboard() {
  const { user, profile, organization, loading, loadingSlow } = useAuth();

  if (loading) return <LoadingScreen slow={loadingSlow} />;

  // Not logged in → show marketing landing page
  if (!user) return <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>;

  // BUG-083 FIX: User is set but profile hasn't loaded yet — show loading
  // This race condition happens after signup when onAuthStateChange fires
  // before fetchProfile completes
  if (!profile) return <LoadingScreen />;

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

  // BUG-083 FIX: User set but profile still loading
  if (!profile) return <LoadingScreen />;

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

/**
 * BUG-086 FIX: Role-based route guard.
 * Wraps routes that require a minimum role level.
 * Roles: admin > editor > viewer
 */
function RoleGuard({ minRole, children }) {
  const { profile } = useAuth();
  const roleLevel = { admin: 3, editor: 2, viewer: 1 };
  const userLevel = roleLevel[profile?.role] || 0;
  const requiredLevel = roleLevel[minRole] || 0;

  if (userLevel < requiredLevel) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        <h2 style={{ color: '#1e293b', marginBottom: 8 }}>Access Restricted</h2>
        <p>You need {minRole} permissions to access this page.</p>
        <a href="/" style={{ marginTop: 16, display: 'inline-block', padding: '10px 20px', background: '#1e293b', color: 'white', border: 'none', borderRadius: 6, textDecoration: 'none' }}>← Back to Dashboard</a>
      </div>
    );
  }

  return children;
}

/**
 * BUG-061 FIX: App is now wrapped in a single AuthProvider.
 * All useAuth() calls throughout the app share the same state.
 * Previously each useAuth() call created independent state + fired
 * independent getSession() + fetchProfile() queries.
 *
 * AuthProvider is placed OUTSIDE BrowserRouter because auth state
 * doesn't depend on routing, and this prevents re-fetching on navigation.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingOrDashboard />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<div style={{padding:40,fontFamily:"sans-serif"}}><h1>TERMS STUB - routing works</h1></div>} />
              <Route path="/test-route-abc123" element={<div style={{padding:40,background:"lime",fontFamily:"sans-serif"}}><h1>TEST ROUTE WORKS</h1><p>path: {window.location.pathname}</p></div>} />
              <Route path="/privacy" element={<div style={{padding:40,fontFamily:"sans-serif"}}><h1>PRIVACY STUB - routing works</h1></div>} />

              {/* Protected routes — BUG-086 FIX: Role guards on write/admin routes */}
              <Route element={<ProtectedLayout />}>
                {/* Viewer+ (all authenticated users) */}
                <Route path="minutes" element={<MinutesArchivePage />} />
                <Route path="minutes/:id" element={<MinutesEditPage />} />
                <Route path="agendas" element={<AgendasListPage />} />
                <Route path="agendas/:id" element={<AgendaEditPage />} />
                <Route path="events" element={<EventsListPage />} />
                <Route path="events/:id" element={<EventEditPage />} />
                <Route path="email-history" element={<EmailHistoryPage />} />

                {/* Editor+ (admin or editor) */}
                <Route path="minutes/new" element={<RoleGuard minRole="editor"><MinutesEditPage /></RoleGuard>} />
                <Route path="agendas/new" element={<RoleGuard minRole="editor"><AgendaEditPage /></RoleGuard>} />
                <Route path="events/new" element={<RoleGuard minRole="editor"><EventEditPage /></RoleGuard>} />

                {/* Admin only */}
                <Route path="members" element={<RoleGuard minRole="admin"><MembersPage /></RoleGuard>} />
                <Route path="distribution" element={<RoleGuard minRole="admin"><DistributionListPage /></RoleGuard>} />
                <Route path="settings" element={<RoleGuard minRole="admin"><SettingsPage /></RoleGuard>} />

              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
