import { useCallback, useEffect, useState } from 'react';
import { Pulse_modulesService } from '../generated/services/Pulse_modulesService';
import { Pulse_appsService } from '../generated/services/Pulse_appsService';
import { Pulse_apppermissionsService } from '../generated/services/Pulse_apppermissionsService';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { getCurrentUserAccess, type CurrentUserAccess } from '../services/currentUserAccess';

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
const ACTIVE_PERMISSIONS_FILTER = 'statecode eq 0';

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

function filterAppsByAccess(
  apps: Pulse_apps[],
  requiredRoleIdsByApp: Map<string, Set<string>>,
  access: CurrentUserAccess
): Pulse_apps[] {
  if (access.isSystemAdministrator) return apps;
  return apps.filter((app) => {
    const requiredRoleIds = requiredRoleIdsByApp.get(app.pulse_appid);
    if (!requiredRoleIds || requiredRoleIds.size === 0) return true;
    for (const roleId of requiredRoleIds) {
      if (access.roleIds.has(roleId)) return true;
    }
    return false;
  });
}

function filterModulesWithApps(modules: Pulse_modules[], visibleApps: Pulse_apps[]): Pulse_modules[] {
  const moduleIdsWithVisibleApps = new Set(visibleApps.map((app) => app._pulse_module_value));
  return modules.filter((module) => moduleIdsWithVisibleApps.has(module.pulse_moduleid));
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
      const access = await getCurrentUserAccess();

      const [modulesResult, appsResult, permissionsResult] = await Promise.all([
        Pulse_modulesService.getAll({ filter: ACTIVE_FILTER, orderBy: ORDER_BY }),
        Pulse_appsService.getAll({ filter: ACTIVE_FILTER, orderBy: ORDER_BY }),
        Pulse_apppermissionsService.getAll({ filter: ACTIVE_PERMISSIONS_FILTER }),
      ]);

      if (!modulesResult.success || !modulesResult.data) {
        throw new Error(modulesResult.error?.message ?? 'Failed to load modules.');
      }
      if (!appsResult.success || !appsResult.data) {
        throw new Error(appsResult.error?.message ?? 'Failed to load apps.');
      }
      if (!permissionsResult.success || !permissionsResult.data) {
        throw new Error(permissionsResult.error?.message ?? 'Failed to load app permissions.');
      }

      const requiredRoleIdsByApp = new Map<string, Set<string>>();
      for (const permission of permissionsResult.data) {
        const appId = permission._pulse_app_value;
        const roleId = permission._pulse_securityrole_value;
        if (!appId || !roleId) continue;
        const roleIds = requiredRoleIdsByApp.get(appId) ?? new Set<string>();
        roleIds.add(roleId);
        requiredRoleIdsByApp.set(appId, roleIds);
      }

      const apps = filterAppsByAccess(appsResult.data, requiredRoleIdsByApp, access);
      const modules = filterModulesWithApps(modulesResult.data, apps);

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
