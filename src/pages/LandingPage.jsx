import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

// ─── Design Tokens ───────────────────────────────────────────────────────────
// Warm navy + barn red — trustworthy, American agricultural, not corporate
const C = {
  navy: '#1b3a4b',
  navyDeep: '#122a37',
  navyLight: '#2d5f7a',
  red: '#c0392b',
  redHover: '#a93226',
  green: '#27763d',
  cream: '#faf8f5',
  warmWhite: '#fffefb',
  sand: '#f3efe8',
  sandDark: '#e8e2d8',
  text: '#2c3e40',
  textSecondary: '#5a6b6e',
  textMuted: '#8a9598',
  border: '#e2ddd5',
  white: '#ffffff',
  shadow: '0 1px 3px rgba(27,58,75,0.06)',
  shadowMd: '0 4px 16px rgba(27,58,75,0.08)',
  shadowLg: '0 8px 32px rgba(27,58,75,0.1)',
  radius: 6,
  font: "'Source Serif 4', 'Georgia', 'Times New Roman', serif",
  fontSans: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─── Scroll fade hook ────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: 'opacity 0.6s ease, transform 0.6s ease' } };
}

// ═════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ fontFamily: C.fontSans, color: C.text, background: C.cream, overflowX: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />

      {/* ─── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled ? 'rgba(255,254,251,0.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: scrolled ? C.navy : C.white,
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
            }}>
              <span style={{ color: scrolled ? C.white : C.navy, fontWeight: 700, fontSize: 13, fontFamily: C.fontSans }}>GO</span>
            </div>
            <span style={{
              fontWeight: 700, fontSize: 17, fontFamily: C.fontSans, letterSpacing: '-0.01em',
              color: scrolled ? C.navy : C.white, transition: 'color 0.3s',
            }}>GoodOfTheOrder</span>
          </div>

          {/* Desktop nav links */}
          <div className="lp-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            {['Features', 'How It Works', 'Pricing', 'FAQ'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`} style={{
                color: scrolled ? C.textSecondary : 'rgba(255,255,255,0.8)',
                textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s',
              }}>{label}</a>
            ))}
            <Link to="/login" style={{
              color: scrolled ? C.navy : C.white, textDecoration: 'none',
              fontSize: 14, fontWeight: 600, padding: '8px 16px',
            }}>Sign In</Link>
            <Link to="/signup" style={{
              padding: '9px 20px', background: C.red, color: C.white,
              borderRadius: C.radius, textDecoration: 'none', fontSize: 14, fontWeight: 600,
              boxShadow: '0 2px 8px rgba(192,57,43,0.2)',
            }}>Start Free Trial</Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lp-nav-mobile-btn" style={{
            display: 'none', padding: 8, background: 'none', border: 'none', cursor: 'pointer',
            color: scrolled ? C.navy : C.white,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" /></>
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div style={{ background: C.warmWhite, borderTop: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Features', 'How It Works', 'Pricing', 'FAQ'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: C.navy, textDecoration: 'none', fontSize: 15, fontWeight: 500, padding: '8px 0' }}>
                {label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: C.navy, textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '8px 0' }}>Sign In</Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)} style={{ display: 'inline-block', padding: '12px 24px', background: C.red, color: C.white, borderRadius: C.radius, textDecoration: 'none', fontSize: 15, fontWeight: 600, textAlign: 'center', marginTop: 4 }}>Start Free Trial</Link>
          </div>
        )}
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(165deg, ${C.navyDeep} 0%, ${C.navy} 50%, ${C.navyLight} 100%)`,
        padding: '140px 24px 100px',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Subtle dot texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: C.font, fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700, color: C.white, lineHeight: 1.15,
            margin: '0 0 24px', letterSpacing: '-0.02em',
          }}>
            Meeting minutes management for county Farm Bureaus and nonprofit boards
          </h1>

          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)', color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 540,
          }}>
            Create, approve, and distribute board minutes in minutes — with automatic record-keeping that survives secretary turnover.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', background: C.red, color: C.white,
              border: 'none', borderRadius: C.radius, fontSize: 16, fontWeight: 600,
              fontFamily: C.fontSans, textDecoration: 'none',
              boxShadow: '0 3px 12px rgba(192,57,43,0.3)',
            }}>
              Start Free Trial
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </Link>
            <a href="#how-it-works" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 32px', background: 'transparent', color: C.white,
              border: '2px solid rgba(255,255,255,0.25)', borderRadius: C.radius,
              fontSize: 16, fontWeight: 600, fontFamily: C.fontSans, textDecoration: 'none',
            }}>See How It Works</a>
          </div>

          <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            No credit card required · Free 14-day trial
          </p>
        </div>
      </section>

      {/* ─── PAIN POINTS ─────────────────────────────────────────────── */}
      <PainPointsSection />

      {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
      <HowItWorksSection />

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <FeaturesSection />

      {/* ─── PRICING ─────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ─── TRUST / SOCIAL PROOF ────────────────────────────────────── */}
      <TrustSection />

      {/* ─── FAQ ─────────────────────────────────────────────────────── */}
      <FAQSection openFaq={openFaq} setOpenFaq={setOpenFaq} />

      {/* ─── CTA BANNER ──────────────────────────────────────────────── */}
      <CTASection />

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <FooterSection />

      {/* ─── Responsive overrides ────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .lp-nav-desktop { display: none !important; }
          .lp-nav-mobile-btn { display: block !important; }
          .lp-grid-3 { grid-template-columns: 1fr !important; }
          .lp-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .lp-grid-2 { grid-template-columns: 1fr !important; }
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .lp-cta-inner { flex-direction: column !important; text-align: center !important; }
        }
        @media (max-width: 480px) {
          .lp-grid-4 { grid-template-columns: 1fr !important; }
          .lp-footer-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .lp-nav-mobile-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function PainPointsSection() {
  const fade = useFadeIn();
  const pains = [
    {
      emoji: '🔄',
      title: 'Secretary turnover erases institutional memory',
      desc: 'When a secretary leaves, years of records, processes, and context walk out the door. The next volunteer starts from scratch.',
    },
    {
      emoji: '📁',
      title: 'Minutes scattered across inboxes and filing cabinets',
      desc: "Word documents in personal email, paper copies in binders, PDFs nobody can find. No single source of truth for your board's history.",
    },
    {
      emoji: '⏱️',
      title: 'Creating and distributing PDFs is a manual chore',
      desc: 'Formatting in Word, exporting to PDF, attaching to individual emails. Hours of volunteer time spent on clerical work every month.',
    },
  ];

  return (
    <section style={{ padding: '80px 24px', background: C.warmWhite }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.red, textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sound familiar?
        </p>
        <h2 style={{ fontFamily: C.font, fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: C.text, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.01em' }}>
          Every volunteer board faces the same problems
        </h2>

        <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {pains.map((p, i) => (
            <div key={i} style={{
              background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: 28,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{p.emoji}</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 8px', lineHeight: 1.35 }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
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
    { num: '1', title: 'Create an agenda', desc: 'Build structured agendas with standard items. Send to your board before the meeting with one click.' },
    { num: '2', title: 'Take minutes during the meeting', desc: 'Follow the tabbed workflow: Meeting Info, Attendance, Financial, Reports, Business, and Preview.' },
    { num: '3', title: 'Finalize and generate a professional PDF', desc: "Review in preview, mark as approved. Your organization's logo and branding on every document." },
    { num: '4', title: 'Distribute to the board via email', desc: 'Select recipients, click send. Full delivery tracking and a permanent archive.' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '80px 24px', background: C.sand }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.red, textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          How it works
        </p>
        <h2 style={{ fontFamily: C.font, fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: C.text, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.01em' }}>
          From meeting to official record in four steps
        </h2>

        <div className="lp-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
                background: i === 3 ? C.red : C.navy,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.white, fontSize: 18, fontWeight: 700, fontFamily: C.fontSans,
              }}>
                {s.num}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const fade = useFadeIn();
  const features = [
    { title: 'Multi-account financial tracking', desc: 'Track balances, donations, and expenses across multiple accounts with motion-approved financial reports.' },
    { title: 'Role-based access', desc: 'Admin, editor, and viewer roles. Control who can create minutes, manage members, and access settings.' },
    { title: 'Your logo on every document', desc: "Upload your organization's logo and it appears on every PDF, every email, every official record." },
    { title: 'Complete audit trail', desc: 'Every motion, vote, and action item is tracked. Searchable minutes archive going back as far as you need.' },
    { title: 'Secure, isolated data', desc: "Each organization's data is completely separate. Row-level security ensures no cross-organization access." },
    { title: 'Email distribution with tracking', desc: 'Send agendas and approved minutes to your entire board. See who received what and when.' },
  ];

  return (
    <section id="features" style={{ padding: '80px 24px', background: C.warmWhite }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 960, margin: '0 auto' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.red, textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Features
        </p>
        <h2 style={{ fontFamily: C.font, fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: C.text, textAlign: 'center', margin: '0 0 48px', letterSpacing: '-0.01em' }}>
          Everything your board needs, nothing it doesn't
        </h2>

        <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: C.cream, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: 24,
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const fade = useFadeIn();

  const included = [
    'Unlimited users per organization',
    'Unlimited meeting minutes',
    'PDF export with your branding',
    'Email distribution to board members',
    'Financial tracking & reporting',
    'Subcommittee support',
    'Complete minutes archive',
    'Phone & email support',
  ];

  const checkIcon = (color) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 2, flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <section id="pricing" style={{ padding: '80px 24px', background: C.sand }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 1000, margin: '0 auto' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.red, textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Pricing
        </p>
        <h2 style={{ fontFamily: C.font, fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: C.text, textAlign: 'center', margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          Simple, honest pricing
        </h2>
        <p style={{ fontSize: 16, color: C.textSecondary, textAlign: 'center', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.6 }}>
          All features included at every tier. We believe governance tools shouldn't penalize organizations for having more board members.
        </p>

        <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 960, margin: '0 auto' }}>

          {/* Monthly */}
          <div style={{
            background: C.warmWhite, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 28, display: 'flex', flexDirection: 'column',
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>Monthly</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 20px' }}>For a single county or chapter</p>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 38, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>$39</span>
              <span style={{ fontSize: 15, color: C.textMuted }}>/month</span>
            </div>
            <Link to="/signup" style={{
              display: 'block', textAlign: 'center', padding: '12px 24px',
              background: C.cream, color: C.navy, border: `1px solid ${C.border}`,
              borderRadius: C.radius, textDecoration: 'none', fontSize: 14, fontWeight: 600,
              marginBottom: 24,
            }}>Start free trial</Link>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {included.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {checkIcon(C.green)}
                  <span style={{ fontSize: 13, color: C.text }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Annual — highlighted */}
          <div style={{
            background: C.navy, borderRadius: 10, padding: 28,
            display: 'flex', flexDirection: 'column', position: 'relative',
            boxShadow: C.shadowLg,
          }}>
            <div style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              padding: '4px 14px', background: C.red, color: C.white,
              borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
            }}>Save 26%</div>

            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.white, margin: '0 0 4px' }}>Annual</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 20px' }}>For a single county or chapter</p>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 38, fontWeight: 700, color: C.white, letterSpacing: '-0.02em' }}>$29</span>
              <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>/month</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 20px' }}>Billed as $348/year</p>
            <Link to="/signup" style={{
              display: 'block', textAlign: 'center', padding: '12px 24px',
              background: C.red, color: C.white, borderRadius: C.radius,
              textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 24,
              boxShadow: '0 2px 8px rgba(192,57,43,0.3)',
            }}>Start free trial</Link>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {included.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {checkIcon('rgba(255,255,255,0.8)')}
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Federation */}
          <div style={{
            background: C.warmWhite, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 28, display: 'flex', flexDirection: 'column',
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>State Federation</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 20px' }}>Bulk licensing for all counties</p>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 38, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>$15</span>
              <span style={{ fontSize: 15, color: C.textMuted }}>/county/mo</span>
            </div>
            <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 20px' }}>Billed annually · 62% off monthly rate</p>
            <a href="mailto:support@goodoftheorder.app?subject=Federation%20Pricing%20Inquiry" style={{
              display: 'block', textAlign: 'center', padding: '12px 24px',
              background: C.navy, color: C.white, borderRadius: C.radius,
              textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 24,
            }}>Contact us</a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[...included, '62% savings per county', 'Dedicated onboarding call'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {checkIcon(C.green)}
                  <span style={{ fontSize: 13, color: C.text }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: C.textMuted, lineHeight: 1.6, fontStyle: 'italic' }}>
          No per-seat pricing. No feature gating. Every organization gets every feature.
        </p>
      </div>
    </section>
  );
}

function TrustSection() {
  const fade = useFadeIn();

  return (
    <section style={{ padding: '60px 24px', background: C.warmWhite, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '32px 40px', maxWidth: 600, margin: '0 auto 32px',
        }}>
          <p style={{
            fontFamily: C.font, fontStyle: 'italic', fontSize: 17,
            color: C.text, lineHeight: 1.7, margin: '0 0 16px',
          }}>
            "Built by a Farm Bureau volunteer who understands governance from the inside — not a tech company guessing at what boards need."
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.textSecondary, margin: 0 }}>
            — Christine Williams, Founder & Lewis County Farm Bureau Member
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { label: 'Encrypted data', icon: '🔒' },
            { label: 'Isolated per organization', icon: '🏛️' },
            { label: 'Automated daily backups', icon: '💾' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.textSecondary }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ openFaq, setOpenFaq }) {
  const fade = useFadeIn();

  const faqs = [
    {
      q: 'What happens to our data if we cancel?',
      a: 'You get a 30-day export period after cancellation. During that time you can download all your minutes, agendas, and records. After 30 days, data is permanently deleted from our systems.',
    },
    {
      q: 'Can multiple people edit minutes at the same time?',
      a: 'Currently, one person edits minutes at a time — typically the secretary during or after the meeting. Other board members can view finalized minutes and archives at any time.',
    },
    {
      q: 'Is our data shared with other organizations?',
      a: "Never. Each organization's data is completely isolated using row-level security. Your data is invisible to other organizations, and we never sell or share data with third parties.",
    },
    {
      q: 'How does the secretary transition work?',
      a: 'When a new secretary takes over, an admin simply updates their role in the Members section. The new secretary immediately has access to all meeting history, templates, and workflows. Nothing is lost.',
    },
    {
      q: 'Do we need to install any software?',
      a: 'No. GoodOfTheOrder runs entirely in your web browser. It works on any computer, tablet, or phone — no downloads or installation required.',
    },
    {
      q: 'What if we need help getting started?',
      a: 'We provide a Getting Started Guide that walks you through setup step by step. Federation customers get a dedicated onboarding call. You can always reach us at support@goodoftheorder.app.',
    },
  ];

  return (
    <section id="faq" style={{ padding: '80px 24px', background: C.cream }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.red, textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          FAQ
        </p>
        <h2 style={{ fontFamily: C.font, fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: C.text, textAlign: 'center', margin: '0 0 40px', letterSpacing: '-0.01em' }}>
          Common questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: C.warmWhite, border: `1px solid ${C.border}`, borderRadius: 8,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 15, fontWeight: 600, color: C.text, fontFamily: C.fontSans, textAlign: 'left',
                }}
              >
                {faq.q}
                <span style={{
                  fontSize: 20, color: C.textMuted, transition: 'transform 0.2s', flexShrink: 0, marginLeft: 12,
                  transform: openFaq === i ? 'rotate(45deg)' : 'none',
                }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 16px' }}>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                </div>
              )}
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
    <section style={{ padding: '64px 24px', background: C.navy }}>
      <div ref={fade.ref} style={{ ...fade.style, maxWidth: 900, margin: '0 auto' }}>
        <div className="lp-cta-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div>
            <h2 style={{ fontFamily: C.font, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: C.white, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Ready to modernize your board's records?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              For less than the cost of one lunch meeting per month, your county gets professional minutes management year-round.
            </p>
          </div>
          <Link to="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            padding: '14px 32px', background: C.red, color: C.white,
            borderRadius: C.radius, fontSize: 16, fontWeight: 600,
            fontFamily: C.fontSans, textDecoration: 'none',
            boxShadow: '0 3px 12px rgba(192,57,43,0.3)',
            flexShrink: 0,
          }}>
            Start free trial
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer style={{ background: C.navyDeep, padding: '48px 24px 28px', color: 'rgba(255,255,255,0.5)' }}>
      <div className="lp-footer-grid" style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 48, marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, background: C.white, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: C.navy, fontWeight: 700, fontSize: 11 }}>GO</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.white }}>GoodOfTheOrder</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280 }}>
            Professional meeting governance for boards and organizations of all sizes.
          </p>
        </div>
        <div>
          <h4 style={{ color: C.white, fontSize: 12, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Product</h4>
          {['Features', 'How It Works', 'Pricing', 'FAQ'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} style={{
              display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 8,
            }}>{item}</a>
          ))}
        </div>
        <div>
          <h4 style={{ color: C.white, fontSize: 12, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Legal</h4>
          <a href="/privacy" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 8 }}>Privacy Policy</a>
          <a href="/terms" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 8 }}>Terms of Service</a>
          <a href="mailto:support@goodoftheorder.app" style={{ display: 'block', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 14, marginBottom: 8 }}>Contact</a>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12 }}>© {new Date().getFullYear()} GoodOfTheOrder. All rights reserved.</span>
        <span style={{ fontSize: 12 }}>Built with care for organizations that govern well.</span>
      </div>
    </footer>
  );
}
