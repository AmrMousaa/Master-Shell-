import { IconBarChart, IconHome, IconSettings } from './icons';

interface DockProps {
  active: 'home' | 'analytics' | 'pulseConfig';
  onGoHome: () => void;
  onSelectAnalytics: () => void;
  onSelectPulseConfig: () => void;
  canViewAnalytics?: boolean;
  canManagePulseConfig?: boolean;
}

export function Dock({
  active,
  onGoHome,
  onSelectAnalytics,
  onSelectPulseConfig,
  canViewAnalytics,
  canManagePulseConfig,
}: DockProps) {
  if (!canViewAnalytics && !canManagePulseConfig) {
    return null;
  }

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
            className={`dock-item dock-item-analytics${active === 'analytics' ? ' active' : ''}`}
            onClick={onSelectAnalytics}
          >
            <span className="dock-icon">
              <IconBarChart width={19} height={19} aria-hidden="true" />
            </span>
            <span className="dock-label">Analytical dashboard</span>
          </button>
        )}
        {canManagePulseConfig && (
          <button
            type="button"
            className={`dock-item${active === 'pulseConfig' ? ' active' : ''}`}
            onClick={onSelectPulseConfig}
          >
            <span className="dock-icon">
              <IconSettings width={19} height={19} aria-hidden="true" />
            </span>
            <span className="dock-label">Configuration</span>
          </button>
        )}
      </div>
    </div>
  );
}
