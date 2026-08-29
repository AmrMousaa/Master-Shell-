import { useEffect, useState } from 'react';

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

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

export function HeroClock() {
  const now = useNow();
  return (
    <div className="hero-clock">
      {pad(now.getHours())}:{pad(now.getMinutes())}
      <small>{LONG_DATE_FORMATTER.format(now)}</small>
    </div>
  );
}
