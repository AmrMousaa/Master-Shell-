import { useCallback, useEffect, useState } from 'react';
import { Pulse_appsService } from '../generated/services/Pulse_appsService';
import { Pulse_appusagestatsesService } from '../generated/services/Pulse_appusagestatsesService';
import { Pulse_appuserlastusedsService } from '../generated/services/Pulse_appuserlastusedsService';

export interface UsageFilters {
  moduleId?: string;
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
  clicksByModule: ModuleClicks[];
}

const ACTIVE_APPS_FILTER = 'pulse_isactive eq true';

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
  clicksByModule: [],
};

export function useUsageAnalytics(filters: UsageFilters) {
  const [state, setState] = useState<UsageAnalyticsState>(INITIAL_STATE);

  const { moduleId, startDate, endDate } = filters;

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const startDateOnly = toDateOnly(startDate);
      const endDateOnly = toDateOnly(endDate);

      const [appsResult, usageResult, lastUsedResult] = await Promise.all([
        Pulse_appsService.getAll({ filter: ACTIVE_APPS_FILTER }),
        Pulse_appusagestatsesService.getAll({
          filter: `pulse_date ge ${startDateOnly} and pulse_date le ${endDateOnly}`,
        }),
        Pulse_appuserlastusedsService.getAll({
          filter: `pulse_lastuseddate ge ${startDateOnly} and pulse_lastuseddate le ${endDateOnly}`,
        }),
      ]);

      if (!appsResult.success || !appsResult.data) {
        throw new Error(appsResult.error?.message ?? 'Failed to load apps.');
      }
      if (!usageResult.success || !usageResult.data) {
        throw new Error(usageResult.error?.message ?? 'Failed to load usage stats.');
      }
      if (!lastUsedResult.success || !lastUsedResult.data) {
        throw new Error(lastUsedResult.error?.message ?? 'Failed to load last-used records.');
      }

      const appNameById = new Map<string, string>();
      const moduleIdByApp = new Map<string, string>();
      const scopedAppIds = new Set<string>();
      for (const app of appsResult.data) {
        appNameById.set(app.pulse_appid, app.pulse_name ?? '');
        if (app._pulse_module_value) {
          moduleIdByApp.set(app.pulse_appid, app._pulse_module_value);
        }
        if (!moduleId || app._pulse_module_value === moduleId) {
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
      for (const row of usageRows) {
        const appId = row._pulse_app_value;
        const clicks = row.pulse_clickcount ?? 0;
        if (appId) {
          clicksByApp.set(appId, (clicksByApp.get(appId) ?? 0) + clicks);
        }
        if (row.pulse_date) {
          const dateOnly = row.pulse_date.slice(0, 10);
          clicksByDate.set(dateOnly, (clicksByDate.get(dateOnly) ?? 0) + clicks);
        }
      }

      const topApps: TopApp[] = Array.from(clicksByApp.entries())
        .map(([appId, totalClicks]) => ({ appId, appName: appNameById.get(appId) ?? 'Unknown app', totalClicks }))
        .sort((a, b) => b.totalClicks - a.totalClicks)
        .slice(0, 10);

      const dailyTrend: DailyTrendPoint[] = enumerateDates(startDate, endDate).map((date) => ({
        date,
        totalClicks: clicksByDate.get(date) ?? 0,
      }));

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
        clicksByModule,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong while loading usage analytics.',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, startDate.getTime(), endDate.getTime()]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, retry: load };
}
