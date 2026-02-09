import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  navy: '#1e3a5f',
  navyDark: '#0f2440',
  navyLight: '#2a4d7a',
  red: '#dc2626',
  redHover: '#b91c1c',
  slate: '#475569',
  slateLight: '#64748b',
  slateMuted: '#94a3b8',
  bg: '#fafbfd',
  bgWarm: '#f8f9fc',
  white: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  text: '#1e293b',
  textSecondary: '#475569',
  radius: 8,
  radiusLg: 12,
  radiusXl: 16,
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  shadowLg: '0 10px 30px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.04)',
  shadowXl: '0 20px 50px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)',
  font: "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

// ─── Fade-in on scroll hook ──────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.7s ease, transform 0.7s ease' } };
}

// ─── Reusable button styles ──────────────────────────────────────────────────
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '14px 32px', background: T.red, color: T.white,
  border: 'none', borderRadius: T.radius, fontSize: 15, fontWeight: 600,
  fontFamily: T.font, cursor: 'pointer', textDecoration: 'none',
  transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
  boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
};

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '14px 32px', background: 'transparent', color: T.white,
  border: `2px solid rgba(255,255,255,0.35)`, borderRadius: T.radius,
  fontSize: 15, fontWeight: 600, fontFamily: T.font, cursor: 'pointer',
  textDecoration: 'none', transition: 'all 0.2s',
};

const btnOutline = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '14px 32px', background: T.white, color: T.navy,
  border: `2px solid ${T.border}`, borderRadius: T.radius,
  fontSize: 15, fontWeight: 600, fontFamily: T.font, cursor: 'pointer',
  textDecoration: 'none', transition: 'all 0.2s',
};

