import { useEffect, useRef, useState } from 'react';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import { Icon } from './Icon';
import { IconCheck, IconChevronDown } from './icons';

interface ModuleFilterDropdownProps {
  modules: Pulse_modules[];
  value: string;
  onChange: (moduleId: string) => void;
}

export function ModuleFilterDropdown({ modules, value, onChange }: ModuleFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedModule = modules.find((m) => m.pulse_moduleid === value);
  const label = selectedModule?.pulse_name ?? 'All Modules';

  function select(moduleId: string) {
    onChange(moduleId);
    setOpen(false);
  }

  return (
    <div className={`an-filter an-dropdown${open ? ' open' : ''}`} ref={containerRef}>
      <span className="an-filter-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </span>
      <div className="an-filter-body">
        <label id="an-module-label">Module</label>
        <div
          className="an-dropdown-trigger"
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="an-module-label"
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          <span>{label}</span>
          <IconChevronDown width={12} height={12} aria-hidden="true" />
        </div>
      </div>
      <div className="an-dropdown-panel" role="listbox" aria-labelledby="an-module-label">
        <div
          className={`an-dropdown-option${value === '' ? ' selected' : ''}`}
          role="option"
          aria-selected={value === ''}
          tabIndex={0}
          onClick={() => select('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              select('');
            }
          }}
        >
          <span>All Modules</span>
          <span className="an-dropdown-check">
            <IconCheck width={14} height={14} aria-hidden="true" />
          </span>
        </div>
        {modules.map((module) => {
          const isSelected = value === module.pulse_moduleid;
          return (
            <div
              key={module.pulse_moduleid}
              className={`an-dropdown-option${isSelected ? ' selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => select(module.pulse_moduleid)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select(module.pulse_moduleid);
                }
              }}
            >
              <span className="opt-icon">
                <Icon src={module.pulse_iconurl} alt="" size={14} />
              </span>
              <span>{module.pulse_name}</span>
              <span className="an-dropdown-check">
                <IconCheck width={14} height={14} aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
