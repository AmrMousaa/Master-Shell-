import { IconBarChart, IconHome, IconSettings } from './icons';

interface DockProps {
  active: 'home' | 'analytics' | 'settings';
  onGoHome: () => void;
  onSelectAnalytics: () => void;
  onSelectSettings: () => void;
  canViewAnalytics?: boolean;
}

export function Dock({ active, onGoHome, onSelectAnalytics, onSelectSettings, canViewAnalytics }: DockProps) {
  return (
    <div className="dock-wrap">
      <div className="dock">
        <button type="button" className={`dock-item${active === 'home' ? ' active' : ''}`} onClick={onGoHome}>
          <span className="dock-icon">
            <IconHome width={19} height={19} aria-hidden="true" />
          </span>
          <span className="dock-label">Home</span>
        </button>
        {canViewAnalytics && (
          <button
            type="button"
            className={`dock-item${active === 'analytics' ? ' active' : ''}`}
            onClick={onSelectAnalytics}
          >
            <span className="dock-icon">
              <IconBarChart width={19} height={19} aria-hidden="true" />
            </span>
            <span className="dock-label">Analytical dashboard</span>
          </button>
        )}
        <button
          type="button"
          className={`dock-item${active === 'settings' ? ' active' : ''}`}
          onClick={onSelectSettings}
        >
          <span className="dock-icon">
            <IconSettings width={19} height={19} aria-hidden="true" />
          </span>
          <span className="dock-label">Configurations</span>
        </button>
      </div>
    </div>
  );
}
