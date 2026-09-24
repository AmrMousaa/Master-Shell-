import { useEffect, useRef, useState } from 'react';
import type { Pulse_modules } from '../generated/models/Pulse_modulesModel';
import { Icon } from './Icon';
import { IconCheck, IconChevronDown } from './icons';

interface ModuleMultiFilterDropdownProps {
  modules: Pulse_modules[];
  // Empty means "All Modules".
  value: string[];
  onChange: (moduleIds: string[]) => void;
}

export function ModuleMultiFilterDropdown({ modules, value, onChange }: ModuleMultiFilterDropdownProps) {
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

  const selected = new Set(value);
  const isAll = selected.size === 0;

  let label = 'All Modules';
  if (selected.size === 1) {
    label = modules.find((m) => selected.has(m.pulse_moduleid))?.pulse_name ?? '1 module';
  } else if (selected.size > 1) {
    label = `${selected.size} modules`;
  }

  // The panel stays open so several modules can be picked in one go.
  function toggle(moduleId: string) {
    const next = new Set(selected);
    if (next.has(moduleId)) {
      next.delete(moduleId);
    } else {
      next.add(moduleId);
    }
    // Picking every module is the same as "All Modules".
    onChange(next.size === modules.length ? [] : Array.from(next));
  }

  function optionKeyDown(action: () => void) {
    return (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    };
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
        <label id="an-module-multi-label">Module</label>
        <div
          className="an-dropdown-trigger"
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="an-module-multi-label"
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={optionKeyDown(() => setOpen((prev) => !prev))}
        >
          <span>{label}</span>
          <IconChevronDown width={12} height={12} aria-hidden="true" />
        </div>
      </div>
      <div
        className="an-dropdown-panel"
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby="an-module-multi-label"
      >
        <div
          className={`an-dropdown-option${isAll ? ' selected' : ''}`}
          role="option"
          aria-selected={isAll}
          tabIndex={0}
          onClick={() => onChange([])}
          onKeyDown={optionKeyDown(() => onChange([]))}
        >
          <span>All Modules</span>
          <span className="an-dropdown-check">
            <IconCheck width={14} height={14} aria-hidden="true" />
          </span>
        </div>
        {modules.map((module) => {
          const isSelected = selected.has(module.pulse_moduleid);
          return (
            <div
              key={module.pulse_moduleid}
              className={`an-dropdown-option${isSelected ? ' selected' : ''}`}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => toggle(module.pulse_moduleid)}
              onKeyDown={optionKeyDown(() => toggle(module.pulse_moduleid))}
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
