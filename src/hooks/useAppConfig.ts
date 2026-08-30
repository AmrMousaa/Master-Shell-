import { useCallback, useEffect, useRef, useState } from 'react';
import { Pulse_appsService } from '../generated/services/Pulse_appsService';
import type { Pulse_apps, Pulse_appsBase } from '../generated/models/Pulse_appsModel';

const ORDER_BY = ['pulse_order asc'];

export interface AppFormInput {
  pulse_name: string;
  pulse_description?: string;
  pulse_appurl: string;
  pulse_iconurl?: string;
  moduleId: string;
  statecode: 0 | 1;
}

interface AppConfigState {
  status: 'loading' | 'error' | 'ready';
  error?: string;
  apps: Pulse_apps[];
}

function sortByOrder(apps: Pulse_apps[]): Pulse_apps[] {
  return [...apps].sort((a, b) => (a.pulse_order ?? 0) - (b.pulse_order ?? 0));
}

export function useAppConfig() {
  const [state, setState] = useState<AppConfigState>({ status: 'loading', apps: [] });

  // Kept in sync with `state.apps` so async operations always read the
  // latest list instead of a stale value captured by an earlier closure.
  const appsRef = useRef<Pulse_apps[]>(state.apps);
  useEffect(() => {
    appsRef.current = state.apps;
  }, [state.apps]);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const result = await Pulse_appsService.getAll({ orderBy: ORDER_BY });
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? 'Failed to load apps.');
      }
      setState({ status: 'ready', apps: sortByOrder(result.data) });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong while loading apps.',
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createApp = useCallback(async (input: AppFormInput) => {
    const snapshot = appsRef.current;
    const withinModule = snapshot.filter((app) => app._pulse_module_value === input.moduleId);
    const nextOrder = withinModule.length === 0 ? 0 : Math.max(...withinModule.map((a) => a.pulse_order ?? 0)) + 1;

    const result = await Pulse_appsService.create({
      pulse_name: input.pulse_name,
      pulse_description: input.pulse_description,
      pulse_appurl: input.pulse_appurl,
      pulse_iconurl: input.pulse_iconurl,
      'pulse_Module@odata.bind': `/pulse_modules(${input.moduleId})`,
      statecode: input.statecode,
      pulse_order: nextOrder,
    } as Omit<Pulse_appsBase, 'pulse_appid'>);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to create the app.');
    }

    appsRef.current = sortByOrder([...appsRef.current, result.data]);
    setState((prev) => ({ ...prev, apps: appsRef.current }));
    return result.data;
  }, []);

  const updateApp = useCallback(
    async (
      id: string,
      changes: Partial<Omit<AppFormInput, 'moduleId'>> & { moduleId?: string }
    ) => {
      const { moduleId, ...rest } = changes;
      const payload: Partial<Omit<Pulse_appsBase, 'pulse_appid'>> = { ...rest };
      if (moduleId) {
        (payload as Record<string, unknown>)['pulse_Module@odata.bind'] = `/pulse_modules(${moduleId})`;
      }

      const result = await Pulse_appsService.update(id, payload);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? 'Failed to update the app.');
      }

      const updated = result.data;
      appsRef.current = sortByOrder(appsRef.current.map((a) => (a.pulse_appid === id ? updated : a)));
      setState((prev) => ({ ...prev, apps: appsRef.current }));
      return updated;
    },
    []
  );

  const deactivateApp = useCallback(
    async (id: string) => {
      return updateApp(id, { statecode: 1 });
    },
    [updateApp]
  );

  const reorderAppsWithinModule = useCallback(async (reorderedForModule: Pulse_apps[]) => {
    const snapshot = appsRef.current;
    const previousOrderById = new Map(snapshot.map((a) => [a.pulse_appid, a.pulse_order ?? 0]));
    const resequenced = reorderedForModule.map((app, index) => ({ ...app, pulse_order: index }));
    const changed = resequenced.filter((app) => app.pulse_order !== previousOrderById.get(app.pulse_appid));

    const resequencedById = new Map(resequenced.map((app) => [app.pulse_appid, app]));
    const merged = snapshot.map((app) => resequencedById.get(app.pulse_appid) ?? app);

    appsRef.current = sortByOrder(merged);
    setState((prev) => ({ ...prev, apps: appsRef.current }));

    try {
      const results = await Promise.all(
        changed.map((app) => Pulse_appsService.update(app.pulse_appid, { pulse_order: app.pulse_order }))
      );
      if (results.some((result) => !result.success)) {
        throw new Error('Failed to save the new app order.');
      }
    } catch (err) {
      appsRef.current = snapshot;
      setState((prev) => ({ ...prev, apps: snapshot }));
      throw err instanceof Error ? err : new Error('Failed to save the new app order.');
    }
  }, []);

  const syncIconsWithModules = useCallback(async (moduleIconById: Map<string, string | undefined>) => {
    const snapshot = appsRef.current;
    const changed = snapshot.filter((app) => {
      const moduleIcon = app._pulse_module_value ? moduleIconById.get(app._pulse_module_value) : undefined;
      return moduleIcon && moduleIcon !== app.pulse_iconurl;
    });
    if (changed.length === 0) return { updated: 0 };

    const results = await Promise.all(
      changed.map((app) =>
        Pulse_appsService.update(app.pulse_appid, {
          pulse_iconurl: moduleIconById.get(app._pulse_module_value!),
        })
      )
    );
    const failed = results.find((result) => !result.success);
    if (failed) {
      throw new Error(failed.error?.message ?? 'Failed to sync some app icons with their module.');
    }

    const updatedById = new Map(results.map((result) => [result.data!.pulse_appid, result.data!]));
    appsRef.current = sortByOrder(snapshot.map((app) => updatedById.get(app.pulse_appid) ?? app));
    setState((prev) => ({ ...prev, apps: appsRef.current }));

    return { updated: changed.length };
  }, []);

  return {
    ...state,
    createApp,
    updateApp,
    deactivateApp,
    reorderAppsWithinModule,
    syncIconsWithModules,
    retry: load,
  };
}
