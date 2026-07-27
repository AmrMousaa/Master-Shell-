import { IconGrid, IconHub, IconMenu, IconSearch } from './icons';

interface HeaderProps {
  companyName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onGoHome: () => void;
  onToggleMobileNav: () => void;
}

export function Header({ companyName, searchQuery, onSearchChange, onGoHome, onToggleMobileNav }: HeaderProps) {
  return (
    <header className="app-header">
      <button type="button" className="mobile-nav-toggle" onClick={onToggleMobileNav} aria-label="Toggle module navigation">
        <IconMenu width={20} height={20} />
      </button>
      <button type="button" className="brand" onClick={onGoHome}>
        <span className="brand-mark" aria-hidden="true">
          <IconHub width={19} height={19} />
        </span>
        <span className="brand-name">{companyName}</span>
      </button>
      <span className="header-divider" aria-hidden="true" />
      <div className="header-search">
        <IconSearch className="header-search-icon" width={16} height={16} aria-hidden="true" />
        <input
          type="search"
          className="search-input"
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search apps"
        />
      </div>
      <button type="button" className="home-link" onClick={onGoHome}>
        <IconGrid width={15} height={15} />
        Module overview
      </button>
    </header>
  );
}
