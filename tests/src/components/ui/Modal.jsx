import { useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL — Generic overlay dialog
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage:
//   <Modal open={showModal} onClose={() => setShowModal(false)} title="Send Minutes">
//     <p>Content here</p>
//     <Modal.Footer>
//       <button onClick={handleCancel}>Cancel</button>
//       <button onClick={handleConfirm}>Confirm</button>
//     </Modal.Footer>
//   </Modal>

export function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Trap focus + escape key
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        animation: 'modalFadeIn 0.2s ease',
        padding: 16,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)',
          animation: 'modalSlideUp 0.25s ease',
        }}
      >
        {/* Header */}
        {title && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: '#94a3b8',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// Modal.Footer — consistent button layout for modal actions
Modal.Footer = function ModalFooter({ children }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 24,
      paddingTop: 16,
      borderTop: '1px solid #f1f5f9',
    }}>
      {children}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM DIALOG — Replaces window.confirm()
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage:
//   <ConfirmDialog
//     open={showConfirm}
//     onClose={() => setShowConfirm(false)}
//     onConfirm={handleDelete}
//     title="Delete Minutes"
//     message="Are you sure? This action cannot be undone."
//     confirmLabel="Delete"
//     variant="danger"
//   />

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default', // 'default' | 'danger'
}) {
  const handleConfirm = useCallback(() => {
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const confirmBtnStyle = variant === 'danger'
    ? { background: '#dc2626', color: 'white', border: 'none' }
    : { background: '#1e293b', color: 'white', border: 'none' };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth={420}>
      <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>
        {typeof message === 'string' ? <p style={{ margin: 0 }}>{message}</p> : message}
      </div>

      <Modal.Footer>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            color: '#374151',
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          {cancelLabel}
        </button>
        <button
          onClick={handleConfirm}
          autoFocus
          style={{
            padding: '10px 20px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Inter', -apple-system, sans-serif",
            ...confirmBtnStyle,
          }}
        >
          {confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON PRESETS — Consistent button styles for use across the app
// ═══════════════════════════════════════════════════════════════════════════════

export const ButtonStyles = {
  base: {
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s, box-shadow 0.15s',
  },
  primary: {
    padding: '10px 20px',
    background: '#1e293b',
    color: 'white',
    border: 'none',
    fontWeight: 600,
  },
  secondary: {
    padding: '10px 20px',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  danger: {
    padding: '10px 20px',
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
  success: {
    padding: '10px 20px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    fontWeight: 600,
  },
  small: {
    padding: '6px 12px',
    fontSize: 13,
  },
};
