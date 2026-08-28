import { getContext } from '@microsoft/power-apps/app';
import { SystemusersService } from '../generated/services/SystemusersService';
import { RolesService } from '../generated/services/RolesService';

const SYSTEM_ADMINISTRATOR_ROLE_NAME = 'System Administrator';
const ANALYTICS_VIEWER_ROLE_NAME = 'Pulse Analytics Viewer';

export interface CurrentUserAccess {
  isSystemAdministrator: boolean;
  roleIds: Set<string>;
}

export async function getCurrentUserId(): Promise<string> {
  const context = await getContext();
  const azureObjectId = context.user.objectId;
  if (!azureObjectId) {
    throw new Error('Unable to determine the current user.');
  }

  const userResult = await SystemusersService.getAll({
    filter: `azureactivedirectoryobjectid eq ${azureObjectId}`,
  });
  if (!userResult.success || !userResult.data) {
    throw new Error(userResult.error?.message ?? 'Failed to load the current user.');
  }
  const currentUser = userResult.data[0];
  if (!currentUser) {
    throw new Error('The current user was not found in Dataverse.');
  }

  return currentUser.systemuserid;
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccess> {
  const userId = await getCurrentUserId();

  const rolesResult = await RolesService.getAll({
    filter: `systemuserroles_association/any(su:su/systemuserid eq ${userId})`,
  });
  if (!rolesResult.success || !rolesResult.data) {
    throw new Error(rolesResult.error?.message ?? "Failed to load the current user's roles.");
  }

  const roleIds = new Set(rolesResult.data.map((role) => role.roleid));
  const isSystemAdministrator = rolesResult.data.some((role) => role.name === SYSTEM_ADMINISTRATOR_ROLE_NAME);

  return { isSystemAdministrator, roleIds };
}

export async function hasAnalyticsAccess(): Promise<boolean> {
  try {
    const access = await getCurrentUserAccess();
    if (access.isSystemAdministrator) return true;

    const rolesResult = await RolesService.getAll({
      filter: `name eq '${ANALYTICS_VIEWER_ROLE_NAME}'`,
    });
    if (!rolesResult.success || !rolesResult.data) return false;

    return rolesResult.data.some((role) => access.roleIds.has(role.roleid));
  } catch {
    // Fail closed: if the role or the user's roles can't be resolved (e.g.
    // the role doesn't exist yet in this environment), the analytics entry
    // point simply stays hidden rather than risking a false positive.
    return false;
  }
}
