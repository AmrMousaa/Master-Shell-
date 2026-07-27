import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import { Icon } from './Icon';

interface SidebarProps {
  modules: Pulse_modules[];
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  onSelectOverview: () => void;
}

const DEFAULT_ACCENT = '#2563eb';

export function Sidebar({ modules, selectedModuleId, onSelectModule, onSelectOverview }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Modules">
      <button
        type="button"
        className={`sidebar-overview-link${selectedModuleId === null ? ' active' : ''}`}
        onClick={onSelectOverview}
      >
        All modules
      </button>
      <ul className="sidebar-list">
        {modules.map((module) => {
          const accent = module.pulse_colorcode || DEFAULT_ACCENT;
          const isActive = module.pulse_moduleid === selectedModuleId;
          return (
            <li key={module.pulse_moduleid}>
              <button
                type="button"
                className={`sidebar-item${isActive ? ' active' : ''}`}
                style={{ '--module-accent': accent } as React.CSSProperties}
                onClick={() => onSelectModule(module.pulse_moduleid)}
              >
                <span className="sidebar-item-accent" />
                <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={22} />
                <span className="sidebar-item-label">{module.pulse_name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
