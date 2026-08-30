import { useCallback, useEffect, useRef, useState } from 'react';
import { Pulse_modulesService } from '../generated/services/Pulse_modulesService';
import type { Pulse_modules, Pulse_modulesBase } from '../generated/models/Pulse_modulesModel';

const ORDER_BY = ['pulse_order asc'];

export interface ModuleFormInput {
  pulse_name: string;
  pulse_description?: string;
  pulse_iconurl?: string;
  statecode: 0 | 1;
}

interface ModuleConfigState {
  status: 'loading' | 'error' | 'ready';
  error?: string;
  modules: Pulse_modules[];
}

function sortByOrder(modules: Pulse_modules[]): Pulse_modules[] {
  return [...modules].sort((a, b) => (a.pulse_order ?? 0) - (b.pulse_order ?? 0));
}

export function useModuleConfig() {
  const [state, setState] = useState<ModuleConfigState>({ status: 'loading', modules: [] });

  // Kept in sync with `state.modules` so async operations always read the
  // latest list instead of a stale value captured by an earlier closure.
  const modulesRef = useRef<Pulse_modules[]>(state.modules);
  useEffect(() => {
    modulesRef.current = state.modules;
  }, [state.modules]);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const result = await Pulse_modulesService.getAll({ orderBy: ORDER_BY });
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? 'Failed to load modules.');
      }
      setState({ status: 'ready', modules: sortByOrder(result.data) });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong while loading modules.',
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isNameTaken = useCallback((name: string, excludeId?: string) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized) return false;
    return modulesRef.current.some(
      (module) =>
        module.pulse_moduleid !== excludeId &&
        module.statecode === 0 &&
        (module.pulse_name ?? '').trim().toLowerCase() === normalized
    );
  }, []);

  const createModule = useCallback(async (input: ModuleFormInput) => {
    const snapshot = modulesRef.current;
    const nextOrder = snapshot.length === 0 ? 0 : Math.max(...snapshot.map((m) => m.pulse_order ?? 0)) + 1;

    const result = await Pulse_modulesService.create({
      pulse_name: input.pulse_name,
      pulse_description: input.pulse_description,
      pulse_iconurl: input.pulse_iconurl,
      statecode: input.statecode,
      pulse_order: nextOrder,
    } as Omit<Pulse_modulesBase, 'pulse_moduleid'>);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to create the module.');
    }

    modulesRef.current = sortByOrder([...modulesRef.current, result.data]);
    setState((prev) => ({ ...prev, modules: modulesRef.current }));
    return result.data;
  }, []);

  const updateModule = useCallback(async (id: string, changes: Partial<ModuleFormInput>) => {
    const result = await Pulse_modulesService.update(
      id,
      changes as Partial<Omit<Pulse_modulesBase, 'pulse_moduleid'>>
    );
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to update the module.');
    }

    const updated = result.data;
    modulesRef.current = sortByOrder(modulesRef.current.map((m) => (m.pulse_moduleid === id ? updated : m)));
    setState((prev) => ({ ...prev, modules: modulesRef.current }));
    return updated;
  }, []);

  const deactivateModule = useCallback(
    async (id: string) => {
      return updateModule(id, { statecode: 1 });
    },
    [updateModule]
  );

  const reorderModules = useCallback(async (reordered: Pulse_modules[]) => {
    const snapshot = modulesRef.current;
    const previousOrderById = new Map(snapshot.map((m) => [m.pulse_moduleid, m.pulse_order ?? 0]));
    const resequenced = reordered.map((module, index) => ({ ...module, pulse_order: index }));
    const changed = resequenced.filter((module) => module.pulse_order !== previousOrderById.get(module.pulse_moduleid));

    modulesRef.current = resequenced;
    setState((prev) => ({ ...prev, modules: resequenced }));

    try {
      const results = await Promise.all(
        changed.map((module) => Pulse_modulesService.update(module.pulse_moduleid, { pulse_order: module.pulse_order }))
      );
      if (results.some((result) => !result.success)) {
        throw new Error('Failed to save the new module order.');
      }
    } catch (err) {
      modulesRef.current = snapshot;
      setState((prev) => ({ ...prev, modules: snapshot }));
      throw err instanceof Error ? err : new Error('Failed to save the new module order.');
    }
  }, []);

  return {
    ...state,
    isNameTaken,
    createModule,
    updateModule,
    deactivateModule,
    reorderModules,
    retry: load,
  };
}
