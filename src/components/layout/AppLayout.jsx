import { useAuth } from '../../hooks/useAuth.jsx';
import { useOrganization } from '../../hooks/useOrganization.jsx';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '□' },
  { path: '/agendas', label: 'Agendas', icon: '☰' },
  { path: '/minutes', label: 'Minutes', icon: '≡', exact: true },
  { path: '/minutes/new', label: 'New', icon: '▤', activePath: '/minutes/new', minRole: 'editor' },
  { path: '/events', label: 'Events', icon: '◇' },
  { path: '/members', label: 'Members', icon: '○', minRole: 'admin' },
  { path: '/distribution', label: 'Distribution', icon: '✉', minRole: 'admin' },
  { path: '/email-history', label: 'Email Log', icon: '↗' },
];

export default function AppLayout({ children }) {
  const { profile, signOut, isAdmin, isEditor } = useAuth();
  const { branding } = useOrganization();
  const location = useLocation();

  // BUG-814 FIX: Sanitize color — only allow valid hex colors to prevent CSS injection
  const rawColor = branding?.primaryColor || '#1e293b';
  const navBg = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#1e293b';

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
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        gap: 8,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        position: 'relative', // BUG-022: for mobile scroll fade
        '--nav-bg': navBg,
      }}>
        {/* Org branding */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'white', marginRight: 24, flexShrink: 0 }}>
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
        <div style={{ display: 'flex', gap: 2, flex: 1, flexShrink: 0 }}>
          {NAV_ITEMS.filter(item => {
            if (!item.minRole) return true;
            if (item.minRole === 'editor') return isEditor;
            if (item.minRole === 'admin') return isAdmin;
            return true;
          }).map((item) => {
            let isActive;
            if (item.exact) {
              // Archive: active on /minutes and /minutes/:id (but not /minutes/new)
              isActive = location.pathname === '/minutes' || (location.pathname.startsWith('/minutes/') && location.pathname !== '/minutes/new');
            } else if (item.activePath) {
              isActive = location.pathname === item.activePath;
            } else if (item.path === '/') {
              isActive = location.pathname === '/';
            } else {
              isActive = location.pathname.startsWith(item.path);
            }
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
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
        {children}
      </main>
      <style>{`
        /* BUG-501 FIX: Mobile responsive breakpoints */
        /* BUG-821 FIX: Use class selectors instead of fragile style attribute matching */
        @media (max-width: 768px) {
          nav a[style] { padding: 8px 10px !important; font-size: 12px !important; white-space: nowrap; }
          main > div { padding-left: 12px !important; padding-right: 12px !important; }
          /* Stack 2-column grids to single column */
          .goto-grid-2 { grid-template-columns: 1fr !important; }
          .goto-grid-3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          /* Force all multi-column grids to single column on mobile */
          .goto-grid-2, .goto-grid-3 { grid-template-columns: 1fr !important; }
          /* Compact card padding */
          .goto-card { padding: 16px !important; }
          /* Stack header bar buttons */
          .goto-header-bar { flex-wrap: wrap; gap: 8px; }
          /* Scrollable tabs */
          .goto-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          /* Ensure buttons don't overflow */
          button { max-width: 100%; }
        }
        @media (max-width: 480px) {
          nav { height: 48px !important; }
          nav > div:first-child > div:last-child { font-size: 11px !important; }
          /* BUG-022: Add scroll fade indicator for mobile nav overflow */
          nav::after {
            content: '';
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 32px;
            pointer-events: none;
            background: linear-gradient(to right, transparent, var(--nav-bg, #1e293b));
          }
          /* Reduce header text size */
          h1 { font-size: 20px !important; }
          h2 { font-size: 16px !important; }
        }
      `}</style>
    </div>
  );
}
