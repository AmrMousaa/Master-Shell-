import { useEffect, useMemo, useState } from 'react';
import { Pulse_apppermissionsService } from '../../generated/services/Pulse_apppermissionsService';
import { Pulse_favoritesService } from '../../generated/services/Pulse_favoritesService';
import type { Pulse_apps } from '../../generated/models/Pulse_appsModel';
import type { Pulse_modules } from '../../generated/models/Pulse_modulesModel';
import { useModuleConfig } from '../../hooks/useModuleConfig';
import { useAppConfig } from '../../hooks/useAppConfig';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { IconChevronLeft, IconSettings } from '../icons';
import { ModuleConfigList } from './ModuleConfigList';
import { ModuleConfigForm } from './ModuleConfigForm';
import { AppConfigList } from './AppConfigList';
import { AppConfigForm } from './AppConfigForm';

interface PulseConfigScreenProps {
  onBack: () => void;
  onError: (message: string) => void;
}

type Tab = 'modules' | 'apps';
type SubView = { kind: 'list' } | { kind: 'module-form'; module?: Pulse_modules } | { kind: 'app-form'; app?: Pulse_apps };

export function PulseConfigScreen({ onBack, onError }: PulseConfigScreenProps) {
  const moduleConfig = useModuleConfig();
  const appConfig = useAppConfig();
  const [tab, setTab] = useState<Tab>('modules');
  const [subView, setSubView] = useState<SubView>({ kind: 'list' });
  const [roleCountByAppId, setRoleCountByAppId] = useState<Map<string, number>>(new Map());
  const [favoriteCountByAppId, setFavoriteCountByAppId] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function loadAggregates() {
      const [permissionsResult, favoritesResult] = await Promise.all([
        Pulse_apppermissionsService.getAll({ filter: 'statecode eq 0' }),
        Pulse_favoritesService.getAll({ filter: 'statecode eq 0' }),
      ]);
      if (cancelled) return;

      if (permissionsResult.success && permissionsResult.data) {
        const counts = new Map<string, number>();
        for (const permission of permissionsResult.data) {
          const appId = permission._pulse_app_value;
          if (!appId) continue;
          counts.set(appId, (counts.get(appId) ?? 0) + 1);
        }
        setRoleCountByAppId(counts);
      }

      if (favoritesResult.success && favoritesResult.data) {
        const counts = new Map<string, number>();
        for (const favorite of favoritesResult.data) {
          const appId = favorite._pulse_app_value;
          if (!appId) continue;
          counts.set(appId, (counts.get(appId) ?? 0) + 1);
        }
        setFavoriteCountByAppId(counts);
      }
    }
    loadAggregates();
    return () => {
      cancelled = true;
    };
  }, [tab, subView]);

  const moduleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const module of moduleConfig.modules) {
      map.set(module.pulse_moduleid, module.pulse_name ?? '');
    }
    return map;
  }, [moduleConfig.modules]);

  const appCountByModuleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of appConfig.apps) {
      const moduleId = app._pulse_module_value;
      if (!moduleId) continue;
      map.set(moduleId, (map.get(moduleId) ?? 0) + 1);
    }
    return map;
  }, [appConfig.apps]);

  const activeAppCountByModuleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of appConfig.apps) {
      const moduleId = app._pulse_module_value;
      if (!moduleId || app.statecode !== 0) continue;
      map.set(moduleId, (map.get(moduleId) ?? 0) + 1);
    }
    return map;
  }, [appConfig.apps]);

  const activeModules = useMemo(() => moduleConfig.modules.filter((m) => m.statecode === 0), [moduleConfig.modules]);

  const moduleIconById = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const module of moduleConfig.modules) {
      map.set(module.pulse_moduleid, module.pulse_iconurl);
    }
    return map;
  }, [moduleConfig.modules]);

  async function handleReorderModules(reordered: Pulse_modules[]) {
    try {
      await moduleConfig.reorderModules(reordered);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to reorder modules.');
    }
  }

  async function handleDeactivateModule(module: Pulse_modules) {
    try {
      await moduleConfig.updateModule(module.pulse_moduleid, { statecode: 1 });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to deactivate the module.');
    }
  }

  async function handleReorderApps(reorderedForModule: Pulse_apps[]) {
    try {
      await appConfig.reorderAppsWithinModule(reorderedForModule);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to reorder apps.');
    }
  }

  async function handleDeactivateApp(app: Pulse_apps) {
    try {
      await appConfig.updateApp(app.pulse_appid, { statecode: 1 });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to deactivate the app.');
    }
  }

  async function handleSyncIconsWithModules() {
    try {
      const { updated } = await appConfig.syncIconsWithModules(moduleIconById);
      return updated;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to sync app icons with their modules.');
      throw err;
    }
  }

  if (moduleConfig.status === 'loading' || appConfig.status === 'loading') {
    return <LoadingState />;
  }
  if (moduleConfig.status === 'error') {
    return <ErrorState message={moduleConfig.error} onRetry={moduleConfig.retry} />;
  }
  if (appConfig.status === 'error') {
    return <ErrorState message={appConfig.error} onRetry={appConfig.retry} />;
  }

  const showTabsAndHeader = subView.kind === 'list';

  return (
    <div>
      {showTabsAndHeader && (
        <>
          <button type="button" className="back-btn" onClick={onBack}>
            <IconChevronLeft width={14} height={14} aria-hidden="true" />
            Back to home
          </button>

          <div className="mp-head">
            <div className="mp-ring">
              <IconSettings width={26} height={26} aria-hidden="true" />
            </div>
            <div>
              <h1>Pulse Configuration</h1>
              <p>Manage modules, apps, and per-app role permissions.</p>
            </div>
          </div>

          <div className="cfg-tabs">
            <button type="button" className={`cfg-tab${tab === 'modules' ? ' active' : ''}`} onClick={() => setTab('modules')}>
              Modules
            </button>
            <button type="button" className={`cfg-tab${tab === 'apps' ? ' active' : ''}`} onClick={() => setTab('apps')}>
              Apps
            </button>
          </div>
        </>
      )}

      {subView.kind === 'module-form' ? (
        <ModuleConfigForm
          initialModule={subView.module}
          isNameTaken={moduleConfig.isNameTaken}
          onCancel={() => setSubView({ kind: 'list' })}
          onSubmit={async (input) => {
            if (subView.module) {
              await moduleConfig.updateModule(subView.module.pulse_moduleid, input);
            } else {
              await moduleConfig.createModule(input);
            }
            setSubView({ kind: 'list' });
          }}
        />
      ) : subView.kind === 'app-form' ? (
        <AppConfigForm
          initialApp={subView.app}
          activeModules={activeModules}
          onCancel={() => setSubView({ kind: 'list' })}
          onSubmit={async (input) => {
            if (subView.app) {
              await appConfig.updateApp(subView.app.pulse_appid, input);
            } else {
              await appConfig.createApp(input);
            }
            setSubView({ kind: 'list' });
          }}
        />
      ) : tab === 'modules' ? (
        <ModuleConfigList
          modules={moduleConfig.modules}
          appCountByModuleId={appCountByModuleId}
          activeAppCountByModuleId={activeAppCountByModuleId}
          onAdd={() => setSubView({ kind: 'module-form' })}
          onEdit={(module) => setSubView({ kind: 'module-form', module })}
          onDeactivate={handleDeactivateModule}
          onReorder={handleReorderModules}
        />
      ) : (
        <AppConfigList
          apps={appConfig.apps}
          modules={moduleConfig.modules}
          moduleNameById={moduleNameById}
          roleCountByAppId={roleCountByAppId}
          favoriteCountByAppId={favoriteCountByAppId}
          onAdd={() => setSubView({ kind: 'app-form' })}
          onEdit={(app) => setSubView({ kind: 'app-form', app })}
          onDeactivate={handleDeactivateApp}
          onReorder={handleReorderApps}
          onSyncIconsWithModules={handleSyncIconsWithModules}
        />
      )}
    </div>
  );
}
