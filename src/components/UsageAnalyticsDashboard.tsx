import { useMemo, useState } from 'react';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { useUsageAnalytics } from '../hooks/useUsageAnalytics';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { IconBarChart, IconInbox, IconUser } from './icons';

interface UsageAnalyticsDashboardProps {
  modulesById: Map<string, ModuleWithApps>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function UsageAnalyticsDashboard({ modulesById }: UsageAnalyticsDashboardProps) {
  const defaultEnd = useMemo(() => startOfDay(new Date()), []);
  const defaultStart = useMemo(() => new Date(defaultEnd.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS), [defaultEnd]);

  const [moduleId, setModuleId] = useState<string>('');
  const [startInput, setStartInput] = useState(toDateInputValue(defaultStart));
  const [endInput, setEndInput] = useState(toDateInputValue(defaultEnd));

  const startDate = useMemo(() => new Date(`${startInput}T00:00:00`), [startInput]);
  const endDate = useMemo(() => new Date(`${endInput}T00:00:00`), [endInput]);

  const { status, error, topApps, dailyTrend, totalLaunches, activeAppsCount, uniqueUsersByApp, retry } =
    useUsageAnalytics({ moduleId: moduleId || undefined, startDate, endDate });

  const modules = Array.from(modulesById.values()).map((entry) => entry.module);

  return (
    <div className="analytics-dashboard">
      <div className="section-header">
        <h1 className="section-title">Usage Analytics</h1>
        <p className="section-description">Most-used apps, launch trends, and unique users across the catalog.</p>
      </div>

      <div className="analytics-filters">
        <label className="analytics-filter">
          <span>Module</span>
          <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <option value="">All Modules</option>
            {modules.map((module) => (
              <option key={module.pulse_moduleid} value={module.pulse_moduleid}>
                {module.pulse_name}
              </option>
            ))}
          </select>
        </label>
        <label className="analytics-filter">
          <span>From</span>
          <input
            type="date"
            value={startInput}
            max={endInput}
            onChange={(e) => setStartInput(e.target.value)}
          />
        </label>
        <label className="analytics-filter">
          <span>To</span>
          <input
            type="date"
            value={endInput}
            min={startInput}
            max={toDateInputValue(new Date())}
            onChange={(e) => setEndInput(e.target.value)}
          />
        </label>
      </div>

      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <div className="analytics-kpi-row">
            <div className="analytics-kpi-card">
              <span className="analytics-kpi-value">{totalLaunches.toLocaleString()}</span>
              <span className="analytics-kpi-label">Total Launches</span>
            </div>
            <div className="analytics-kpi-card">
              <span className="analytics-kpi-value">{activeAppsCount.toLocaleString()}</span>
              <span className="analytics-kpi-label">Active Apps</span>
            </div>
          </div>

          <div className="analytics-panels">
            <div className="analytics-panel">
              <h2 className="section-title-plain">
                <IconBarChart width={16} height={16} />
                Top 10 Apps
              </h2>
              <TopAppsBarChart topApps={topApps} />
            </div>

            <div className="analytics-panel">
              <h2 className="section-title-plain">
                <IconBarChart width={16} height={16} />
                Daily Trend
              </h2>
              <DailyTrendLineChart points={dailyTrend} />
            </div>
          </div>

          <h2 className="section-title-plain">
            <IconUser width={16} height={16} />
            Unique Users per App
          </h2>
          {uniqueUsersByApp.length === 0 ? (
            <div className="empty-state">
              <IconInbox width={26} height={26} aria-hidden="true" />
              <p>No user activity in this range yet.</p>
            </div>
          ) : (
            <div className="analytics-users-grid">
              {uniqueUsersByApp.map((entry) => (
                <div key={entry.appId} className="analytics-user-card">
                  <span className="analytics-user-card-name">{entry.appName}</span>
                  <span className="analytics-user-card-count">
                    {entry.uniqueUserCount} {entry.uniqueUserCount === 1 ? 'user' : 'users'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TopAppsBarChart({ topApps }: { topApps: { appId: string; appName: string; totalClicks: number }[] }) {
  if (topApps.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No launches recorded in this range yet.</p>
      </div>
    );
  }

  const max = Math.max(...topApps.map((app) => app.totalClicks), 1);

  return (
    <div className="analytics-bar-chart">
      {topApps.map((app) => (
        <div key={app.appId} className="analytics-bar-row">
          <span className="analytics-bar-label" title={app.appName}>
            {app.appName}
          </span>
          <div className="analytics-bar-track">
            <div className="analytics-bar-fill" style={{ width: `${(app.totalClicks / max) * 100}%` }} />
          </div>
          <span className="analytics-bar-value">{app.totalClicks.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function DailyTrendLineChart({ points }: { points: { date: string; totalClicks: number }[] }) {
  if (points.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No trend data for this range yet.</p>
      </div>
    );
  }

  const width = 560;
  const height = 180;
  const paddingX = 12;
  const paddingY = 16;
  const max = Math.max(...points.map((p) => p.totalClicks), 1);

  const stepX = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = paddingX + stepX * index;
    const y = height - paddingY - (point.totalClicks / max) * (height - paddingY * 2);
    return { x, y, point };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - paddingY} L${coords[0].x.toFixed(1)},${height - paddingY} Z`;

  const labelEvery = Math.ceil(points.length / 6) || 1;

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily launch trend">
        <path d={areaPath} className="analytics-line-area" />
        <path d={linePath} className="analytics-line-path" />
        {coords.map((c, i) => (
          <circle key={points[i].date} cx={c.x} cy={c.y} r={2.5} className="analytics-line-dot" />
        ))}
      </svg>
      <div className="analytics-line-axis">
        {coords
          .filter((_, i) => i % labelEvery === 0 || i === coords.length - 1)
          .map((c) => (
            <span key={c.point.date}>{formatShortDate(c.point.date)}</span>
          ))}
      </div>
    </div>
  );
}
