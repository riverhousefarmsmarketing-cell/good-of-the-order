import { useAuth } from '../../hooks/useAuth';
import { useOrganization } from '../../hooks/useOrganization';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '□' },
  { path: '/agendas', label: 'Agendas', icon: '☰' },
  { path: '/minutes', label: 'Minutes', icon: '≡' },
  { path: '/events', label: 'Events', icon: '◇' },
  { path: '/members', label: 'Members', icon: '○' },
];

export default function AppLayout({ children }) {
  const { profile, signOut, isAdmin } = useAuth();
  const { branding } = useOrganization();
  const location = useLocation();

  const navBg = branding?.primaryColor || '#1e293b';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Top Navigation */}
      <nav style={{
        background: navBg,
        color: 'white',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        gap: 8,
      }}>
        {/* Org branding */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white', marginRight: 32 }}>
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: 4 }} />
          ) : (
            <div style={{
              width: 32, height: 32,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}>
              {branding?.slug?.substring(0, 2).toUpperCase() || 'GO'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>
              {branding?.name || 'GoodOfTheOrder'}
            </div>
            <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Records Management
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: 'white',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && (
            <Link
              to="/settings"
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                textDecoration: 'none',
                background: location.pathname === '/settings' ? 'rgba(255,255,255,0.12)' : 'transparent',
              }}
            >
              Settings
            </Link>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}>
              {profile?.full_name?.split(' ').map((n) => n[0]).join('') || '?'}
            </div>
            <button
              onClick={signOut}
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.8)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main style={{ maxWidth: 1100, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}
