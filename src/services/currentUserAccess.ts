import { getContext } from '@microsoft/power-apps/app';
import { SystemusersService } from '../generated/services/SystemusersService';
import { RolesService } from '../generated/services/RolesService';

const SYSTEM_ADMINISTRATOR_ROLE_NAME = 'System Administrator';
const ANALYTICS_VIEWER_ROLE_NAME = 'Pulse Analytics Viewer';
const PULSE_ADMIN_ROLE_NAME = 'Pulse Admin';

export interface CurrentUserAccess {
  isSystemAdministrator: boolean;
  roleIds: Set<string>;
}

// The signed-in user's Dataverse id never changes mid-session, but
// getCurrentUserId() is called on nearly every data operation (favorites,
// permissions, usage tracking, ...). Resolving it fresh each time added an
// extra cross-environment round trip to every one of those calls, which is
// exactly the kind of latency that made the app-launch usage tracking race
// (see launchApp.ts) lose against navigation. Cache the in-flight/resolved
// lookup so it only ever happens once per session.
let currentUserIdPromise: Promise<string> | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (!currentUserIdPromise) {
    currentUserIdPromise = (async () => {
      const context = await getContext();
      const azureObjectId = context.user.objectId;
      if (!azureObjectId) {
        throw new Error('Unable to determine the current user.');
      }

      const userResult = await SystemusersService.getAll({
        filter: `azureactivedirectoryobjectid eq ${azureObjectId}`,
        select: ['systemuserid'],
      });
      if (!userResult.success || !userResult.data) {
        throw new Error(userResult.error?.message ?? 'Failed to load the current user.');
      }
      const currentUser = userResult.data[0];
      if (!currentUser) {
        throw new Error('The current user was not found in Dataverse.');
      }

      return currentUser.systemuserid;
    })().catch((err) => {
      // Don't cache a failed lookup — let the next call retry.
      currentUserIdPromise = null;
      throw err;
    });
  }
  return currentUserIdPromise;
}

// Like getCurrentUserId above, the user's role membership doesn't change
// mid-session. Without caching, hasAnalyticsAccess/hasPulseAdminAccess/
// useNavigationData each triggered their own "get my roles" cross-env round
// trip on every app load. Cache the resolved access so it's fetched once.
let currentUserAccessPromise: Promise<CurrentUserAccess> | null = null;

export async function getCurrentUserAccess(): Promise<CurrentUserAccess> {
  if (!currentUserAccessPromise) {
    currentUserAccessPromise = (async () => {
      const userId = await getCurrentUserId();

      const rolesResult = await RolesService.getAll({
        filter: `systemuserroles_association/any(su:su/systemuserid eq ${userId})`,
        select: ['roleid', 'name'],
      });
      if (!rolesResult.success || !rolesResult.data) {
        throw new Error(rolesResult.error?.message ?? "Failed to load the current user's roles.");
      }

      const roleIds = new Set(rolesResult.data.map((role) => role.roleid));
      const isSystemAdministrator = rolesResult.data.some((role) => role.name === SYSTEM_ADMINISTRATOR_ROLE_NAME);

      return { isSystemAdministrator, roleIds };
    })().catch((err) => {
      // Don't cache a failed lookup — let the next call retry.
      currentUserAccessPromise = null;
      throw err;
    });
  }
  return currentUserAccessPromise;
}

export async function hasAnalyticsAccess(): Promise<boolean> {
  try {
    const access = await getCurrentUserAccess();
    if (access.isSystemAdministrator) return true;

    const rolesResult = await RolesService.getAll({
      filter: `name eq '${ANALYTICS_VIEWER_ROLE_NAME}'`,
      select: ['roleid'],
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

export async function hasPulseAdminAccess(): Promise<boolean> {
  try {
    const access = await getCurrentUserAccess();
    if (access.isSystemAdministrator) return true;

    const rolesResult = await RolesService.getAll({
      filter: `name eq '${PULSE_ADMIN_ROLE_NAME}'`,
      select: ['roleid'],
    });
    if (!rolesResult.success || !rolesResult.data) return false;

    return rolesResult.data.some((role) => access.roleIds.has(role.roleid));
  } catch {
    // Fail closed: the Pulse Configuration entry point stays hidden rather
    // than risking exposure if the role can't be resolved.
    return false;
  }
}
