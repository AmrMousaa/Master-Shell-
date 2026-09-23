import { Pulse_appusagestatsesService } from '../generated/services/Pulse_appusagestatsesService';
import { Pulse_appuserlastusedsService } from '../generated/services/Pulse_appuserlastusedsService';
import { getCurrentUserId } from './currentUserAccess';

function todayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Each of these is a read-then-write (get-to-check-existence, then a
// conditional create/update) — two cross-env round trips per call. This could
// collapse to a single upsert if `pulse_appusagestatses` gets an alternate
// key on (app, date) and `pulse_appuserlastuseds` one on (app, user); without
// a configured alternate key there's no record id to upsert against.
async function recordDailyClick(appId: string, today: string): Promise<void> {
  const existingResult = await Pulse_appusagestatsesService.getAll({
    filter: `_pulse_app_value eq ${appId} and pulse_date eq ${today}`,
    select: ['pulse_appusagestatsid', 'pulse_clickcount'],
  });
  if (!existingResult.success) {
    throw new Error(existingResult.error?.message ?? 'Failed to look up today\'s usage stat.');
  }

  const existing = existingResult.data?.[0];
  if (existing) {
    // Two clicks landing in the same instant can both read the same
    // `pulse_clickcount` and then both write `current + 1`, undercounting by
    // one. This is accepted intentionally: the dashboard only needs to show
    // general usage trends, not a precise, race-free audit count.
    const nextCount = (existing.pulse_clickcount ?? 0) + 1;
    const updateResult = await Pulse_appusagestatsesService.update(existing.pulse_appusagestatsid, {
      pulse_clickcount: nextCount,
    });
    if (!updateResult.success) {
      throw new Error(updateResult.error?.message ?? 'Failed to update usage stat.');
    }
  } else {
    const createResult = await Pulse_appusagestatsesService.create({
      'pulse_App@odata.bind': `/pulse_apps(${appId})`,
      pulse_date: today,
      pulse_clickcount: 1,
      statecode: 0,
    } as Parameters<typeof Pulse_appusagestatsesService.create>[0]);
    if (!createResult.success) {
      throw new Error(createResult.error?.message ?? 'Failed to create usage stat.');
    }
  }
}

async function recordLastUsed(appId: string, userId: string, today: string): Promise<void> {
  const existingResult = await Pulse_appuserlastusedsService.getAll({
    filter: `_pulse_app_value eq ${appId} and _pulse_user_value eq ${userId}`,
    select: ['pulse_appuserlastusedid'],
  });
  if (!existingResult.success) {
    throw new Error(existingResult.error?.message ?? 'Failed to look up last-used record.');
  }

  const existing = existingResult.data?.[0];
  if (existing) {
    const updateResult = await Pulse_appuserlastusedsService.update(existing.pulse_appuserlastusedid, {
      pulse_lastuseddate: today,
    });
    if (!updateResult.success) {
      throw new Error(updateResult.error?.message ?? 'Failed to update last-used record.');
    }
  } else {
    const createResult = await Pulse_appuserlastusedsService.create({
      'pulse_App@odata.bind': `/pulse_apps(${appId})`,
      'pulse_User@odata.bind': `/systemusers(${userId})`,
      pulse_lastuseddate: today,
      statecode: 0,
    } as Parameters<typeof Pulse_appuserlastusedsService.create>[0]);
    if (!createResult.success) {
      throw new Error(createResult.error?.message ?? 'Failed to create last-used record.');
    }
  }
}

/**
 * Fire-and-forget usage recording, called from the real app-launch point.
 * Must never throw and never delay/affect the launch — all failures are
 * swallowed and only logged as warnings.
 */
export async function recordAppUsage(appId: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    const today = todayDateOnly();

    await Promise.allSettled([recordDailyClick(appId, today), recordLastUsed(appId, userId, today)]);
  } catch (err) {
    console.warn('Failed to record app usage:', err);
  }
}
