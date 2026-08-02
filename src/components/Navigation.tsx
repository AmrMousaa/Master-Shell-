import { useEffect, useRef, useState } from 'react';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { withHiddenNavbar } from '../utils/url';
import { Icon } from './Icon';
import { IconChevronRight, IconHome } from './icons';

interface NavigationProps {
  modules: Pulse_modules[];
  modulesById: Map<string, ModuleWithApps>;
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  onSelectOverview: () => void;
}

const DEFAULT_ACCENT = '#b8862f';
const HOVER_CLOSE_DELAY = 150;
const PANEL_WIDTH = 280;
const PANEL_MARGIN = 16;

function launchApp(app: Pulse_apps) {
  if (!app.pulse_appurl) return;
  window.location.href = withHiddenNavbar(app.pulse_appurl);
}

export function Navigation({ modules, modulesById, selectedModuleId, onSelectModule, onSelectOverview }: NavigationProps) {
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [openRect, setOpenRect] = useState<{ top: number; left: number } | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const navRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenModuleId(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenModuleId(null);
    }
    function handleReposition(event: Event) {
      if (panelRef.current && event.target instanceof Node && panelRef.current.contains(event.target)) {
        return;
      }
      setOpenModuleId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  function cancelClose() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenModuleId(null), HOVER_CLOSE_DELAY);
  }

  function openModule(moduleId: string, trigger: HTMLElement) {
    cancelClose();
    setOpenModuleId(moduleId);
    const rect = trigger.getBoundingClientRect();
    setOpenRect({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN),
    });
  }

  function goToModule(moduleId: string) {
    onSelectModule(moduleId);
    setOpenModuleId(null);
  }

  function goToOverview() {
    onSelectOverview();
    setOpenModuleId(null);
  }

  function openApp(app: Pulse_apps) {
    launchApp(app);
    setOpenModuleId(null);
  }

  return (
    <nav className="app-nav" aria-label="Modules" ref={navRef} onMouseLeave={scheduleClose}>
      <ul className="app-nav-list">
        <li>
          <button
            type="button"
            className={`app-nav-item${selectedModuleId === null ? ' active' : ''}`}
            style={{ '--module-accent': DEFAULT_ACCENT } as React.CSSProperties}
            onClick={goToOverview}
          >
            <span className="app-nav-item-icon">
              <IconHome width={15} height={15} />
            </span>
            <span className="app-nav-item-label">Home</span>
          </button>
        </li>
        {modules.map((module) => {
          const accent = module.pulse_colorcode || DEFAULT_ACCENT;
          const isActive = module.pulse_moduleid === selectedModuleId;
          const isOpen = openModuleId === module.pulse_moduleid;
          const apps = modulesById.get(module.pulse_moduleid)?.apps ?? [];

          return (
            <li
              key={module.pulse_moduleid}
              className="app-nav-list-item"
              onMouseEnter={(e) => openModule(module.pulse_moduleid, e.currentTarget)}
            >
              <button
                type="button"
                className={`app-nav-item${isActive ? ' active' : ''}${isOpen ? ' open' : ''}`}
                style={{ '--module-accent': accent } as React.CSSProperties}
                aria-expanded={isOpen}
                aria-haspopup="true"
                onClick={(e) => openModule(module.pulse_moduleid, e.currentTarget)}
                onFocus={(e) => openModule(module.pulse_moduleid, e.currentTarget)}
              >
                <span className="app-nav-item-icon">
                  <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={15} />
                </span>
                <span className="app-nav-item-label">{module.pulse_name}</span>
              </button>

              {isOpen && apps.length > 0 && openRect && (
                <div
                  ref={panelRef}
                  className="app-nav-panel"
                  style={{ '--module-accent': accent, top: openRect.top, left: openRect.left } as React.CSSProperties}
                >
                  <button type="button" className="app-nav-panel-header" onClick={() => goToModule(module.pulse_moduleid)}>
                    <span>{module.pulse_name}</span>
                    <IconChevronRight width={14} height={14} />
                  </button>
                  <ul className="app-nav-panel-list">
                    {apps.map((app) => (
                      <li key={app.pulse_appid}>
                        <button
                          type="button"
                          className="app-nav-panel-item"
                          onClick={() => openApp(app)}
                          disabled={!app.pulse_appurl}
                        >
                          <Icon src={app.pulse_iconurl} alt={app.pulse_name ?? 'App'} size={22} />
                          <span className="app-nav-panel-item-label">{app.pulse_name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
