import { useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ModuleOverview } from './components/ModuleOverview';
import { AppGrid } from './components/AppGrid';
import { UsageAnalyticsDashboard } from './components/UsageAnalyticsDashboard';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { Toast } from './components/Toast';
import { useNavigationData } from './hooks/useNavigationData';
import { useFavorites } from './hooks/useFavorites';
import { hasAnalyticsAccess } from './services/currentUserAccess';
import type { View } from './types/view';
import './App.css';

const COMPANY_NAME = 'Andalusia Pulse';

function App() {
  const { status, error, modules, apps, modulesById, retry } = useNavigationData();
  const { favorites, favoritedAppIds, pendingAppIds, toggleFavorite: toggleFavoriteRaw } = useFavorites();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasAnalyticsAccess().then((allowed) => {
      if (!cancelled) setCanViewAnalytics(allowed);
    });
    return () => {
      cancelled = true;
    };
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

  let content: React.ReactNode;
  if (status === 'loading') {
    content = <LoadingState />;
  } else if (status === 'error') {
    content = <ErrorState message={error} onRetry={retry} />;
  } else if (view.kind === 'analytics' && canViewAnalytics) {
    content = <UsageAnalyticsDashboard modulesById={modulesById} />;
  } else if (searchResults !== null) {
    content = (
      <AppGrid
        title={`Search results for "${searchQuery}"`}
        apps={searchResults}
        emptyMessage="No apps match your search."
        showModuleName
        moduleNameById={moduleNameById}
        favoritedAppIds={favoritedAppIds}
        pendingAppIds={pendingAppIds}
        onToggleFavorite={toggleFavorite}
      />
    );
  } else if (view.kind === 'module' && selectedModuleEntry) {
    content = (
      <AppGrid
        title={selectedModuleEntry.module.pulse_name ?? ''}
        description={selectedModuleEntry.module.pulse_description}
        accent={selectedModuleEntry.module.pulse_colorcode}
        apps={selectedModuleEntry.apps}
        emptyMessage="This module doesn't have any active apps yet."
        favoritedAppIds={favoritedAppIds}
        pendingAppIds={pendingAppIds}
        onToggleFavorite={toggleFavorite}
      />
    );
  } else {
    content = (
      <ModuleOverview
        modulesById={modulesById}
        onSelectModule={selectModule}
        favoriteApps={favoriteApps}
        favoritedAppIds={favoritedAppIds}
        pendingAppIds={pendingAppIds}
        onToggleFavorite={toggleFavorite}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header
        companyName={COMPANY_NAME}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onGoHome={goHome}
        showAnalyticsLink={canViewAnalytics}
        onSelectAnalytics={selectAnalytics}
      />
      <Navigation
        modules={modules}
        modulesById={modulesById}
        selectedModuleId={view.kind === 'module' ? view.moduleId : null}
        onSelectModule={selectModule}
        onSelectOverview={goHome}
      />
      <main className="main-content">{content}</main>
      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </div>
  );
}

export default App;
