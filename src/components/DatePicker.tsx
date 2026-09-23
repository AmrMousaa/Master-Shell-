import { useEffect, useRef, useState } from 'react';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './icons';

interface DatePickerProps {
  id: string;
  label: string;
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTriggerLabel(value: string): string {
  const date = parseDateOnly(value);
  if (!date) return 'Select date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DatePicker({ id, label, value, onChange, min, max }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDateOnly(value) ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setViewDate(parseDateOnly(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells = Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return cellDate;
  });

  const todayValue = toDateOnly(new Date());

  function select(cellDate: Date) {
    const dateValue = toDateOnly(cellDate);
    if (min && dateValue < min) return;
    if (max && dateValue > max) return;
    onChange(dateValue);
    setOpen(false);
  }

  return (
    <div className={`an-filter an-dropdown${open ? ' open' : ''}`} ref={containerRef}>
      <span className="an-filter-icon">
        <IconCalendar width={16} height={16} aria-hidden="true" />
      </span>
      <div className="an-filter-body">
        <label id={`${id}-label`}>{label}</label>
        <div
          className="an-dropdown-trigger"
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          <span>{formatTriggerLabel(value)}</span>
        </div>
      </div>

      <div className="an-dropdown-panel dp-panel" role="dialog" aria-labelledby={`${id}-label`}>
        <div className="dp-header">
          <button
            type="button"
            className="dp-nav"
            aria-label="Previous month"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >
            <IconChevronLeft width={15} height={15} aria-hidden="true" />
          </button>
          <span className="dp-month-label">{viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
          <button type="button" className="dp-nav" aria-label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
            <IconChevronRight width={15} height={15} aria-hidden="true" />
          </button>
        </div>

        <div className="dp-weekdays">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="dp-grid">
          {cells.map((cellDate) => {
            const dateValue = toDateOnly(cellDate);
            const isOutsideMonth = cellDate.getMonth() !== month;
            const isDisabled = (min && dateValue < min) || (max && dateValue > max);
            const isSelected = dateValue === value;
            const isToday = dateValue === todayValue;
            return (
              <button
                type="button"
                key={dateValue}
                className={`dp-cell${isOutsideMonth ? ' outside' : ''}${isSelected ? ' selected' : ''}${
                  isToday && !isSelected ? ' today' : ''
                }`}
                disabled={Boolean(isDisabled)}
                onClick={() => select(cellDate)}
              >
                {cellDate.getDate()}
              </button>
            );
          })}
        </div>

        <div className="dp-footer">
          <button type="button" className="dp-link" onClick={() => onChange('')}>
            Clear
          </button>
          <button
            type="button"
            className="dp-link"
            onClick={() => {
              if (min && todayValue < min) return;
              if (max && todayValue > max) return;
              onChange(todayValue);
              setOpen(false);
            }}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}
