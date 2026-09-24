import { useCallback, useEffect, useState } from 'react';
import { Pulse_appsService } from '../generated/services/Pulse_appsService';
import { Pulse_modulesService } from '../generated/services/Pulse_modulesService';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import type { Pulse_appusagestatses } from '../generated/models/Pulse_appusagestatsesModel';
import type { Pulse_appuserlastuseds } from '../generated/models/Pulse_appuserlastusedsModel';
import { listAllRecords } from '../services/listAllRecords';

export interface UsageFilters {
  // Empty or undefined means all modules.
  moduleIds?: string[];
  startDate: Date;
  endDate: Date;
}

export interface TopApp {
  appId: string;
  appName: string;
  totalClicks: number;
}

export interface DailyTrendPoint {
  date: string;
  totalClicks: number;
  // Distinct apps with at least one click that day.
  activeApps: number;
  // Running total of distinct users, each counted on their most recent use of
  // any app in range. Only the last-used date is stored, so this approximates
  // when users were reached — but it ends at uniqueUsersCount.
  usersReached: number;
}

export interface AppUniqueUsers {
  appId: string;
  appName: string;
  uniqueUserCount: number;
}

export interface ModuleClicks {
  moduleId: string;
  totalClicks: number;
}

interface UsageAnalyticsState {
  status: 'loading' | 'error' | 'ready';
  error?: string;
  topApps: TopApp[];
  dailyTrend: DailyTrendPoint[];
  totalLaunches: number;
  activeAppsCount: number;
  totalAppsCount: number;
  uniqueUsersByApp: AppUniqueUsers[];
  // Distinct people across all scoped apps (not the sum of uniqueUsersByApp,
  // which counts someone once per app they used).
  uniqueUsersCount: number;
  clicksByModule: ModuleClicks[];
  // Every active module, not only the ones the viewer can open from Home —
  // the dashboard reports on the whole catalog, so module names and filter
  // options have to cover it too.
  modules: Pulse_modules[];
  lastUpdated: number | null;
  isRefreshing: boolean;
}

const AUTO_REFRESH_MS = 45_000;

