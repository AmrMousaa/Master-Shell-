import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { Pulse_appspulse_apptype } from '../generated/models/Pulse_appsModel';
import { Icon } from './Icon';
import { IconArrowUpRight, IconGlobe, IconMonitor, IconSmartphone } from './icons';

interface AppCardProps {
  app: Pulse_apps;
  accent?: string;
  moduleName?: string;
  onLaunch: (app: Pulse_apps) => void;
}

const TYPE_ICON: Record<string, typeof IconGlobe> = {
  Web: IconGlobe,
  Mobile: IconSmartphone,
  Desktop: IconMonitor,
};

export function AppCard({ app, accent, moduleName, onLaunch }: AppCardProps) {
  const typeLabel = app.pulse_apptype ? Pulse_appspulse_apptype[app.pulse_apptype] : undefined;
  const TypeIcon = typeLabel ? TYPE_ICON[typeLabel] : undefined;

  return (
    <button
      type="button"
      className="app-card"
      style={accent ? ({ '--module-accent': accent } as React.CSSProperties) : undefined}
      onClick={() => onLaunch(app)}
      disabled={!app.pulse_appurl}
    >
      <div className="app-card-header">
        <Icon src={app.pulse_iconurl} alt={app.pulse_name ?? 'App'} size={36} />
        {typeLabel && (
          <span className="app-card-badge">
            {TypeIcon && <TypeIcon width={12} height={12} strokeWidth={2} />}
            {typeLabel}
          </span>
        )}
      </div>
      <div className="app-card-title-row">
        <span className="app-card-title">{app.pulse_name}</span>
        <IconArrowUpRight className="app-card-launch-icon" width={14} height={14} aria-hidden="true" />
      </div>
      {app.pulse_description && <p className="app-card-description">{app.pulse_description}</p>}
      {moduleName && <div className="app-card-module">{moduleName}</div>}
    </button>
  );
}
