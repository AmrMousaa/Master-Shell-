import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { AppTile } from './AppTile';
import { HeroClock } from './Clock';
import { Icon } from './Icon';
import { IconInbox, IconStar } from './icons';

interface ModuleOverviewProps {
  modulesById: Map<string, ModuleWithApps>;
  onSelectModule: (moduleId: string) => void;
  favoriteApps: Pulse_apps[];
  pendingAppIds: Set<string>;
  onToggleFavorite: (appId: string) => void;
  moduleNameById: Map<string, string>;
  userName?: string;
}

const EYEBROW_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function ModuleOverview({
  modulesById,
  onSelectModule,
  favoriteApps,
  pendingAppIds,
  onToggleFavorite,
  moduleNameById,
  userName,
}: ModuleOverviewProps) {
  const firstName = userName?.trim().split(/\s+/)[0];
  const entries = Array.from(modulesById.values());

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No active modules have been configured yet.</p>
      </div>
    );
  }

  const totalApps = entries.reduce((sum, entry) => sum + entry.apps.length, 0);

  return (
    <div>
      <div className="hero">
        <HeroPattern />
        <div className="eyebrow">{EYEBROW_FORMATTER.format(new Date())} &middot; Enterprise workspace</div>
        <h1>
          {getGreeting()}
          {firstName ? <>, <em>{firstName}</em></> : null}
        </h1>
        <div className="hero-rule" />
        <p>
          Everything your team needs, gathered in one place &mdash; {entries.length} {entries.length === 1 ? 'module' : 'modules'},{' '}
          {totalApps} {totalApps === 1 ? 'app' : 'apps'}, always within reach.
        </p>
        <div className="hero-meta">
          <HeroClock />
          <div className="hero-live">
            <span className="dot" aria-hidden="true" />
            Systems live
          </div>
        </div>
      </div>

      <div className="stat-band">
        <div className="stat-item">
          <div className="stat-num">{entries.length}</div>
          <div className="stat-lbl">Modules</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">{totalApps}</div>
          <div className="stat-lbl">Apps available</div>
        </div>
      </div>

      <div className="sec-head">
        <div className="sec-head-left">
          <h2>Pinned apps</h2>
        </div>
        <span className="hint">{favoriteApps.length > 0 ? `${favoriteApps.length} pinned` : 'Star any app to pin it here'}</span>
      </div>
      {favoriteApps.length === 0 ? (
        <div className="empty-block">
          <div className="empty-block-icon">
            <IconStar width={16} height={16} />
          </div>
          <div>
            <strong>No pinned apps yet</strong>
            Star an app in the sidebar or any module page to see it here.
          </div>
        </div>
      ) : (
        <div className="tile-grid" style={{ marginBottom: 36 }}>
          {favoriteApps.map((app, index) => (
            <AppTile
              key={app.pulse_appid}
              app={app}
              index={index}
              moduleName={moduleNameById.get(app._pulse_module_value ?? '')}
              isFavorite
              isFavoritePending={pendingAppIds.has(app.pulse_appid)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}

      <div className="sec-head">
        <div className="sec-head-left">
          <h2>All modules</h2>
        </div>
        <span className="hint">Click a module to open its apps</span>
      </div>
      <div className="tile-grid">
        {entries.map(({ module, apps }, index) => (
          <ModuleTile key={module.pulse_moduleid} module={module} appCount={apps.length} index={index} onSelect={onSelectModule} />
        ))}
      </div>
    </div>
  );
}

function ModuleTile({
  module,
  appCount,
  index,
  onSelect,
}: {
  module: Pulse_modules;
  appCount: number;
  index: number;
  onSelect: (moduleId: string) => void;
}) {
  return (
    <button
      type="button"
      className="tile"
      style={{ animationDelay: `${Math.min(index, 14) * 30}ms` }}
      onClick={() => onSelect(module.pulse_moduleid)}
    >
      <div className="tile-ring">
        <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={22} />
      </div>
      <div className="tile-name">{module.pulse_name}</div>
      <div className="tile-meta">
        {appCount} {appCount === 1 ? 'app' : 'apps'}
      </div>
    </button>
  );
}

function HeroPattern() {
  return (
    <svg className="hero-pattern" viewBox="0 0 400 280" fill="none" aria-hidden="true">
      <defs>
        <pattern id="lattice" width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M26 0L52 26L26 52L0 26Z" stroke="#A08561" strokeWidth="1" />
          <circle cx="26" cy="26" r="8" stroke="#A08561" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="400" height="280" fill="url(#lattice)" />
    </svg>
  );
}
