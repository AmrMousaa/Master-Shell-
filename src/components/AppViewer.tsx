import { useEffect, useRef, useState } from 'react';
import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { withHiddenNavbar } from '../utils/url';
import { Icon } from './Icon';
import { IconArrowLeft, IconArrowUpRight, IconLoader, IconShieldOff, IconX } from './icons';

interface AppViewerProps {
  app: Pulse_apps;
  variant: 'panel' | 'modal';
  accent?: string;
  onClose: () => void;
}

type LoadStatus = 'loading' | 'loaded' | 'blocked';

// Apps that refuse to be framed (X-Frame-Options / CSP frame-ancestors) still fire the
// iframe's load event almost instantly, since the browser "loads" its own blocked-content
// page. A genuine app takes noticeably longer, so an unusually fast load is our signal.
const FAST_LOAD_THRESHOLD_MS = 1200;
const STALL_TIMEOUT_MS = 20000;

export function AppViewer({ app, variant, accent, onClose }: AppViewerProps) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const loadStartedAt = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    loadStartedAt.current = performance.now();
    const stallTimer = window.setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'blocked' : current));
    }, STALL_TIMEOUT_MS);
    return () => window.clearTimeout(stallTimer);
  }, []);

  const src = app.pulse_appurl ? withHiddenNavbar(app.pulse_appurl) : undefined;

  function handleLoad() {
    const elapsed = performance.now() - loadStartedAt.current;
    setStatus(elapsed < FAST_LOAD_THRESHOLD_MS ? 'blocked' : 'loaded');
  }

  function handleError() {
    setStatus('blocked');
  }

  function continueInThisTab() {
    if (src) window.location.href = src;
  }

  const toolbar = (
    <div className="app-viewer-toolbar" style={accent ? ({ '--module-accent': accent } as React.CSSProperties) : undefined}>
      <button type="button" className="app-viewer-back" onClick={onClose}>
        <IconArrowLeft width={16} height={16} />
        Back to hub
      </button>
      <div className="app-viewer-title">
        <Icon src={app.pulse_iconurl} alt={app.pulse_name ?? 'App'} size={20} />
        <span>{app.pulse_name}</span>
      </div>
      <div className="app-viewer-actions">
        {src && (
          <a
            className="app-viewer-action-btn"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in a new browser tab"
            aria-label="Open in a new browser tab"
          >
            <IconArrowUpRight width={15} height={15} />
          </a>
        )}
        {variant === 'modal' && (
          <button type="button" className="app-viewer-action-btn" onClick={onClose} aria-label="Close">
            <IconX width={16} height={16} />
          </button>
        )}
      </div>
    </div>
  );

  const body = (
    <div className="app-viewer-body">
      {status === 'loading' && (
        <div className="app-viewer-loading">
          <IconLoader className="spinner-icon" width={26} height={26} aria-hidden="true" />
          <p>Loading {app.pulse_name}...</p>
        </div>
      )}
      {status === 'blocked' && (
        <div className="app-viewer-blocked">
          <IconShieldOff width={30} height={30} aria-hidden="true" />
          <p className="app-viewer-blocked-title">{app.pulse_name} can't be displayed inside the hub</p>
          <p className="app-viewer-blocked-text">
            This app's security settings don't allow it to be embedded. Continue in this browser tab instead — you
            won't leave the hub, it just takes over this tab.
          </p>
          <button type="button" className="retry-button" onClick={continueInThisTab}>
            Continue in this tab
          </button>
        </div>
      )}
      {src && status !== 'blocked' && (
        <iframe
          className="app-viewer-iframe"
          src={src}
          title={app.pulse_name ?? 'App'}
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: status === 'loaded' ? 1 : 0 }}
        />
      )}
      {status === 'loaded' && src && (
        <button type="button" className="app-viewer-trouble-hint" onClick={continueInThisTab}>
          Not displaying correctly? Continue in this tab
        </button>
      )}
    </div>
  );

  if (variant === 'modal') {
    return (
      <div className="app-viewer-modal-backdrop" onClick={onClose}>
        <div className="app-viewer-modal" onClick={(e) => e.stopPropagation()}>
          {toolbar}
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="app-viewer-panel">
      {toolbar}
      {body}
    </div>
  );
}