// ─── SVG Icons (inline, no deps) ────────────────────────────────────────────
const Icon = {
  clipboard: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  calendar: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  mail: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  fileText: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  users: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  checkWhite: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrowRight: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  minus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: T.font, color: T.text, background: T.bg, overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />

      {/* ─── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${T.border}` : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, background: scrolled ? T.navy : T.white,
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
            }}>
              <span style={{ color: scrolled ? T.white : T.navy, fontWeight: 700, fontSize: 14, fontFamily: T.font }}>GO</span>
            </div>
            <span style={{
              fontWeight: 700, fontSize: 18, fontFamily: T.font, letterSpacing: '-0.02em',
              color: scrolled ? T.navy : T.white, transition: 'color 0.3s',
            }}>
              GoodOfTheOrder
            </span>
          </div>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div className="nav-links-desktop" style={{ display: 'flex', gap: 28 }}>
              {['Features', 'How It Works', 'Pricing'].map(label => (
                <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`} style={{
                  color: scrolled ? T.slate : 'rgba(255,255,255,0.85)',
                  textDecoration: 'none', fontSize: 14, fontWeight: 500,
                  transition: 'color 0.2s',
                }}>{label}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/login" style={{
                color: scrolled ? T.navy : T.white, textDecoration: 'none',
                fontSize: 14, fontWeight: 600, padding: '8px 16px',
                transition: 'color 0.2s',
              }}>Sign In</Link>
              <Link to="/signup" style={{
                padding: '9px 22px', background: T.red, color: T.white,
                borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600,
                transition: 'background 0.2s',
                boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
              }}>Get Started</Link>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              display: 'none', padding: 8, background: 'none', border: 'none', cursor: 'pointer',
              color: scrolled ? T.navy : T.white,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{
            background: T.white, borderTop: `1px solid ${T.border}`, padding: '16px 24px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {['Features', 'How It Works', 'Pricing'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: T.navy, textDecoration: 'none', fontSize: 15, fontWeight: 500, padding: '8px 0' }}>
                {label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: T.navy, textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '8px 0' }}>Sign In</Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} style={{ display: 'inline-block', padding: '12px 24px', background: T.red, color: T.white, borderRadius: 6, textDecoration: 'none', fontSize: 15, fontWeight: 600, textAlign: 'center', marginTop: 4 }}>Get Started Free</Link>
          </div>
        )}
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        background: `linear-gradient(155deg, ${T.navyDark} 0%, ${T.navy} 40%, ${T.navyLight} 100%)`,
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Subtle grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
        {/* Gradient orb */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 700, height: 700, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '120px 24px 80px', width: '100%' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20,
              marginBottom: 28, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Now available for organizations
            </div>

            <h1 style={{
              fontFamily: T.fontDisplay, fontSize: 'clamp(36px, 5.5vw, 60px)',
              fontWeight: 700, color: T.white, lineHeight: 1.12,
              margin: '0 0 24px', letterSpacing: '-0.02em',
            }}>
              Board governance,{' '}
              <span style={{ color: '#f87171' }}>simplified.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.7, margin: '0 auto 40px', maxWidth: 560, fontWeight: 400,
            }}>
              Meeting minutes, agendas, events, and official records — all in one secure platform
              built for farm bureaus, nonprofits, HOAs, and school boards.
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" style={btnPrimary}>
                Start free trial {Icon.arrowRight}
              </Link>
              <a href="#how-it-works" style={btnSecondary}>See how it works</a>
            </div>

            <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              No credit card required · Set up in under 5 minutes
            </p>
          </div>

          {/* ─── App mockup ───────────────────────────────────────────────── */}
          <div style={{
            marginTop: 64, maxWidth: 900, margin: '64px auto 0',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Browser chrome */}
            <div style={{
              background: '#1a1f2e', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{
                flex: 1, margin: '0 40px', padding: '6px 16px',
                background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center',
              }}>
                goodoftheorder.app/minutes
              </div>
            </div>
            {/* Mock app content */}
            <div style={{ background: '#f8fafc', padding: '0' }}>
              {/* Mock nav */}
              <div style={{ background: T.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: T.red, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: 9, fontWeight: 700 }}>FB</span>
                  </div>
                  <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>Lewis County Farm Bureau</span>
                </div>
                <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                  {['Dashboard', 'Agendas', 'Minutes', 'Events'].map(t => (
                    <span key={t} style={{
                      fontSize: 11, color: t === 'Minutes' ? 'white' : 'rgba(255,255,255,0.6)',
                      fontWeight: t === 'Minutes' ? 600 : 400, padding: '4px 8px',
                      background: t === 'Minutes' ? 'rgba(255,255,255,0.1)' : 'none', borderRadius: 4,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              {/* Mock content */}
              <div style={{ padding: 24, minHeight: 280 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>Board Meeting Minutes</div>
                    <div style={{ fontSize: 12, color: T.slateLight }}>January 15, 2026 · 7:00 PM</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ padding: '4px 12px', background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 600, borderRadius: 12 }}>Approved</span>
                    <div style={{ padding: '6px 14px', background: T.navy, color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>📧 Send</div>
                    <div style={{ padding: '6px 14px', background: '#dc2626', color: 'white', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>PDF ↓</div>
                  </div>
                </div>
                {/* Mock tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `2px solid ${T.border}`, paddingBottom: 0 }}>
                  {['Meeting Info', 'Attendance', 'Financial', 'Reports', 'Business', 'Preview'].map((tab, i) => (
                    <span key={tab} style={{
                      padding: '8px 14px', fontSize: 12, fontWeight: i === 5 ? 600 : 400,
                      color: i === 5 ? T.navy : T.slateLight,
                      borderBottom: i === 5 ? `2px solid ${T.navy}` : '2px solid transparent',
                      marginBottom: -2,
                    }}>{tab}</span>
                  ))}
                </div>
                {/* Mock preview content */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 8 }}>Roll Call</div>
                    <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.6 }}>
                      Present: J. Smith (Pres.), M. Jones (VP), R. Lee (Sec.), S. Chen (Treas.), D. Wilson, E. Brown
                    </div>
                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Absent: M. Davis</div>
                    <div style={{ marginTop: 8, padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, fontSize: 10, color: '#166534', fontWeight: 600, display: 'inline-block' }}>Quorum Present ✓</div>
                  </div>
                  <div style={{ background: 'white', border: `1px solid ${T.border}`, borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.navy, marginBottom: 8 }}>Financial Summary</div>
                    <div style={{ fontSize: 11, color: T.slate, lineHeight: 1.8 }}>
                      <div>Account Balance: <strong>$4,250.00</strong></div>
                      <div>Donations (YTD): $1,200.00</div>
                      <div>Expenses: $350.00</div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10, color: '#059669', fontWeight: 500 }}>
                      Motion: Approved unanimously
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF BAR ─────────────────────────────────────────────── */}
      <section style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: T.slateMuted, fontWeight: 500, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Built for organizations that take governance seriously
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', opacity: 0.5 }}>
            {['Farm Bureaus', 'Nonprofit Boards', 'HOA Boards', 'School Boards', 'County Agencies'].map(org => (
              <span key={org} style={{ fontSize: 14, fontWeight: 600, color: T.slate, whiteSpace: 'nowrap' }}>{org}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────────── */}
      <FeaturesSection />

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ─── APP SHOWCASE ─────────────────────────────────────────────────── */}
      <ShowcaseSection />

      {/* ─── PRICING ──────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <CTASection />

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <Footer />

      {/* ─── Responsive styles ────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .showcase-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .cta-inner { flex-direction: column !important; text-align: center !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
        }
        a:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function FeaturesSection() {
  const fade = useFadeIn();
  const features = [
    { icon: Icon.clipboard, title: 'Meeting Minutes', desc: 'Comprehensive 6-section template with motions, attendance, financials, and committee reports. Every detail captured, nothing missed.' },
    { icon: Icon.calendar, title: 'Agenda Management', desc: 'Create agendas with standard items, inherited action items, and one-click distribution. Minutes auto-populate from finalized agendas.' },
    { icon: Icon.mail, title: 'Email Distribution', desc: 'Send agendas and approved minutes to board members with group-based recipient selection and full delivery tracking.' },
    { icon: Icon.fileText, title: 'PDF Export', desc: 'Generate professional, branded PDFs with your organization logo, signature lines, and complete meeting records.' },
    { icon: Icon.users, title: 'Multi-Tenant', desc: 'Each organization gets its own isolated workspace. Manage members, roles, subcommittees, and distribution lists independently.' },
    { icon: Icon.shield, title: 'Secure & Reliable', desc: 'Enterprise-grade infrastructure with Supabase backend, role-based access, and audit trails for every action.' },
  ];

  return (
    <section id="features" style={{ padding: '100px 24px', background: T.bg }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Features</p>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: T.text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Everything your board needs
          </h2>
          <p style={{ fontSize: 17, color: T.slateLight, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Purpose-built tools for organizations that need reliable, professional meeting governance.
          </p>
        </div>

        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
              padding: 28, transition: 'box-shadow 0.3s, transform 0.3s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 10, marginBottom: 16,
                background: `linear-gradient(135deg, ${T.navyDark}, ${T.navy})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: T.slateLight, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const fade = useFadeIn();
  const steps = [
    { num: '01', title: 'Create your organization', desc: 'Sign up, name your board, and invite members with role-based access levels.' },
    { num: '02', title: 'Prepare the agenda', desc: 'Build agendas from templates with inherited items from previous meetings. Send to all members before the meeting.' },
    { num: '03', title: 'Record the minutes', desc: 'During the meeting, capture attendance, motions, financials, reports, and action items in our structured template.' },
    { num: '04', title: 'Approve & distribute', desc: 'Finalize minutes, export a branded PDF, and email to your board — all tracked with a complete audit trail.' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '100px 24px', background: T.white }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: T.text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            From meeting to record in minutes
          </h2>
          <p style={{ fontSize: 17, color: T.slateLight, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            A streamlined workflow designed around how boards actually operate.
          </p>
        </div>

        <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
                background: i === 3 ? T.red : T.bg,
                border: i === 3 ? 'none' : `2px solid ${T.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: i === 3 ? T.white : T.navy,
                fontFamily: T.font,
              }}>
                {s.num}
              </div>
              {i < 3 && (
                <div style={{
                  position: 'absolute', top: 28, left: 'calc(50% + 36px)', width: 'calc(100% - 72px)',
                  height: 2, background: T.border,
                  display: 'none', // Show on desktop via media query below
                }} className="step-connector" />
              )}
              <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 8px' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: T.slateLight, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <style>{`@media (min-width: 769px) { .step-connector { display: block !important; } }`}</style>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  const fade = useFadeIn();

  const panels = [
    {
      title: 'Structured minutes template',
      desc: 'Six dedicated sections ensure no detail is missed — from roll call to adjournment.',
      mockup: (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Meeting Info', 'Attendance', 'Financial', 'Reports', 'Business', 'Preview'].map((tab, i) => (
            <span key={tab} style={{
              padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: i === 0 ? T.navy : '#f1f5f9', color: i === 0 ? 'white' : T.slate,
            }}>{tab}</span>
          ))}
          <div style={{ width: '100%', marginTop: 12 }}>
            {[
              { label: 'Call to Order', val: '7:05 PM' },
              { label: 'Invocation', val: 'Given by President Smith' },
              { label: 'Pledge', val: '✓ Recited' },
              { label: 'Quorum', val: 'Present (6 of 7)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
                <span style={{ color: T.slateLight }}>{item.label}</span>
                <span style={{ fontWeight: 500, color: T.text }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Motion tracking & voting',
      desc: 'Record every motion with mover, seconder, decision, and vote — fully compliant with Robert\'s Rules.',
      mockup: (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.red, marginBottom: 8 }}>MOTION</div>
          <div style={{ fontSize: 13, color: T.text, marginBottom: 12, lineHeight: 1.5 }}>
            "Approve the allocation of $500 from the general fund for the spring educational program."
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            <div><span style={{ color: T.slateMuted }}>Moved by:</span> <strong>Mary Jones</strong></div>
            <div><span style={{ color: T.slateMuted }}>Seconded:</span> <strong>David Wilson</strong></div>
            <div><span style={{ color: T.slateMuted }}>Decision:</span> <strong style={{ color: '#059669' }}>Passed</strong></div>
            <div><span style={{ color: T.slateMuted }}>Vote:</span> <strong>Unanimous</strong></div>
          </div>
        </div>
      ),
    },
    {
      title: 'One-click PDF & email',
      desc: 'Export branded PDFs and distribute to your entire board with tracked delivery.',
      mockup: (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 16px', background: T.red, color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Download PDF</div>
            <div style={{ padding: '8px 16px', background: T.navy, color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>📧 Send to Board</div>
          </div>
          <div style={{ fontSize: 12, color: T.slateLight, marginBottom: 8 }}>Distribution History:</div>
          {[
            { date: 'Jan 16, 2026 9:15 AM', to: '7 board members', status: '✓ Delivered' },
            { date: 'Jan 20, 2026 2:30 PM', to: '3 committee chairs', status: '✓ Delivered' },
          ].map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f0fdf4', borderRadius: 6, marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: T.slate }}>{d.date} → {d.to}</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>{d.status}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section style={{ padding: '100px 24px', background: T.bg }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>In Action</p>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: T.text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            See it in action
          </h2>
        </div>

        <div className="showcase-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {panels.map((p, i) => (
            <div key={i} style={{
              background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
              overflow: 'hidden', transition: 'box-shadow 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadowMd; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ padding: 24, borderBottom: `1px solid ${T.borderLight}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: T.slateLight, margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
              </div>
              <div style={{ padding: 20 }}>{p.mockup}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const fade = useFadeIn();

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      desc: 'For small boards getting organized.',
      highlight: false,
      features: [
        { text: 'Up to 15 members', included: true },
        { text: 'Meeting minutes & agendas', included: true },
        { text: 'PDF export', included: true },
        { text: 'Email distribution (50/month)', included: true },
        { text: 'Event management', included: true },
        { text: 'Subcommittee support', included: false },
        { text: 'Custom branding', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      desc: 'For active boards that need the full toolkit.',
      highlight: true,
      features: [
        { text: 'Unlimited members', included: true },
        { text: 'Meeting minutes & agendas', included: true },
        { text: 'PDF export with custom branding', included: true },
        { text: 'Unlimited email distribution', included: true },
        { text: 'Event management', included: true },
        { text: 'Subcommittee support', included: true },
        { text: 'Custom logo & branding', included: true },
        { text: 'Priority email support', included: true },
      ],
    },
  ];

  return (
    <section id="pricing" style={{ padding: '100px 24px', background: T.white }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: T.text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 17, color: T.slateLight, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Start with a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 780, margin: '0 auto' }}>
          {plans.map((plan, i) => (
            <div key={i} style={{
              background: plan.highlight ? T.navy : T.white,
              border: plan.highlight ? 'none' : `1px solid ${T.border}`,
              borderRadius: T.radiusLg, padding: 36, position: 'relative',
              boxShadow: plan.highlight ? T.shadowXl : T.shadow,
              transition: 'transform 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              {plan.highlight && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  padding: '4px 16px', background: T.red, color: T.white,
                  borderRadius: 12, fontSize: 12, fontWeight: 600,
                }}>
                  Most Popular
                </div>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 700, color: plan.highlight ? T.white : T.text, margin: '0 0 4px' }}>{plan.name}</h3>
              <p style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.6)' : T.slateLight, margin: '0 0 20px' }}>{plan.desc}</p>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: plan.highlight ? T.white : T.text, letterSpacing: '-0.02em' }}>{plan.price}</span>
                <span style={{ fontSize: 15, color: plan.highlight ? 'rgba(255,255,255,0.5)' : T.slateMuted }}>{plan.period}</span>
              </div>
              <Link to="/signup" style={{
                display: 'block', textAlign: 'center', padding: '12px 24px',
                background: plan.highlight ? T.red : T.bg,
                color: plan.highlight ? T.white : T.navy,
                border: plan.highlight ? 'none' : `1px solid ${T.border}`,
                borderRadius: T.radius, textDecoration: 'none',
                fontSize: 15, fontWeight: 600, marginBottom: 28,
                transition: 'background 0.2s',
                boxShadow: plan.highlight ? '0 2px 8px rgba(220,38,38,0.3)' : 'none',
              }}>
                Start free trial
              </Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {f.included ? (plan.highlight ? Icon.checkWhite : Icon.check) : Icon.minus}
                    <span style={{
                      fontSize: 14, fontWeight: f.included ? 500 : 400,
                      color: !f.included ? (plan.highlight ? 'rgba(255,255,255,0.3)' : T.slateMuted) : (plan.highlight ? 'rgba(255,255,255,0.9)' : T.text),
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const fade = useFadeIn();
  return (
    <section style={{
      padding: '80px 24px',
      background: `linear-gradient(135deg, ${T.navyDark} 0%, ${T.navy} 100%)`,
    }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 900, margin: '0 auto' }}>
        <div className="cta-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <h2 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: T.white, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Ready to modernize your board's records?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.6 }}>
              Join organizations that trust GoodOfTheOrder for professional governance management.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <Link to="/signup" style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>
              Get started free {Icon.arrowRight}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: T.navyDark, padding: '60px 24px 32px', color: 'rgba(255,255,255,0.5)' }}>
      <div className="footer-grid" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, background: T.white, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: T.navy, fontWeight: 700, fontSize: 13 }}>GO</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.white }}>GoodOfTheOrder</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
            Professional meeting governance software for boards and organizations of all sizes.
          </p>
        </div>
        <div>
          <h4 style={{ color: T.white, fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Product</h4>
          {['Features', 'Pricing', 'Security'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{ display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 10, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
            >{item}</a>
          ))}
        </div>
        <div>
          <h4 style={{ color: T.white, fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resources</h4>
          {['Documentation', 'Help Center', 'Contact Us'].map(item => (
            <a key={item} href="#" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 10, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
            >{item}</a>
          ))}
        </div>
        <div>
          <h4 style={{ color: T.white, fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Legal</h4>
          {['Privacy Policy', 'Terms of Service'].map(item => (
            <a key={item} href="#" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 10, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
            >{item}</a>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 13 }}>© {new Date().getFullYear()} GoodOfTheOrder. All rights reserved.</span>
        <span style={{ fontSize: 13 }}>Made with care for organizations that govern well.</span>
      </div>
    </footer>
  );
}
