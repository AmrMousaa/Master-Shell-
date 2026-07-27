import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import { Icon } from './Icon';
import { IconHome } from './icons';

interface SidebarProps {
  modules: Pulse_modules[];
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  onSelectOverview: () => void;
}

const DEFAULT_ACCENT = '#b8862f';

export function Sidebar({ modules, selectedModuleId, onSelectModule, onSelectOverview }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Modules">
      <span className="sidebar-caption">All modules</span>
      <ul className="sidebar-list">
        <li>
          <button
            type="button"
            className={`sidebar-item${selectedModuleId === null ? ' active' : ''}`}
            style={{ '--module-accent': DEFAULT_ACCENT } as React.CSSProperties}
            onClick={onSelectOverview}
          >
            <span className="sidebar-item-accent" />
            <span className="sidebar-item-icon">
              <IconHome width={14} height={14} />
            </span>
            <span className="sidebar-item-label">Home</span>
          </button>
        </li>
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
                <span className="sidebar-item-icon">
                  <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={15} />
                </span>
                <span className="sidebar-item-label">{module.pulse_name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
