import { getContext } from '@microsoft/power-apps/app';
import { SystemusersService } from '../generated/services/SystemusersService';
import { RolesService } from '../generated/services/RolesService';

const SYSTEM_ADMINISTRATOR_ROLE_NAME = 'System Administrator';

export interface CurrentUserAccess {
  isSystemAdministrator: boolean;
  roleIds: Set<string>;
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccess> {
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

  const rolesResult = await RolesService.getAll({
    filter: `systemuserroles_association/any(su:su/systemuserid eq ${currentUser.systemuserid})`,
  });
  if (!rolesResult.success || !rolesResult.data) {
    throw new Error(rolesResult.error?.message ?? "Failed to load the current user's roles.");
  }

  const roleIds = new Set(rolesResult.data.map((role) => role.roleid));
  const isSystemAdministrator = rolesResult.data.some((role) => role.name === SYSTEM_ADMINISTRATOR_ROLE_NAME);

  return { isSystemAdministrator, roleIds };
}
