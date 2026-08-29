import { initials } from '../utils/initials';
import { IconMenu, IconSearch } from './icons';

interface TopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
  userName?: string;
}

export function Topbar({ searchQuery, onSearchChange, onOpenSidebar, userName }: TopbarProps) {
  return (
    <div className="topbar">
      <button type="button" className="mobile-menu-btn" onClick={onOpenSidebar} aria-label="Open menu">
        <IconMenu width={17} height={17} />
      </button>
      <div className="top-search">
        <IconSearch width={15} height={15} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search apps, modules, or people"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search apps"
        />
      </div>
      <div className="top-right">
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
