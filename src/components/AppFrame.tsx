import { useState } from 'react';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { appLaunchUrl } from '../utils/launchApp';
import { IconLoader } from './icons';

interface AppFrameProps {
  app: Pulse_apps;
}

// Renders an app inside the shell, below the fixed topbar. Keyed by app id
// from the caller so switching apps remounts it and resets the loading state.
export function AppFrame({ app }: AppFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const url = appLaunchUrl(app);
  if (!url) return null;

  return (
    <div className="app-frame">
      {!loaded && (
        <div className="app-frame-loading" role="status">
          <IconLoader className="spinner-icon" width={22} height={22} aria-hidden="true" />
          <span>Opening {app.pulse_name}…</span>
        </div>
      )}
      <iframe
        className={`app-frame-iframe${loaded ? ' loaded' : ''}`}
        src={url}
        title={app.pulse_name ?? 'App'}
        allow="clipboard-read; clipboard-write; fullscreen; geolocation; camera; microphone"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
