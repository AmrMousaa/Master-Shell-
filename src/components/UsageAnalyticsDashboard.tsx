import { useEffect, useMemo, useRef, useState } from 'react';
import type { ModuleWithApps } from '../hooks/useNavigationData';
import { useUsageAnalytics } from '../hooks/useUsageAnalytics';
import type { DailyTrendPoint, ModuleClicks, TopApp } from '../hooks/useUsageAnalytics';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { ModuleFilterDropdown } from './ModuleFilterDropdown';
import { DatePicker } from './DatePicker';
import { Modal } from './Modal';
import { IconAppWindow, IconArrowUpRight, IconBarChart, IconInbox, IconLayers, IconUser } from './icons';

const PANEL_LIST_LIMIT = 6;

interface UsageAnalyticsDashboardProps {
  modulesById: Map<string, ModuleWithApps>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
// Teal lane shades (--ds-color-primary-*), muted gray for the catch-all "Other" slice.
const DONUT_COLORS = ['#126e5c', '#4bb69a', '#82d2ba', '#94a3b8'];

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

function formatTimeAgo(timestamp: number | null, now: number): string {
  if (!timestamp) return 'just now';
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function useCountUp(value: number, durationMs = 650): number {
  const [displayValue, setDisplayValue] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return displayValue;
}

export function UsageAnalyticsDashboard({ modulesById }: UsageAnalyticsDashboardProps) {
  const defaultEnd = useMemo(() => startOfDay(new Date()), []);
  const defaultStart = useMemo(() => new Date(defaultEnd.getTime() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS), [defaultEnd]);

  const [moduleId, setModuleId] = useState<string>('');
  const [startInput, setStartInput] = useState(toDateInputValue(defaultStart));
  const [endInput, setEndInput] = useState(toDateInputValue(defaultEnd));
  const [showTopAppsModal, setShowTopAppsModal] = useState(false);
  const [showUniqueUsersModal, setShowUniqueUsersModal] = useState(false);

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
    lastUpdated,
    isRefreshing,
    retry,
  } = useUsageAnalytics({ moduleId: moduleId || undefined, startDate, endDate });

  const modules = Array.from(modulesById.values()).map((entry) => entry.module);
  const totalUsers = uniqueUsersByApp.reduce((sum, entry) => sum + entry.uniqueUserCount, 0);
  const delta = trendDelta(dailyTrend);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="an-head">
        <div>
          <h1>Usage Analytics</h1>
          <p>Most-used apps, launch trends, and unique users across the catalog.</p>
        </div>
        {status === 'ready' && (
          <div className={`an-live ${isRefreshing ? 'refreshing' : ''}`} title="Auto-refreshes automatically">
            <span className="an-live-dot" />
            {isRefreshing ? 'Updating…' : `Live · updated ${formatTimeAgo(lastUpdated, now)}`}
          </div>
        )}
      </div>

      <div className="an-filters">
        <ModuleFilterDropdown modules={modules} value={moduleId} onChange={setModuleId} />
        <div className="an-filter-divider" />
        <DatePicker id="an-from" label="From" value={startInput} max={endInput} onChange={setStartInput} />
        <DatePicker
          id="an-to"
          label="To"
          value={endInput}
          min={startInput}
          max={toDateInputValue(new Date())}
          onChange={setEndInput}
        />
      </div>

      {status === 'loading' ? (
        <LoadingState />
      ) : status === 'error' ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <div className="an-stats">
            <KpiCard label="Total launches" value={totalLaunches} delta={delta} points={dailyTrend} />
            <KpiCard
              label="Active apps"
              value={activeAppsCount}
              delta={activeAppsCount - Math.max(totalAppsCount - activeAppsCount, 0)}
              deltaSuffix=" active"
              points={dailyTrend}
            />
            <KpiCard label="Unique users" value={totalUsers} delta={totalUsers} deltaSuffix=" reached" points={dailyTrend} />
          </div>

          <div className="an-panel">
            <div className="an-panel-head">
              <h2>
                <IconBarChart width={15} height={15} aria-hidden="true" />
                Launch trend
              </h2>
              <span className="range">
                {formatShortDate(toDateInputValue(startDate))} &ndash; {formatShortDate(toDateInputValue(endDate))}
              </span>
            </div>
            <div className="an-chart-wrap">
              <DailyTrendAreaChart points={dailyTrend} />
            </div>
          </div>

          <div className="an-two-col">
            <div className="an-panel">
              <div className="an-panel-head">
                <h2>
                  <IconArrowUpRight width={15} height={15} aria-hidden="true" />
                  Top Apps
                </h2>
                {topApps.length > PANEL_LIST_LIMIT && (
                  <button type="button" className="an-see-more" onClick={() => setShowTopAppsModal(true)}>
                    See More
                  </button>
                )}
              </div>
              <TopAppsList topApps={topApps.slice(0, PANEL_LIST_LIMIT)} />
            </div>

            <div className="an-panel">
              <div className="an-panel-head">
                <h2>
                  <IconUser width={15} height={15} aria-hidden="true" />
                  Unique Users per App
                </h2>
                {uniqueUsersByApp.length > PANEL_LIST_LIMIT && (
                  <button type="button" className="an-see-more" onClick={() => setShowUniqueUsersModal(true)}>
                    See More
                  </button>
                )}
              </div>
              <div className="an-table-head">
                <span>App</span>
                <span>Users</span>
              </div>
              <UniqueUsersList uniqueUsersByApp={uniqueUsersByApp.slice(0, PANEL_LIST_LIMIT)} />
            </div>
          </div>

          {showTopAppsModal && (
            <Modal title="Top Apps" onClose={() => setShowTopAppsModal(false)}>
              <TopAppsList topApps={topApps.slice(PANEL_LIST_LIMIT)} />
            </Modal>
          )}

          {showUniqueUsersModal && (
            <Modal title="Unique Users per App" onClose={() => setShowUniqueUsersModal(false)}>
              <div className="an-table-head">
                <span>App</span>
                <span>Users</span>
              </div>
              <UniqueUsersList uniqueUsersByApp={uniqueUsersByApp.slice(PANEL_LIST_LIMIT)} />
            </Modal>
          )}

          <div className="an-bottom">
            <div className="an-panel">
              <div className="an-panel-head">
                <h2>Apps with activity</h2>
              </div>
              <div className="an-fraction">
                {activeAppsCount} / {totalAppsCount}
              </div>
              <div className="an-progress">
                <div
                  className="an-progress-fill"
                  style={{ width: `${totalAppsCount > 0 ? (activeAppsCount / totalAppsCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="an-panel">
              <div className="an-panel-head">
                <h2>
                  <IconLayers width={15} height={15} aria-hidden="true" />
                  Most Used Modules
                </h2>
              </div>
              <div className="an-donut-wrap">
                <ModuleDonutChart clicksByModule={clicksByModule} modulesById={modulesById} />
              </div>
            </div>

            <div className="an-panel">
              <div className="an-panel-head">
                <h2>Top Apps Launches</h2>
              </div>
              <div className="an-chart-wrap" style={{ height: 160 }}>
                <TopAppsBarChart topApps={topApps.slice(0, 6)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
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
  const animatedValue = useCountUp(value);
  return (
    <div className="an-stat">
      <div className="an-stat-top">
        <div>
          <div className="an-stat-num">{animatedValue.toLocaleString()}</div>
          <div className="an-stat-lbl">{label}</div>
        </div>
        {points.length > 0 && (
          <span className={`an-stat-badge ${isPositive ? 'up' : 'down'}`}>
            {isPositive ? '+' : ''}
            {delta.toLocaleString()}
            {deltaSuffix}
          </span>
        )}
      </div>
      <KpiSparkline points={points} />
    </div>
  );
}

function KpiSparkline({ points }: { points: DailyTrendPoint[] }) {
  if (points.length < 2) {
    return <div className="an-spark" />;
  }
  const width = 160;
  const height = 34;
  const max = Math.max(...points.map((p) => p.totalClicks), 1);
  const stepX = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = stepX * index;
    const y = height - 4 - (point.totalClicks / max) * (height - 8);
    return { x, y };
  });
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  return (
    <div className="an-spark">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={linePath} className="an-spark-path" />
      </svg>
    </div>
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
    <div>
      {topApps.map((app) => (
        <div key={app.appId} className="an-list-row">
          <div className="an-list-icon">
            <IconAppWindow width={14} height={14} />
          </div>
          <div className="an-list-name" title={app.appName}>
            {app.appName}
          </div>
          <span className="an-list-val">{app.totalClicks.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function UniqueUsersList({
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
    <div>
      {uniqueUsersByApp.map((entry) => (
        <div key={entry.appId} className="an-list-row">
          <div className="an-list-icon">
            <IconAppWindow width={14} height={14} />
          </div>
          <div className="an-list-name" title={entry.appName}>
            {entry.appName}
          </div>
          <span className="an-list-badge">
            {entry.uniqueUserCount} {entry.uniqueUserCount === 1 ? 'user' : 'users'}
          </span>
        </div>
      ))}
    </div>
  );
}

function DailyTrendAreaChart({ points }: { points: DailyTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - paddingY} L${coords[0].x.toFixed(1)},${height - paddingY} Z`;

  const labelEvery = Math.ceil(points.length / 7) || 1;
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const bandWidth = stepX || width;

  return (
    <div className="an-trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Daily launch trend"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <path d={areaPath} className="an-trend-area" />
        <path d={linePath} className="an-trend-line" vectorEffect="non-scaling-stroke" />
        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={paddingY}
            y2={height - paddingY}
            className="an-trend-guide"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {coords.map((c, i) => (
          <circle
            key={points[i].date}
            cx={c.x}
            cy={c.y}
            r={hoverIndex === i ? 5 : 3}
            className="an-trend-dot"
          />
        ))}
        {coords.map((c, i) => (
          <rect
            key={`hit-${points[i].date}`}
            x={c.x - bandWidth / 2}
            y={0}
            width={bandWidth}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}
      </svg>
      {hovered && (
        <div
          className="an-trend-tooltip"
          style={{ left: `${(hovered.x / width) * 100}%` }}
        >
          <div className="an-trend-tooltip-date">{formatShortDate(hovered.point.date)}</div>
          <div className="an-trend-tooltip-val">{hovered.point.totalClicks.toLocaleString()} launches</div>
        </div>
      )}
      <div className="an-trend-axis">
        {coords
          .filter((_, i) => i % labelEvery === 0 || i === coords.length - 1)
          .map((c) => (
            <span key={c.point.date}>{formatShortDate(c.point.date)}</span>
          ))}
      </div>
    </div>
  );
}

function TopAppsBarChart({ topApps }: { topApps: TopApp[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);

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
    <div className="an-vbar-chart">
      {topApps.map((app) => (
        <div
          key={app.appId}
          className="an-vbar-col"
          onMouseEnter={() => setHoverId(app.appId)}
          onMouseLeave={() => setHoverId((prev) => (prev === app.appId ? null : prev))}
        >
          <div className="an-vbar-track">
            {hoverId === app.appId && (
              <div className="an-vbar-tooltip">
                <strong>{app.totalClicks.toLocaleString()}</strong> {app.appName}
              </div>
            )}
            <div
              className={`an-vbar-fill ${hoverId === app.appId ? 'active' : ''}`}
              style={{ height: `${(app.totalClicks / max) * 100}%` }}
            />
          </div>
          <span className="an-vbar-label" title={app.appName}>
            {app.appName.split(' ')[0]}
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
  const [hoverId, setHoverId] = useState<string | null>(null);

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
  const hoveredSegment = segments.find((s) => s.moduleId === hoverId);

  return (
    <>
      <div className="an-donut-canvas">
        <svg viewBox="0 0 110 110" aria-hidden="true">
          <g transform="translate(55,55) rotate(-90)">
            {segments.map((segment, index) => {
              const fraction = segment.totalClicks / total;
              const dash = fraction * circumference;
              const isActive = hoverId === null || hoverId === segment.moduleId;
              const circle = (
                <circle
                  key={segment.moduleId}
                  r={radius}
                  fill="none"
                  stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                  strokeWidth={hoverId === segment.moduleId ? 19 : 16}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  opacity={isActive ? 1 : 0.35}
                  className="an-donut-seg"
                  onMouseEnter={() => setHoverId(segment.moduleId)}
                  onMouseLeave={() => setHoverId((prev) => (prev === segment.moduleId ? null : prev))}
                />
              );
              offset += dash;
              return circle;
            })}
          </g>
        </svg>
        <div className="an-donut-center">
          {hoveredSegment ? (
            <>
              <div className="an-donut-center-val">{Math.round((hoveredSegment.totalClicks / total) * 100)}%</div>
              <div className="an-donut-center-lbl">of clicks</div>
            </>
          ) : (
            <>
              <div className="an-donut-center-val">{total.toLocaleString()}</div>
              <div className="an-donut-center-lbl">clicks</div>
            </>
          )}
        </div>
      </div>
      <div className="an-legend">
        {segments.map((segment, index) => (
          <div
            key={segment.moduleId}
            className={`an-legend-item ${hoverId === segment.moduleId ? 'active' : ''}`}
            onMouseEnter={() => setHoverId(segment.moduleId)}
            onMouseLeave={() => setHoverId((prev) => (prev === segment.moduleId ? null : prev))}
          >
            <span className="an-legend-dot" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
            <span className="an-legend-name">
              {segment.moduleId === '__other__'
                ? 'Other modules'
                : modulesById.get(segment.moduleId)?.module.pulse_name ?? 'Unknown module'}
            </span>
            <span className="val">{segment.totalClicks}</span>
          </div>
        ))}
      </div>
    </>
  );
}
