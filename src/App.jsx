import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { OrganizationProvider } from './hooks/useOrganization';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import DashboardPage from './pages/Dashboard';
import MembersPage from './pages/Members';
import SettingsPage from './pages/Settings';
import AppLayout from './components/layout/AppLayout';

function AppRoutes() {
  const { user, profile, organization, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid #e2e8f0',
            borderTopColor: '#475569',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <div style={{ color: '#64748b', fontSize: 14 }}>Loading GoodOfTheOrder...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <OrganizationProvider organization={organization}>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/minutes" element={<PlaceholderPage title="Minutes Archive" />} />
                  <Route path="/minutes/new" element={<PlaceholderPage title="Create Minutes" />} />
                  <Route path="/minutes/:id" element={<PlaceholderPage title="Edit Minutes" />} />
                  <Route path="/agendas" element={<PlaceholderPage title="Agendas" />} />
                  <Route path="/agendas/new" element={<PlaceholderPage title="Create Agenda" />} />
                  <Route path="/agendas/:id" element={<PlaceholderPage title="Edit Agenda" />} />
                  <Route path="/events" element={<PlaceholderPage title="Events" />} />
                  <Route path="/events/:id" element={<PlaceholderPage title="Edit Event" />} />
                  <Route path="/members" element={<MembersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </OrganizationProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>{title}</h1>
      <p style={{ color: '#64748b' }}>This page will be built in Week 3. The database and auth are ready.</p>
      <div style={{
        marginTop: 24,
        padding: 20,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        color: '#64748b',
        fontSize: 14,
      }}>
        Week 1 deliverables: Supabase schema, auth flow, project scaffolding, and routing.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
