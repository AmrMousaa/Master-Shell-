import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ModuleOverview } from './components/ModuleOverview';
import { AppGrid } from './components/AppGrid';
import { UsageAnalyticsDashboard } from './components/UsageAnalyticsDashboard';
import { PulseConfigScreen } from './components/config/PulseConfigScreen';
import { Dock } from './components/Dock';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { Toast } from './components/Toast';
import { AppFrame } from './components/AppFrame';
import { IconSearch } from './components/icons';
import { useNavigationData } from './hooks/useNavigationData';
import { useFavorites } from './hooks/useFavorites';
import { useCurrentUser } from './hooks/useCurrentUser';
import { hasAnalyticsAccess, hasPulseAdminAccess } from './services/currentUserAccess';
import { recordAppUsage } from './services/usageTracking';
import { openAppInNewTab } from './utils/launchApp';
import type { Pulse_apps } from './generated/models/Pulse_appsModel';
import type { View } from './types/view';
import './App.css';

function App() {
  const { status, error, modules, apps, modulesById, retry } = useNavigationData();
  const { favorites, favoritedAppIds, pendingAppIds, toggleFavorite: toggleFavoriteRaw } = useFavorites();
  const { fullName } = useCurrentUser();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);
  const [canManagePulseConfig, setCanManagePulseConfig] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([hasAnalyticsAccess(), hasPulseAdminAccess()]).then(([canAnalytics, canPulseAdmin]) => {
      if (cancelled) return;
      setCanViewAnalytics(canAnalytics);
      setCanManagePulseConfig(canPulseAdmin);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Modules/apps edited in Pulse Configuration are fetched through a
  // separate hook, so refresh the main navigation data once the admin
  // leaves that screen to pick up any changes (icon, name, order, etc.).
  const previousViewKindRef = useRef(view.kind);
  useEffect(() => {
    if (previousViewKindRef.current === 'pulseConfig' && view.kind !== 'pulseConfig') {
      retry();
    }
    previousViewKindRef.current = view.kind;
  }, [view.kind, retry]);

  // Opening an app pushes a history entry so the browser's Back button closes
  // it and returns to Pulse, instead of leaving the shell altogether.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      if (!event.state?.pulseAppId) {
        setView((current) => (current.kind === 'app' ? current.returnTo : current));
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const moduleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const module of modules) {
      map.set(module.pulse_moduleid, module.pulse_name ?? '');
    }
    return map;
  }, [modules]);

  const appById = useMemo(() => {
    const map = new Map<string, (typeof apps)[number]>();
    for (const app of apps) {
      map.set(app.pulse_appid, app);
    }
    return map;
  }, [apps]);

  const favoriteApps = useMemo(
    () =>
      favorites
        .map((favorite) => (favorite._pulse_app_value ? appById.get(favorite._pulse_app_value) : undefined))
        .filter((app): app is NonNullable<typeof app> => Boolean(app)),
    [favorites, appById]
  );

  function toggleFavorite(appId: string) {
    toggleFavoriteRaw(appId).catch((err) => {
      setToastMessage(err instanceof Error ? err.message : 'Failed to update favorites.');
    });
  }

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    const results = [];
    for (const { apps } of modulesById.values()) {
      for (const app of apps) {
        if (app.pulse_name?.toLowerCase().includes(query)) {
          results.push(app);
        }
      }
    }
    return results;
  }, [searchQuery, modulesById]);

  const selectedModuleEntry = view.kind === 'module' ? modulesById.get(view.moduleId) : undefined;
  const dockActive =
    view.kind === 'analytics'
      ? 'analytics'
      : view.kind === 'pulseConfig'
        ? 'pulseConfig'
        : 'home';

  const openApp = view.kind === 'app' ? appById.get(view.appId) : undefined;

  // Leaving an open app for another screen: drop its history entry's marker so
  // a later Back press doesn't try to "close" an app that's no longer shown.
  function navigate(next: View) {
    if (window.history.state?.pulseAppId) {
      window.history.replaceState(null, '');
    }
    setView(next);
    setSearchQuery('');
  }

  function goHome() {
    navigate({ kind: 'overview' });
  }

  function selectModule(moduleId: string) {
    navigate({ kind: 'module', moduleId });
  }

  function selectAnalytics() {
    navigate({ kind: 'analytics' });
  }

  function selectPulseConfig() {
    navigate({ kind: 'pulseConfig' });
  }

  function launchApp(app: Pulse_apps) {
    if (!app.pulse_appurl) return;
    // No page navigation any more, so there's nothing to race: fire and forget.
    void recordAppUsage(app.pulse_appid);
    const historyState = { pulseAppId: app.pulse_appid };
    if (view.kind === 'app') {
      // Switching apps replaces the entry, so one Back press still returns to Pulse.
      window.history.replaceState(historyState, '');
    } else {
      window.history.pushState(historyState, '');
    }
    setView({ kind: 'app', appId: app.pulse_appid, returnTo: view.kind === 'app' ? view.returnTo : view });
    setSearchQuery('');
  }

  function closeApp() {
    if (window.history.state?.pulseAppId) {
      // popstate handler restores the previous screen.
      window.history.back();
    } else {
      setView((current) => (current.kind === 'app' ? current.returnTo : current));
    }
  }

  let content: React.ReactNode;
  if (view.kind === 'pulseConfig' && canManagePulseConfig) {
    content = <PulseConfigScreen searchQuery={searchQuery} onBack={goHome} onError={setToastMessage} />;
  } else if (status === 'loading') {
    content = <LoadingState />;
  } else if (status === 'error') {
    content = <ErrorState message={error} onRetry={retry} />;
  } else if (view.kind === 'analytics' && canViewAnalytics) {
    content = <UsageAnalyticsDashboard />;
  } else if (openApp) {
    content = <AppFrame key={openApp.pulse_appid} app={openApp} />;
  } else if (searchResults !== null) {
    content = (
      <AppGrid
        title={`Search results for "${searchQuery}"`}
        icon={<IconSearch width={24} height={24} />}
        apps={searchResults}
        emptyMessage="No apps match your search."
        showModuleName
        moduleNameById={moduleNameById}
        favoritedAppIds={favoritedAppIds}
        pendingAppIds={pendingAppIds}
        onToggleFavorite={toggleFavorite}
        onLaunchApp={launchApp}
        onBack={goHome}
      />
    );
  } else if (view.kind === 'module' && selectedModuleEntry) {
    content = (
      <AppGrid
        title={selectedModuleEntry.module.pulse_name ?? ''}
        description={selectedModuleEntry.module.pulse_description}
        iconUrl={selectedModuleEntry.module.pulse_iconurl}
        apps={selectedModuleEntry.apps}
        emptyMessage="This module doesn't have any active apps yet."
        favoritedAppIds={favoritedAppIds}
        pendingAppIds={pendingAppIds}
        onToggleFavorite={toggleFavorite}
        onLaunchApp={launchApp}
        onBack={goHome}
      />
    );
  } else {
    content = (
      <ModuleOverview
        modulesById={modulesById}
        onSelectModule={selectModule}
        favoriteApps={favoriteApps}
        pendingAppIds={pendingAppIds}
        onToggleFavorite={toggleFavorite}
        onLaunchApp={launchApp}
        moduleNameById={moduleNameById}
        userName={fullName}
      />
    );
  }

  return (
    <div className="shell">
      <Sidebar
        modules={modules}
        modulesById={modulesById}
        selectedModuleId={view.kind === 'module' ? view.moduleId : null}
        onGoHome={goHome}
        favoritedAppIds={favoritedAppIds}
        onToggleFavorite={toggleFavorite}
        onLaunchApp={launchApp}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={fullName}
      />
      <div className="main">
        <Topbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSidebar={() => setSidebarOpen(true)}
          userName={fullName}
          showSearch={!(view.kind === 'analytics' && canViewAnalytics)}
          openApp={
            openApp && {
              name: openApp.pulse_name ?? 'App',
              onClose: closeApp,
              onOpenInNewTab: () => openAppInNewTab(openApp),
            }
          }
        />
        <main className={`content${openApp ? ' content-app' : ''}`}>{content}</main>
      </div>
      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
      {/* The dock floats over the bottom of the page, which would cover the embedded app. */}
      {!openApp && (
        <Dock
          active={dockActive}
          onGoHome={goHome}
          onSelectAnalytics={selectAnalytics}
          onSelectPulseConfig={selectPulseConfig}
          canViewAnalytics={canViewAnalytics}
          canManagePulseConfig={canManagePulseConfig}
        />
      )}
    </div>
  );
}

export default App;
