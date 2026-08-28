import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { AppCard } from './AppCard';
import { IconInbox } from './icons';

interface AppGridProps {
  title: string;
  description?: string;
  accent?: string;
  apps: Pulse_apps[];
  emptyMessage: string;
  showModuleName?: boolean;
  moduleNameById?: Map<string, string>;
  favoritedAppIds?: Set<string>;
  pendingAppIds?: Set<string>;
  onToggleFavorite?: (appId: string) => void;
}

export function AppGrid({
  title,
  description,
  accent,
  apps,
  emptyMessage,
  showModuleName,
  moduleNameById,
  favoritedAppIds,
  pendingAppIds,
  onToggleFavorite,
}: AppGridProps) {
  return (
    <div className="app-grid-section">
      <div className="section-header" style={accent ? ({ '--module-accent': accent } as React.CSSProperties) : undefined}>
        <h1 className="section-title">{title}</h1>
        {description && <p className="section-description">{description}</p>}
      </div>
      {apps.length === 0 ? (
        <div className="empty-state">
          <IconInbox width={26} height={26} aria-hidden="true" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="app-grid">
          {apps.map((app) => (
            <AppCard
              key={app.pulse_appid}
              app={app}
              accent={accent}
              moduleName={showModuleName ? moduleNameById?.get(app._pulse_module_value ?? '') : undefined}
              isFavorite={favoritedAppIds?.has(app.pulse_appid)}
              isFavoritePending={pendingAppIds?.has(app.pulse_appid)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
