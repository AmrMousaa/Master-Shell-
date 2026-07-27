import { useCallback, useEffect, useState } from 'react';
import { Pulse_modulesService } from '../generated/services/Pulse_modulesService';
import { Pulse_appsService } from '../generated/services/Pulse_appsService';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';

export interface ModuleWithApps {
  module: Pulse_modules;
  apps: Pulse_apps[];
}

interface NavigationDataState {
  status: 'loading' | 'error' | 'ready';
  error?: string;
  modules: Pulse_modules[];
  apps: Pulse_apps[];
  modulesById: Map<string, ModuleWithApps>;
}

const ACTIVE_FILTER = 'pulse_isactive eq true';
const ORDER_BY = ['pulse_order asc'];

function groupAppsByModule(modules: Pulse_modules[], apps: Pulse_apps[]): Map<string, ModuleWithApps> {
  const map = new Map<string, ModuleWithApps>();
  for (const module of modules) {
    map.set(module.pulse_moduleid, { module, apps: [] });
  }
  for (const app of apps) {
    const moduleId = app._pulse_module_value;
    if (!moduleId) continue;
    const entry = map.get(moduleId);
    if (entry) entry.apps.push(app);
  }
  return map;
}

export function useNavigationData() {
  const [state, setState] = useState<NavigationDataState>({
    status: 'loading',
    modules: [],
    apps: [],
    modulesById: new Map(),
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const [modulesResult, appsResult] = await Promise.all([
        Pulse_modulesService.getAll({ filter: ACTIVE_FILTER, orderBy: ORDER_BY }),
        Pulse_appsService.getAll({ filter: ACTIVE_FILTER, orderBy: ORDER_BY }),
      ]);

      if (!modulesResult.success || !modulesResult.data) {
        throw new Error(modulesResult.error?.message ?? 'Failed to load modules.');
      }
      if (!appsResult.success || !appsResult.data) {
        throw new Error(appsResult.error?.message ?? 'Failed to load apps.');
      }

      const modules = modulesResult.data;
      const apps = appsResult.data;

      setState({
        status: 'ready',
        modules,
        apps,
        modulesById: groupAppsByModule(modules, apps),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong while loading navigation data.',
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, retry: load };
}
