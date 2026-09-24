import { initials } from '../utils/initials';
import { IconMenu, IconSearch, IconX } from './icons';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  userName?: string;
  // Off on screens that don't respond to search (e.g. the analytics dashboard),
  // so there's no box that looks usable but does nothing.
  showSearch?: boolean;
}

export function Topbar({ searchQuery, onSearchChange, onOpenSidebar, userName, showSearch = true }: TopbarProps) {
  return (
    <div className="topbar">
      <button type="button" className="mobile-menu-btn" onClick={onOpenSidebar} aria-label="Open menu">
        <IconMenu width={17} height={17} />
      </button>
      <div className="top-right">
        {showSearch && (
          <div className={`top-search${searchQuery ? ' has-value' : ''}`}>
            <IconSearch width={15} height={15} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search apps, modules, or people"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search apps"
            />
            {searchQuery && (
              <button type="button" className="top-search-clear" aria-label="Clear search" onClick={() => onSearchChange('')}>
                <IconX width={12} height={12} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <span className="status-chip">
          <span className="dot" aria-hidden="true" />
          Systems live
        </span>
        <span className="top-avatar" aria-hidden="true">
          {initials(userName)}
        </span>
      </div>
    </div>
  );
}
