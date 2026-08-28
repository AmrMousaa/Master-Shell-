import { useMemo, useState } from 'react';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { useUsageAnalytics } from '../hooks/useUsageAnalytics';
import type { DailyTrendPoint, ModuleClicks, TopApp } from '../hooks/useUsageAnalytics';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { IconArrowUpRight, IconBarChart, IconInbox, IconLayers, IconUser } from './icons';

interface UsageAnalyticsDashboardProps {
  modulesById: Map<string, ModuleWithApps>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const DONUT_COLORS = ['#1c1712', '#b8862f', '#d9c9a8', '#e8e4db'];

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

function trendDelta(points: DailyTrendPoint[]): number {
  if (points.length < 2) return 0;
  const mid = Math.ceil(points.length / 2);
  const firstHalf = points.slice(0, mid).reduce((sum, p) => sum + p.totalClicks, 0);
  const secondHalf = points.slice(mid).reduce((sum, p) => sum + p.totalClicks, 0);
  return secondHalf - firstHalf;
}

export function UsageAnalyticsDashboard({ modulesById }: UsageAnalyticsDashboardProps) {
  const defaultEnd = useMemo(() => startOfDay(new Date()), []);
  const defaultStart = useMemo(() => new Date(defaultEnd.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS), [defaultEnd]);

  const [moduleId, setModuleId] = useState<string>('');
  const [startInput, setStartInput] = useState(toDateInputValue(defaultStart));
  const [endInput, setEndInput] = useState(toDateInputValue(defaultEnd));

  const startDate = useMemo(() => new Date(`${startInput}T00:00:00`), [startInput]);
  const endDate = useMemo(() => new Date(`${endInput}T00:00:00`), [endInput]);

  const {
    status,
    error,
    topApps,
    dailyTrend,
    totalLaunches,
    activeAppsCount,
    totalAppsCount,
    uniqueUsersByApp,
    clicksByModule,
    retry,
  } = useUsageAnalytics({ moduleId: moduleId || undefined, startDate, endDate });

  const modules = Array.from(modulesById.values()).map((entry) => entry.module);
  const totalUsers = uniqueUsersByApp.reduce((sum, entry) => sum + entry.uniqueUserCount, 0);
  const delta = trendDelta(dailyTrend);

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
          <div className="stat-card-row">
            <StatCard label="Total Launches" value={totalLaunches} delta={delta} points={dailyTrend} />
            <StatCard
              label="Active Apps"
              value={activeAppsCount}
              delta={activeAppsCount - Math.max(totalAppsCount - activeAppsCount, 0)}
              deltaSuffix=" active"
              points={dailyTrend}
            />
            <StatCard label="Unique Users" value={totalUsers} delta={totalUsers} deltaSuffix=" reached" points={dailyTrend} />
          </div>

          <div className="trend-card">
            <div className="trend-card-header">
              <h2 className="section-title-plain">
                <IconBarChart width={16} height={16} />
                Launch trend
              </h2>
              <span className="trend-card-range">
                {formatShortDate(toDateInputValue(startDate))} &ndash; {formatShortDate(toDateInputValue(endDate))}
              </span>
            </div>
            <DailyTrendAreaChart points={dailyTrend} />
          </div>

          <div className="analytics-panels">
            <div className="analytics-panel">
              <h2 className="section-title-plain">
                <IconArrowUpRight width={16} height={16} />
                Top Apps
              </h2>
              <TopAppsList topApps={topApps} />
            </div>

            <div className="analytics-panel">
              <h2 className="section-title-plain">
                <IconUser width={16} height={16} />
                Unique Users per App
              </h2>
              <UniqueUsersTable uniqueUsersByApp={uniqueUsersByApp} />
            </div>
          </div>

          <div className="analytics-bottom-row">
            <div className="analytics-panel ratio-panel">
              <span className="ratio-panel-label">Apps with activity</span>
              <span className="ratio-panel-value">
                {activeAppsCount} / {totalAppsCount}
              </span>
              <div className="ratio-panel-track">
                <div
                  className="ratio-panel-fill"
                  style={{ width: `${totalAppsCount > 0 ? (activeAppsCount / totalAppsCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="analytics-panel">
              <h2 className="section-title-plain">
                <IconLayers width={16} height={16} />
                Most Used Modules
              </h2>
              <ModuleDonutChart clicksByModule={clicksByModule} modulesById={modulesById} />
            </div>

            <div className="analytics-panel">
              <h2 className="section-title-plain">
                <IconBarChart width={16} height={16} />
                Top Apps Launches
              </h2>
              <TopAppsBarChart topApps={topApps.slice(0, 6)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaSuffix = '',
  points,
}: {
  label: string;
  value: number;
  delta: number;
  deltaSuffix?: string;
  points: DailyTrendPoint[];
}) {
  const isPositive = delta >= 0;
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-value">{value.toLocaleString()}</span>
        {points.length > 0 && (
          <span className={`stat-card-delta ${isPositive ? 'is-positive' : 'is-negative'}`}>
            {isPositive ? '+' : ''}
            {delta.toLocaleString()}
            {deltaSuffix}
          </span>
        )}
      </div>
      <span className="stat-card-label">{label}</span>
      <StatCardSparkline points={points} />
    </div>
  );
}

function StatCardSparkline({ points }: { points: DailyTrendPoint[] }) {
  if (points.length < 2) {
    return <div className="stat-card-spark" />;
  }
  const width = 160;
  const height = 40;
  const max = Math.max(...points.map((p) => p.totalClicks), 1);
  const stepX = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = stepX * index;
    const y = height - 4 - (point.totalClicks / max) * (height - 8);
    return { x, y };
  });
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <svg className="stat-card-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={linePath} className="stat-card-spark-path" />
    </svg>
  );
}

function TopAppsList({ topApps }: { topApps: TopApp[] }) {
  if (topApps.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No launches recorded in this range yet.</p>
      </div>
    );
  }

  return (
    <div className="top-apps-list">
      {topApps.map((app, index) => (
        <div key={app.appId} className="top-apps-list-row">
          <span className="top-apps-list-rank">{index + 1}</span>
          <span className="top-apps-list-name" title={app.appName}>
            {app.appName}
          </span>
          <span className="top-apps-list-count">{app.totalClicks.toLocaleString()} launches</span>
        </div>
      ))}
    </div>
  );
}

function UniqueUsersTable({
  uniqueUsersByApp,
}: {
  uniqueUsersByApp: { appId: string; appName: string; uniqueUserCount: number }[];
}) {
  if (uniqueUsersByApp.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No user activity in this range yet.</p>
      </div>
    );
  }

  return (
    <div className="data-table">
      <div className="data-table-head">
        <span>App</span>
        <span>Users</span>
      </div>
      {uniqueUsersByApp.map((entry) => (
        <div key={entry.appId} className="data-table-row">
          <span className="data-table-name" title={entry.appName}>
            {entry.appName}
          </span>
          <span className="status-badge status-badge-active">
            {entry.uniqueUserCount} {entry.uniqueUserCount === 1 ? 'user' : 'users'}
          </span>
        </div>
      ))}
    </div>
  );
}

function DailyTrendAreaChart({ points }: { points: DailyTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No trend data for this range yet.</p>
      </div>
    );
  }

  const width = 960;
  const height = 220;
  const paddingX = 12;
  const paddingY = 18;
  const max = Math.max(...points.map((p) => p.totalClicks), 1);

  const stepX = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = paddingX + stepX * index;
    const y = height - paddingY - (point.totalClicks / max) * (height - paddingY * 2);
    return { x, y, point };
  });

  const smoothPath = buildSmoothPath(coords);
  const areaPath = `${smoothPath} L${coords[coords.length - 1].x.toFixed(1)},${height - paddingY} L${coords[0].x.toFixed(1)},${height - paddingY} Z`;

  const labelEvery = Math.ceil(points.length / 7) || 1;

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily launch trend">
        <path d={areaPath} className="analytics-line-area" />
        <path d={smoothPath} className="analytics-line-path" />
        {coords.map((c, i) => (
          <circle key={points[i].date} cx={c.x} cy={c.y} r={3} className="analytics-line-dot" />
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

function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 3) {
    return coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  }
  let path = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const current = coords[i];
    const next = coords[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` Q${current.x.toFixed(1)},${current.y.toFixed(1)} ${midX.toFixed(1)},${((current.y + next.y) / 2).toFixed(1)}`;
  }
  const last = coords[coords.length - 1];
  path += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return path;
}

function TopAppsBarChart({ topApps }: { topApps: TopApp[] }) {
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
    <div className="vertical-bar-chart">
      {topApps.map((app) => (
        <div key={app.appId} className="vertical-bar-col">
          <div className="vertical-bar-track">
            <div
              className="vertical-bar-fill"
              style={{ height: `${(app.totalClicks / max) * 100}%` }}
              title={`${app.appName}: ${app.totalClicks}`}
            />
          </div>
          <span className="vertical-bar-label" title={app.appName}>
            {app.appName}
          </span>
        </div>
      ))}
    </div>
  );
}

function ModuleDonutChart({
  clicksByModule,
  modulesById,
}: {
  clicksByModule: ModuleClicks[];
  modulesById: Map<string, ModuleWithApps>;
}) {
  if (clicksByModule.length === 0) {
    return (
      <div className="empty-state">
        <IconInbox width={26} height={26} aria-hidden="true" />
        <p>No module activity in this range yet.</p>
      </div>
    );
  }

  const top = clicksByModule.slice(0, 3);
  const otherTotal = clicksByModule.slice(3).reduce((sum, m) => sum + m.totalClicks, 0);
  const segments = otherTotal > 0 ? [...top, { moduleId: '__other__', totalClicks: otherTotal }] : top;
  const total = segments.reduce((sum, s) => sum + s.totalClicks, 0) || 1;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 110 110" width={110} height={110} aria-hidden="true">
        <g transform="translate(55,55) rotate(-90)">
          {segments.map((segment, index) => {
            const fraction = segment.totalClicks / total;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={segment.moduleId}
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                strokeWidth={16}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
      </svg>
      <div className="donut-legend">
        {segments.map((segment, index) => (
          <div key={segment.moduleId} className="donut-legend-row">
            <span className="donut-legend-dot" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
            <span className="donut-legend-name">
              {segment.moduleId === '__other__'
                ? 'Other modules'
                : modulesById.get(segment.moduleId)?.module.pulse_name ?? 'Unknown module'}
            </span>
            <span className="donut-legend-value">{segment.totalClicks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
