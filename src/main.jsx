import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as Sentry from '@sentry/react';

// OPS-7: Production error tracking
// Disabled in development — only active when VITE_SENTRY_DSN is set
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Sample 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Do NOT capture request bodies — meeting content must never reach Sentry
    beforeSend(event) {
      // Strip any request body data
      if (event.request) {
        delete event.request.data;
      }
      return event;
    },
  });
}

// Global styles
const globalStyles = document.createElement('style');
globalStyles.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  a { text-decoration: none; color: inherit; }
  input, select, textarea, button { font-family: inherit; }
`;
document.head.appendChild(globalStyles);

// Load Inter font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
