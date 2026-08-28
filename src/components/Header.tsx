import { CompactClock } from './Clock';
import { IconBarChart, IconGrid, IconLayers, IconSearch, IconUser } from './icons';

interface HeaderProps {
  companyName: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onGoHome: () => void;
  showAnalyticsLink?: boolean;
  onSelectAnalytics?: () => void;
}

export function Header({
  companyName,
  searchQuery,
  onSearchChange,
  onGoHome,
  showAnalyticsLink,
  onSelectAnalytics,
}: HeaderProps) {
  const words = companyName.trim().split(/\s+/);
  const lastWord = words.pop();

  return (
    <header className="app-header">
      <button type="button" className="brand" onClick={onGoHome}>
        <span className="brand-mark" aria-hidden="true">
          <IconLayers width={17} height={17} />
        </span>
        <span className="brand-name">
          {words.length > 0 ? `${words.join(' ')} ` : ''}
          <span className="brand-name-accent">{lastWord}</span>
        </span>
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
      <CompactClock />
      {showAnalyticsLink && (
        <button type="button" className="home-link" onClick={onSelectAnalytics}>
          <IconBarChart width={15} height={15} />
          Analytics
        </button>
      )}
      <button type="button" className="home-link" onClick={onGoHome}>
        <IconGrid width={15} height={15} />
        Module overview
      </button>
      <span className="header-avatar" aria-hidden="true">
        <IconUser width={16} height={16} />
      </span>
    </header>
  );
}
