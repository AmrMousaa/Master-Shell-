import { useCallback, useEffect, useRef, useState } from 'react';
import { Pulse_apppermissionsService } from '../generated/services/Pulse_apppermissionsService';
import { RolesService } from '../generated/services/RolesService';
import type { Pulse_apppermissions, Pulse_apppermissionsBase } from '../generated/models/Pulse_apppermissionsModel';
import type { Roles } from '../generated/models/RolesModel';

interface AppPermissionsState {
  status: 'loading' | 'error' | 'ready';
  error?: string;
  // All pulse_apppermission records (active + inactive) for this app, so a
  // previously-removed role can be reactivated instead of duplicated.
  permissions: Pulse_apppermissions[];
  allRoles: Roles[];
}

export function useAppPermissions(appId: string | undefined) {
  const [state, setState] = useState<AppPermissionsState>({ status: 'loading', permissions: [], allRoles: [] });

  const permissionsRef = useRef<Pulse_apppermissions[]>(state.permissions);
  useEffect(() => {
    permissionsRef.current = state.permissions;
  }, [state.permissions]);

  const load = useCallback(async () => {
    if (!appId) {
      setState({ status: 'ready', permissions: [], allRoles: [] });
      return;
    }
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const [permissionsResult, rolesResult] = await Promise.all([
        Pulse_apppermissionsService.getAll({ filter: `_pulse_app_value eq ${appId}` }),
        RolesService.getAll({ select: ['roleid', 'name'] }),
      ]);
      if (!permissionsResult.success || !permissionsResult.data) {
        throw new Error(permissionsResult.error?.message ?? 'Failed to load app permissions.');
      }
      if (!rolesResult.success || !rolesResult.data) {
        throw new Error(rolesResult.error?.message ?? 'Failed to load roles.');
      }
      setState({ status: 'ready', permissions: permissionsResult.data, allRoles: rolesResult.data });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong while loading app permissions.',
      }));
    }
  }, [appId]);

  useEffect(() => {
    load();
  }, [load]);

  const addRole = useCallback(
    async (roleId: string) => {
      if (!appId) throw new Error('Save the app before assigning permissions.');

      const existing = permissionsRef.current.find((p) => p._pulse_securityrole_value === roleId);

      if (existing && existing.statecode === 0) {
        // Already active; nothing to do.
        return existing;
      }

      if (existing) {
        const result = await Pulse_apppermissionsService.update(existing.pulse_apppermissionid, { statecode: 0 });
        if (!result.success || !result.data) {
          throw new Error(result.error?.message ?? 'Failed to re-add the role.');
        }
        const updated = result.data;
        permissionsRef.current = permissionsRef.current.map((p) =>
          p.pulse_apppermissionid === updated.pulse_apppermissionid ? updated : p
        );
        setState((prev) => ({ ...prev, permissions: permissionsRef.current }));
        return updated;
      }

      const result = await Pulse_apppermissionsService.create({
        'pulse_App@odata.bind': `/pulse_apps(${appId})`,
        'pulse_SecurityRole@odata.bind': `/roles(${roleId})`,
        statecode: 0,
      } as Omit<Pulse_apppermissionsBase, 'pulse_apppermissionid'>);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? 'Failed to add the role.');
      }
      const created = result.data;
      permissionsRef.current = [...permissionsRef.current, created];
      setState((prev) => ({ ...prev, permissions: permissionsRef.current }));
      return created;
    },
    [appId]
  );

  const removeRole = useCallback(async (permissionId: string) => {
    const result = await Pulse_apppermissionsService.update(permissionId, { statecode: 1 });
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to remove the role.');
    }
    const updated = result.data;
    permissionsRef.current = permissionsRef.current.map((p) =>
      p.pulse_apppermissionid === updated.pulse_apppermissionid ? updated : p
    );
    setState((prev) => ({ ...prev, permissions: permissionsRef.current }));
  }, []);

  // The Dataverse connector's raw REST response doesn't get flattened into the
  // "<lookup>name" display fields the way the old native SDK client did, so
  // pulse_securityrolename can't be trusted here. Resolve each permission's
  // role name from the already-loaded role list instead.
  const roleNameById = new Map(state.allRoles.map((role) => [role.roleid, role.name]));

  const activePermissions = state.permissions
    .filter((p) => p.statecode === 0)
    .map((p) => ({
      ...p,
      pulse_securityrolename: (p._pulse_securityrole_value && roleNameById.get(p._pulse_securityrole_value)) || p.pulse_securityrolename,
    }));
  const activeRoleIds = new Set(activePermissions.map((p) => p._pulse_securityrole_value).filter((id): id is string => Boolean(id)));
  const availableRoles = state.allRoles.filter((role) => !activeRoleIds.has(role.roleid));

  return {
    ...state,
    activePermissions,
    availableRoles,
    addRole,
    removeRole,
    retry: load,
  };
}
