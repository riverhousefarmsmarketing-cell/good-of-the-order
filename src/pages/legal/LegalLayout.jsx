import { Link } from 'react-router-dom';

/**
 * LegalLayout — shared wrapper for Terms of Service and Privacy Policy pages.
 *
 * Visual identity follows the RiverHouse Farms Brand Identity Guide v6:
 * - Forest green (#105040) for primary structural color
 * - Pure white (#FFFFFF) surfaces, #E0E0E0 borders
 * - DM Serif Display (Georgia fallback) for headings
 * - DM Sans (system-ui fallback) for body
 *
 * Used by /terms and /privacy. Public routes — no auth required.
 */
export default function LegalLayout({ title, effectiveDate, lastUpdated, version, children }) {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to="/" style={styles.brand}>
            <span style={styles.brandWord}>GoodOfTheOrder</span>
            <span style={styles.brandSub}>by Riverhouse Farms</span>
          </Link>
          <Link to="/" style={styles.backLink}>← Back to home</Link>
        </div>
      </header>

      <main style={styles.main}>
        <article style={styles.article}>
          <div style={styles.titleBlock}>
            <h1 style={styles.title}>{title}</h1>
            <div style={styles.metaRow}>
              {effectiveDate && <span style={styles.meta}><strong>Effective:</strong> {effectiveDate}</span>}
              {lastUpdated && <span style={styles.meta}><strong>Last updated:</strong> {lastUpdated}</span>}
              {version && <span style={styles.meta}><strong>Version:</strong> {version}</span>}
            </div>
          </div>

          <div style={styles.content}>
            {children}
          </div>
        </article>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLeft}>
            © {new Date().getFullYear()} Riverhouse Farms LLC
          </div>
          <div style={styles.footerRight}>
            <Link to="/terms" style={styles.footerLink}>Terms of Service</Link>
            <span style={styles.footerSep}>·</span>
            <Link to="/privacy" style={styles.footerLink}>Privacy Policy</Link>
            <span style={styles.footerSep}>·</span>
            <a href="mailto:support@goodoftheorder.app" style={styles.footerLink}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FOREST = '#105040';
const FOREST_DARK = '#0A3228';
const HEADING = '#081810';
const BODY = '#384E42';
const MUTED = '#6A7E70';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const SURFACE_TINT = '#FAFAF9';

const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

const styles = {
  page: {
    minHeight: '100vh',
    background: SURFACE_TINT,
    fontFamily: SANS,
    color: BODY,
    lineHeight: 1.65,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: SURFACE,
    borderBottom: `1px solid ${BORDER}`,
  },
  headerInner: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  brand: {
    textDecoration: 'none',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
  },
  brandWord: {
    fontFamily: SERIF,
    fontSize: 22,
    color: HEADING,
    letterSpacing: '-0.01em',
  },
  brandSub: {
    fontSize: 11,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginTop: 2,
  },
  backLink: {
    color: FOREST,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
  main: {
    flex: 1,
    padding: '48px 24px 64px',
  },
  article: {
    maxWidth: 760,
    margin: '0 auto',
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '48px 56px',
  },
  titleBlock: {
    paddingBottom: 28,
    marginBottom: 36,
    borderBottom: `1px solid ${BORDER}`,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 36,
    color: HEADING,
    margin: '0 0 16px',
    lineHeight: 1.15,
    letterSpacing: '-0.015em',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 20px',
    fontSize: 13,
    color: MUTED,
  },
  meta: {
    whiteSpace: 'nowrap',
  },
  content: {
    fontSize: 15.5,
    color: BODY,
  },
  footer: {
    background: SURFACE,
    borderTop: `1px solid ${BORDER}`,
    marginTop: 24,
  },
  footerInner: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    fontSize: 13,
    color: MUTED,
  },
  footerLeft: {},
  footerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  footerLink: {
    color: FOREST,
    textDecoration: 'none',
  },
  footerSep: {
    color: BORDER,
  },
};

/**
 * Shared content styles used by Terms.jsx and Privacy.jsx.
 * Exported so child pages can apply consistent typography.
 */
export const legalContentStyles = {
  h2: {
    fontFamily: SERIF,
    fontSize: 24,
    color: HEADING,
    margin: '40px 0 14px',
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontFamily: SANS,
    fontSize: 17,
    fontWeight: 600,
    color: HEADING,
    margin: '28px 0 10px',
  },
  p: {
    margin: '0 0 14px',
    color: BODY,
  },
  ul: {
    margin: '0 0 14px',
    paddingLeft: 22,
    color: BODY,
  },
  li: {
    margin: '0 0 6px',
  },
  strong: {
    color: HEADING,
    fontWeight: 600,
  },
  callout: {
    background: SURFACE_TINT,
    borderLeft: `3px solid ${FOREST}`,
    padding: '14px 18px',
    margin: '20px 0',
    fontSize: 14.5,
    color: BODY,
    borderRadius: '0 4px 4px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '14px 0 22px',
    fontSize: 14,
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    background: SURFACE_TINT,
    border: `1px solid ${BORDER}`,
    color: HEADING,
    fontWeight: 600,
    fontSize: 13,
  },
  td: {
    padding: '10px 12px',
    border: `1px solid ${BORDER}`,
    color: BODY,
    verticalAlign: 'top',
  },
  link: {
    color: FOREST_DARK,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
};
