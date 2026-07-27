import { IconLoader } from './icons';

export function LoadingState() {
  return (
    <div className="status-state">
      <IconLoader className="spinner-icon" width={28} height={28} aria-hidden="true" />
      <p>Loading navigation hub...</p>
    </div>
  );
}
