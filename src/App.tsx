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
import { IconSearch } from './components/icons';
import { useNavigationData } from './hooks/useNavigationData';
import { useFavorites } from './hooks/useFavorites';
import { useCurrentUser } from './hooks/useCurrentUser';
import { hasAnalyticsAccess, hasPulseAdminAccess } from './services/currentUserAccess';
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
    hasAnalyticsAccess().then((allowed) => {
      if (!cancelled) setCanViewAnalytics(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    hasPulseAdminAccess().then((allowed) => {
      if (!cancelled) setCanManagePulseConfig(allowed);
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

  function goHome() {
    setView({ kind: 'overview' });
    setSearchQuery('');
  }

  function selectModule(moduleId: string) {
    setView({ kind: 'module', moduleId });
    setSearchQuery('');
  }

  function selectAnalytics() {
    setView({ kind: 'analytics' });
    setSearchQuery('');
  }

  function selectPulseConfig() {
    setView({ kind: 'pulseConfig' });
    setSearchQuery('');
  }

  let content: React.ReactNode;
  if (view.kind === 'pulseConfig' && canManagePulseConfig) {
    content = <PulseConfigScreen onBack={goHome} onError={setToastMessage} />;
  } else if (status === 'loading') {
    content = <LoadingState />;
  } else if (status === 'error') {
    content = <ErrorState message={error} onRetry={retry} />;
  } else if (view.kind === 'analytics' && canViewAnalytics) {
    content = <UsageAnalyticsDashboard modulesById={modulesById} />;
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
        onSelectModule={selectModule}
        onGoHome={goHome}
        favoritedAppIds={favoritedAppIds}
        onToggleFavorite={toggleFavorite}
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
        />
        <main className="content">{content}</main>
      </div>
      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
      <Dock
        active={dockActive}
        onGoHome={goHome}
        onSelectAnalytics={selectAnalytics}
        onSelectPulseConfig={selectPulseConfig}
        canViewAnalytics={canViewAnalytics}
        canManagePulseConfig={canManagePulseConfig}
      />
    </div>
  );
}

export default App;
