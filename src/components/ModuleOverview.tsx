import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { HeroClock } from './Clock';
import { Icon } from './Icon';
import { IconChevronRight, IconGrid, IconHub, IconInbox } from './icons';

interface ModuleOverviewProps {
  modulesById: Map<string, ModuleWithApps>;
  onSelectModule: (moduleId: string) => void;
}

const DEFAULT_ACCENT = '#b8862f';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function ModuleOverview({ modulesById, onSelectModule }: ModuleOverviewProps) {
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
    <div className="module-overview">
      <div className="overview-hero">
        <div className="overview-hero-texture" aria-hidden="true" />
        <div className="overview-hero-glow" aria-hidden="true" />
        <div className="overview-hero-main">
          <div className="overview-hero-icon" aria-hidden="true">
            <IconHub width={26} height={26} />
          </div>
          <h1 className="overview-hero-title">{getGreeting()}</h1>
          <p className="overview-hero-subtitle">Everything your team needs, in one place.</p>
          <div className="overview-hero-stats">
            <span className="overview-hero-stat">
              <IconGrid width={14} height={14} />
              {entries.length} {entries.length === 1 ? 'module' : 'modules'}
            </span>
            <span className="overview-hero-stat-divider" />
            <span className="overview-hero-stat">
              {totalApps} {totalApps === 1 ? 'app' : 'apps'} available
            </span>
          </div>
        </div>
        <HeroClock />
      </div>
      <h2 className="section-title section-title-plain">
        <IconGrid width={16} height={16} />
        Modules
      </h2>
      <div className="module-grid">
        {entries.map(({ module, apps }) => (
          <ModuleTile key={module.pulse_moduleid} module={module} appCount={apps.length} onSelect={onSelectModule} />
        ))}
      </div>
    </div>
  );
}

function ModuleTile({
  module,
  appCount,
  onSelect,
}: {
  module: Pulse_modules;
  appCount: number;
  onSelect: (moduleId: string) => void;
}) {
  const accent = module.pulse_colorcode || DEFAULT_ACCENT;
  return (
    <button
      type="button"
      className="module-tile"
      style={{ '--module-accent': accent } as React.CSSProperties}
      onClick={() => onSelect(module.pulse_moduleid)}
    >
      <div className="module-tile-glow" aria-hidden="true" />
      <div className="module-tile-name-row">
        <div className="module-tile-icon">
          <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={22} />
        </div>
        <span className="module-tile-chevron-ring">
          <IconChevronRight className="module-tile-chevron" width={15} height={15} aria-hidden="true" />
        </span>
      </div>
      <div className="module-tile-name">{module.pulse_name}</div>
      {module.pulse_description && <p className="module-tile-description">{module.pulse_description}</p>}
      <span className="module-tile-count">
        <IconGrid width={11} height={11} />
        {appCount} {appCount === 1 ? 'app' : 'apps'}
      </span>
    </button>
  );
}
