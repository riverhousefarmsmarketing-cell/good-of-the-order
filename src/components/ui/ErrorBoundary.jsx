import { Component } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — Catches render errors and shows a recovery UI
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage: Wrap your app (or sections of it) to prevent full white-screen crashes.
//
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>
//
// For section-level boundaries:
//   <ErrorBoundary fallback={<p>This section failed to load.</p>}>
//     <MinutesEditor />
//   </ErrorBoundary>

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#1e293b',
                margin: '0 0 8px',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: 15,
                color: '#64748b',
                lineHeight: 1.6,
                margin: '0 0 32px',
              }}
            >
              An unexpected error occurred. Your data is safe — try refreshing the page
              or returning to the dashboard.
            </p>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 24px',
                  background: '#1e293b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 24px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Go to Dashboard
              </button>
            </div>

            {/* Error details (collapsed by default) */}
            {this.state.error && (
              <details
                style={{
                  marginTop: 32,
                  textAlign: 'left',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <summary
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    color: '#64748b',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Technical details
                </summary>
                <pre
                  style={{
                    padding: '12px 16px',
                    fontSize: 12,
                    color: '#991b1b',
                    background: '#fef2f2',
                    margin: 0,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 200,
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
