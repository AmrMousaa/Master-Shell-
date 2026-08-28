import { useEffect } from 'react';
import { IconAlertTriangle } from './icons';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="toast" role="alert">
      <IconAlertTriangle width={18} height={18} aria-hidden="true" />
      <span className="toast-message">{message}</span>
      <button type="button" className="toast-dismiss" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
