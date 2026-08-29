import { useState, type ReactNode } from 'react';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { launchApp } from '../utils/launchApp';
import { initials } from '../utils/initials';
import { Icon } from './Icon';
import { IconChevronLeft, IconChevronRight, IconLayers, IconSearch, IconStar } from './icons';

interface SidebarProps {
  modules: Pulse_modules[];
  modulesById: Map<string, ModuleWithApps>;
  selectedModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  onGoHome: () => void;
  favoritedAppIds: Set<string>;
  onToggleFavorite: (appId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function Sidebar({
  modules,
  modulesById,
  selectedModuleId,
  onSelectModule,
  onGoHome,
  favoritedAppIds,
  onToggleFavorite,
  isOpen,
  onClose,
  userName,
}: SidebarProps) {
  const [expandedId, setExpandedId] = useState<string | null>(modules[0]?.pulse_moduleid ?? null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = modules
    .map((module) => {
      const apps = modulesById.get(module.pulse_moduleid)?.apps ?? [];
      const moduleMatches = (module.pulse_name ?? '').toLowerCase().includes(q);
      const matchingApps = q && !moduleMatches ? apps.filter((app) => (app.pulse_name ?? '').toLowerCase().includes(q)) : apps;
      if (q && !moduleMatches && matchingApps.length === 0) return null;
      return { module, apps: matchingApps };
    })
    .filter((entry): entry is { module: Pulse_modules; apps: Pulse_apps[] } => entry !== null);

  return (
    <>
      <div className={`backdrop${isOpen ? ' show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-top" />
        <div className="sb-header">
          <button
            type="button"
            className="sb-logo-btn"
            onClick={() => {
              onGoHome();
              onClose();
            }}
          >
            <span className="sb-logo" aria-hidden="true">
              <IconLayers width={18} height={18} />
            </span>
            <span className="sb-brand">
              <span className="n">Andalusia Pulse</span>
              <span className="s">ENTERPRISE HUB</span>
            </span>
          </button>
          <button type="button" className="sb-collapse" onClick={onClose} aria-label="Close sidebar">
            <IconChevronLeft width={14} height={14} />
          </button>
        </div>

        <div className="sb-search">
          <div className="sb-search-in">
            <IconSearch width={14} height={14} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search modules or apps"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search modules or apps"
            />
          </div>
        </div>

        <nav className="sb-nav" aria-label="Modules and apps">
          {filtered.length === 0 ? (
            q && <div className="sb-empty">No matches for &ldquo;{query}&rdquo;</div>
          ) : (
            filtered.map(({ module, apps }) => {
              const isExpanded = module.pulse_moduleid === expandedId || Boolean(q);
              const isCurrent = module.pulse_moduleid === selectedModuleId;
              return (
                <div key={module.pulse_moduleid} className={`sb-item${isExpanded ? ' expanded' : ''}`}>
                  <div
                    className={`sb-row${isCurrent ? ' current' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId((prev) => (prev === module.pulse_moduleid ? null : module.pulse_moduleid))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId((prev) => (prev === module.pulse_moduleid ? null : module.pulse_moduleid));
                      }
                    }}
                  >
                    <span className="sb-icon">
                      <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={18} />
                    </span>
                    <span className="sb-label">{highlight(module.pulse_name ?? '', q)}</span>
                    <span className="sb-count">{apps.length}</span>
                    <IconChevronRight className="sb-chev" width={13} height={13} aria-hidden="true" />
                  </div>
                  <div className="sb-sub">
                    {apps.map((app) => {
                      const isPinned = favoritedAppIds.has(app.pulse_appid);
                      const disabled = !app.pulse_appurl;
                      return (
                        <div
                          key={app.pulse_appid}
                          className={`sb-app${disabled ? ' disabled' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (disabled) return;
                            launchApp(app);
                            onSelectModule(module.pulse_moduleid);
                            onClose();
                          }}
                        >
                          <span className="sb-app-name">{highlight(app.pulse_name ?? '', q)}</span>
                          <span
                            className={`sb-star${isPinned ? ' pinned' : ''}`}
                            role="button"
                            tabIndex={0}
                            aria-label={isPinned ? 'Unpin app' : 'Pin app'}
                            title={isPinned ? 'Unpin' : 'Pin app'}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(app.pulse_appid);
                            }}
                          >
                            <IconStar width={12} height={12} filled={isPinned} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </nav>

        <div className="sb-footer">
          <div className="sb-avatar">{initials(userName)}</div>
          <div className="sb-user">
            <div className="un">{userName ?? 'Andalusia Pulse'}</div>
            <div className="ur">Enterprise workspace</div>
          </div>
        </div>
      </aside>
    </>
  );
}
