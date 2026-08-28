import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { Pulse_appspulse_apptype } from '../generated/models/Pulse_appsModel';
import { withHiddenNavbar } from '../utils/url';
import { recordAppUsage } from '../services/usageTracking';
import { Icon } from './Icon';
import { IconArrowUpRight, IconGlobe, IconMonitor, IconSmartphone, IconStar } from './icons';

interface AppCardProps {
  app: Pulse_apps;
  accent?: string;
  moduleName?: string;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: (appId: string) => void;
}

const USAGE_RECORD_TIMEOUT_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchApp(app: Pulse_apps) {
  if (!app.pulse_appurl) return;
  const url = withHiddenNavbar(app.pulse_appurl);
  // window.location.href triggers a same-tab navigation, which cancels any
  // in-flight requests once the browser starts unloading this page. Give
  // recordAppUsage a brief, capped head start so its writes actually reach
  // the server before that happens, without noticeably delaying the launch.
  await Promise.race([recordAppUsage(app.pulse_appid), delay(USAGE_RECORD_TIMEOUT_MS)]);
  window.location.href = url;
}

const TYPE_ICON: Record<string, typeof IconGlobe> = {
  Web: IconGlobe,
  Mobile: IconSmartphone,
  Desktop: IconMonitor,
};

export function AppCard({ app, accent, moduleName, isFavorite, isFavoritePending, onToggleFavorite }: AppCardProps) {
  const typeLabel = app.pulse_apptype ? Pulse_appspulse_apptype[app.pulse_apptype] : undefined;
  const TypeIcon = typeLabel ? TYPE_ICON[typeLabel] : undefined;

  return (
    <button
      type="button"
      className="app-card"
      style={accent ? ({ '--module-accent': accent } as React.CSSProperties) : undefined}
      onClick={() => launchApp(app)}
      disabled={!app.pulse_appurl}
    >
      <div className="app-card-header">
        <Icon src={app.pulse_iconurl} alt={app.pulse_name ?? 'App'} size={36} />
        <div className="app-card-header-right">
          {typeLabel && (
            <span className="app-card-badge">
              {TypeIcon && <TypeIcon width={12} height={12} strokeWidth={2} />}
              {typeLabel}
            </span>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              className={`app-card-favorite${isFavorite ? ' active' : ''}${isFavoritePending ? ' pending' : ''}`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isFavorite}
              disabled={isFavoritePending}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(app.pulse_appid);
              }}
            >
              <IconStar width={16} height={16} filled={isFavorite} />
            </button>
          )}
        </div>
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
