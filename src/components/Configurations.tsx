import { IconChevronLeft, IconSettings } from './icons';

interface ConfigurationsProps {
  onBack: () => void;
}

export function Configurations({ onBack }: ConfigurationsProps) {
  return (
    <div>
      <button type="button" className="back-btn" onClick={onBack}>
        <IconChevronLeft width={14} height={14} aria-hidden="true" />
        Back to home
      </button>
      <div className="mp-head">
        <div className="mp-ring">
          <IconSettings width={26} height={26} aria-hidden="true" />
        </div>
        <div>
          <h1>Configurations</h1>
          <p>Workspace and account settings &mdash; coming soon.</p>
        </div>
      </div>
    </div>
  );
}
