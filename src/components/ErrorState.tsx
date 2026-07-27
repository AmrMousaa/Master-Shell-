import { IconAlertTriangle } from './icons';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="status-state status-state-error">
      <IconAlertTriangle width={28} height={28} aria-hidden="true" />
      <p>{message ?? 'We could not load the navigation hub.'}</p>
      <button type="button" className="retry-button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