const ACTIVE_APPS_FILTER = 'statecode eq 0';

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function enumerateDates(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    dates.push(toDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

const INITIAL_STATE: UsageAnalyticsState = {
  status: 'loading',
  topApps: [],
  dailyTrend: [],
  totalLaunches: 0,
  activeAppsCount: 0,
  totalAppsCount: 0,
  uniqueUsersByApp: [],
  uniqueUsersCount: 0,
  clicksByModule: [],
  modules: [],
  lastUpdated: null,
  isRefreshing: false,
};

export function useUsageAnalytics(filters: UsageFilters) {
  const [state, setState] = useState<UsageAnalyticsState>(INITIAL_STATE);

  const { moduleIds, startDate, endDate } = filters;
  // Stable key so a new array holding the same ids doesn't trigger a reload.
  const moduleIdsKey = [...(moduleIds ?? [])].sort().join(',');

  const load = useCallback(async (silent = false) => {
    setState((prev) => ({
      ...prev,
      status: silent ? prev.status : 'loading',
      isRefreshing: silent,
      error: undefined,
    }));
    try {
      const startDateOnly = toDateOnly(startDate);
      const endDateOnly = toDateOnly(endDate);

      const [modulesResult, appsResult, usageResult, lastUsedResult] = await Promise.all([
        Pulse_modulesService.getAll({
          filter: ACTIVE_APPS_FILTER,
          orderBy: ['pulse_order asc'],
          select: ['pulse_moduleid', 'pulse_name', 'pulse_iconurl', 'pulse_order'],
        }),
        Pulse_appsService.getAll({ filter: ACTIVE_APPS_FILTER }),
        // These two grow with usage (a row per app per day, and per user per
        // app), so they're read across every page rather than just the first.
        listAllRecords<Pulse_appusagestatses>('pulse_appusagestatses', {
          filter: `pulse_date ge ${startDateOnly} and pulse_date le ${endDateOnly}`,
        }),
        listAllRecords<Pulse_appuserlastuseds>('pulse_appuserlastuseds', {
          filter: `pulse_lastuseddate ge ${startDateOnly} and pulse_lastuseddate le ${endDateOnly}`,
        }),
      ]);

      if (!modulesResult.success || !modulesResult.data) {
        throw new Error(modulesResult.error?.message ?? 'Failed to load modules.');
      }
      if (!appsResult.success || !appsResult.data) {
        throw new Error(appsResult.error?.message ?? 'Failed to load apps.');
      }
      if (!usageResult.success || !usageResult.data) {
        throw new Error(usageResult.error?.message ?? 'Failed to load usage stats.');
      }
      if (!lastUsedResult.success || !lastUsedResult.data) {
        throw new Error(lastUsedResult.error?.message ?? 'Failed to load last-used records.');
      }

      const selectedModuleIds = new Set(moduleIdsKey ? moduleIdsKey.split(',') : []);
      const appNameById = new Map<string, string>();
      const moduleIdByApp = new Map<string, string>();
      const scopedAppIds = new Set<string>();
      for (const app of appsResult.data) {
        appNameById.set(app.pulse_appid, app.pulse_name ?? '');
        if (app._pulse_module_value) {
          moduleIdByApp.set(app.pulse_appid, app._pulse_module_value);
        }
        const appModuleId = app._pulse_module_value;
        if (selectedModuleIds.size === 0 || (appModuleId && selectedModuleIds.has(appModuleId))) {
          scopedAppIds.add(app.pulse_appid);
        }
      }

      const usageRows = usageResult.data.filter(
        (row) => row._pulse_app_value && scopedAppIds.has(row._pulse_app_value)
      );
      const lastUsedRows = lastUsedResult.data.filter(
        (row) => row._pulse_app_value && scopedAppIds.has(row._pulse_app_value)
      );

      const clicksByApp = new Map<string, number>();
      const clicksByDate = new Map<string, number>();
      const activeAppsByDate = new Map<string, Set<string>>();
      for (const row of usageRows) {
        const appId = row._pulse_app_value;
        const clicks = row.pulse_clickcount ?? 0;
        if (appId) {
          clicksByApp.set(appId, (clicksByApp.get(appId) ?? 0) + clicks);
        }
        if (row.pulse_date) {
          const dateOnly = row.pulse_date.slice(0, 10);
          clicksByDate.set(dateOnly, (clicksByDate.get(dateOnly) ?? 0) + clicks);
          if (appId && clicks > 0) {
            const apps = activeAppsByDate.get(dateOnly) ?? new Set<string>();
            apps.add(appId);
            activeAppsByDate.set(dateOnly, apps);
          }
        }
      }

      // Latest in-range use per person across all scoped apps, so someone using
      // several apps is still one user.
      const lastUseByUser = new Map<string, string>();
      for (const row of lastUsedRows) {
        const userId = row._pulse_user_value;
        if (!row._pulse_app_value || !userId || !row.pulse_lastuseddate) continue;
        const dateOnly = row.pulse_lastuseddate.slice(0, 10);
        const existing = lastUseByUser.get(userId);
        if (!existing || dateOnly > existing) {
          lastUseByUser.set(userId, dateOnly);
        }
      }
      const uniqueUsersCount = lastUseByUser.size;
      const usersReachedByDate = new Map<string, number>();
      for (const dateOnly of lastUseByUser.values()) {
        usersReachedByDate.set(dateOnly, (usersReachedByDate.get(dateOnly) ?? 0) + 1);
      }

      // Unbounded: the dashboard itself caps the panel to a handful of rows
      // and puts the rest behind "See More", so the hook returns everything
      // rather than pre-truncating the list.
      const topApps: TopApp[] = Array.from(clicksByApp.entries())
        .map(([appId, totalClicks]) => ({ appId, appName: appNameById.get(appId) ?? 'Unknown app', totalClicks }))
        .sort((a, b) => b.totalClicks - a.totalClicks);

      let usersReached = 0;
      const dailyTrend: DailyTrendPoint[] = enumerateDates(startDate, endDate).map((date) => {
        usersReached += usersReachedByDate.get(date) ?? 0;
        return {
          date,
          totalClicks: clicksByDate.get(date) ?? 0,
          activeApps: activeAppsByDate.get(date)?.size ?? 0,
          usersReached,
        };
      });

      const totalLaunches = Array.from(clicksByApp.values()).reduce((sum, count) => sum + count, 0);
      const activeAppsCount = Array.from(clicksByApp.values()).filter((count) => count > 0).length;
      const totalAppsCount = scopedAppIds.size;

      const clicksByModuleId = new Map<string, number>();
      for (const [appId, clicks] of clicksByApp.entries()) {
        const appModuleId = moduleIdByApp.get(appId);
        if (!appModuleId) continue;
        clicksByModuleId.set(appModuleId, (clicksByModuleId.get(appModuleId) ?? 0) + clicks);
      }
      const clicksByModule: ModuleClicks[] = Array.from(clicksByModuleId.entries())
        .map(([moduleIdKey, totalClicks]) => ({ moduleId: moduleIdKey, totalClicks }))
        .sort((a, b) => b.totalClicks - a.totalClicks);

      const usersByApp = new Map<string, Set<string>>();
      for (const row of lastUsedRows) {
        const appId = row._pulse_app_value;
        const userId = row._pulse_user_value;
        if (!appId || !userId) continue;
        const users = usersByApp.get(appId) ?? new Set<string>();
        users.add(userId);
        usersByApp.set(appId, users);
      }

      const uniqueUsersByApp: AppUniqueUsers[] = Array.from(usersByApp.entries())
        .map(([appId, users]) => ({ appId, appName: appNameById.get(appId) ?? 'Unknown app', uniqueUserCount: users.size }))
        .sort((a, b) => b.uniqueUserCount - a.uniqueUserCount);

      setState({
        status: 'ready',
        topApps,
        dailyTrend,
        totalLaunches,
        activeAppsCount,
        totalAppsCount,
        uniqueUsersByApp,
        uniqueUsersCount,
        clicksByModule,
        modules: modulesResult.data,
        lastUpdated: Date.now(),
        isRefreshing: false,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        isRefreshing: false,
        error: err instanceof Error ? err.message : 'Something went wrong while loading usage analytics.',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleIdsKey, startDate.getTime(), endDate.getTime()]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load(true);
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const retry = useCallback(() => load(false), [load]);

  return { ...state, retry };
}
