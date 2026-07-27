import { useEffect, useState } from 'react';
import { IconClock } from './icons';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const LONG_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function CompactClock() {
  const now = useNow();
  return (
    <div className="header-clock">
      <IconClock width={15} height={15} aria-hidden="true" />
      <div className="header-clock-text">
        <span className="header-clock-time">{formatTime(now)}</span>
        <span className="header-clock-date">{DATE_FORMATTER.format(now)}</span>
      </div>
    </div>
  );
}

export function HeroClock() {
  const now = useNow();
  return (
    <div className="hero-clock">
      <div className="hero-clock-time">
        {pad(now.getHours())}:{pad(now.getMinutes())}
        <span className="hero-clock-seconds">:{pad(now.getSeconds())}</span>
      </div>
      <div className="hero-clock-date">{LONG_DATE_FORMATTER.format(now)}</div>
      <div className="hero-clock-status">
        <span className="hero-clock-dot" aria-hidden="true" />
        Systems live
      </div>
    </div>
  );
}
