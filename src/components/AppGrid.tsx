import type { ReactNode } from 'react';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { AppTile } from './AppTile';
import { Icon } from './Icon';
import { IconChevronLeft, IconInbox } from './icons';

interface AppGridProps {
  title: string;
  description?: string;
  iconUrl?: string;
  icon?: ReactNode;
  apps: Pulse_apps[];
  emptyMessage: string;
  showModuleName?: boolean;
  moduleNameById?: Map<string, string>;
  favoritedAppIds?: Set<string>;
  pendingAppIds?: Set<string>;
  onToggleFavorite?: (appId: string) => void;
  onLaunchApp: (app: Pulse_apps) => void;
  onBack: () => void;
}

export function AppGrid({
  title,
  description,
  iconUrl,
  icon,
  apps,
  emptyMessage,
  showModuleName,
  moduleNameById,
  favoritedAppIds,
  pendingAppIds,
  onToggleFavorite,
  onLaunchApp,
  onBack,
}: AppGridProps) {
  return (
    <div>
      <button type="button" className="back-btn" onClick={onBack}>
        <IconChevronLeft width={14} height={14} aria-hidden="true" />
        Back to home
      </button>
      <div className="mp-head">
        <div className="mp-ring">{icon ?? <Icon src={iconUrl} alt={title} size={26} />}</div>
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="sec-head" style={{ marginTop: 0 }}>
        <div className="sec-head-left">
          <h2>Apps</h2>
        </div>
        <span className="hint">
          {apps.length} {apps.length === 1 ? 'app' : 'apps'}
        </span>
      </div>
      {apps.length === 0 ? (
        <div className="empty-state">
          <IconInbox width={26} height={26} aria-hidden="true" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="tile-grid">
          {apps.map((app, index) => (
            <AppTile
              key={app.pulse_appid}
              app={app}
              index={index}
              moduleName={showModuleName ? moduleNameById?.get(app._pulse_module_value ?? '') : undefined}
              isFavorite={favoritedAppIds?.has(app.pulse_appid)}
              isFavoritePending={pendingAppIds?.has(app.pulse_appid)}
              onToggleFavorite={onToggleFavorite}
              onLaunch={onLaunchApp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
