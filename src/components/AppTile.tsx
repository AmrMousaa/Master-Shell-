import { useState } from 'react';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { launchApp } from '../utils/launchApp';
import { Icon } from './Icon';
import { IconStar } from './icons';

interface AppTileProps {
  app: Pulse_apps;
  moduleName?: string;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: (appId: string) => void;
  index?: number;
}

export function AppTile({ app, moduleName, isFavorite, isFavoritePending, onToggleFavorite, index = 0 }: AppTileProps) {
  const [popping, setPopping] = useState(false);
  return (
    <button
      type="button"
      className="tile"
      style={{ animationDelay: `${Math.min(index, 14) * 30}ms` }}
      onClick={() => launchApp(app)}
      disabled={!app.pulse_appurl}
    >
      {onToggleFavorite && (
        <span
          className={`tile-star${isFavorite ? ' pinned' : ''}${popping ? ' pop' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={isFavorite ? 'Remove from pinned apps' : 'Pin app'}
          title={isFavorite ? 'Unpin' : 'Pin'}
          onAnimationEnd={() => setPopping(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (isFavoritePending) return;
            setPopping(true);
            onToggleFavorite(app.pulse_appid);
          }}
        >
          <IconStar width={12} height={12} filled={isFavorite} />
        </span>
      )}
      <div className="tile-ring">
        <Icon src={app.pulse_iconurl} alt={app.pulse_name ?? 'App'} size={22} />
      </div>
      <div className="tile-name">{app.pulse_name}</div>
      {moduleName && <div className="tile-meta">{moduleName}</div>}
    </button>
  );
}
