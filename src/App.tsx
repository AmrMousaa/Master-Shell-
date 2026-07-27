import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ModuleOverview } from './components/ModuleOverview';
import { AppGrid } from './components/AppGrid';
import { AppViewer } from './components/AppViewer';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { useNavigationData } from './hooks/useNavigationData';
import type { View } from './types/view';
import type { Pulse_apps } from './generated/models/Pulse_appsModel';
import { Pulse_appspulse_opentype } from './generated/models/Pulse_appsModel';
import './App.css';

const COMPANY_NAME = 'Andalusia Pulse';

function App() {
  const { status, error, modules, modulesById, retry } = useNavigationData();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<Pulse_apps | null>(null);

  const moduleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const module of modules) {
      map.set(module.pulse_moduleid, module.pulse_name ?? '');
    }
    return map;
  }, [modules]);

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
    setMobileNavOpen(false);
    setActiveApp(null);
  }

  function selectModule(moduleId: string) {
    setView({ kind: 'module', moduleId });
    setSearchQuery('');
    setMobileNavOpen(false);
    setActiveApp(null);
  }

  const activeAppAccent = activeApp
    ? modulesById.get(activeApp._pulse_module_value ?? '')?.module.pulse_colorcode
    : undefined;
  const activeAppVariant =
    activeApp?.pulse_opentype && Pulse_appspulse_opentype[activeApp.pulse_opentype] === 'Popup' ? 'modal' : 'panel';

  let content: React.ReactNode;
  if (status === 'loading') {
    content = <LoadingState />;
  } else if (status === 'error') {
    content = <ErrorState message={error} onRetry={retry} />;
  } else if (searchResults !== null) {
    content = (
      <AppGrid
        title={`Search results for "${searchQuery}"`}
        apps={searchResults}
        emptyMessage="No apps match your search."
        showModuleName
        moduleNameById={moduleNameById}
        onLaunch={setActiveApp}
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
        onLaunch={setActiveApp}
      />
    );
  } else {
    content = <ModuleOverview modulesById={modulesById} onSelectModule={selectModule} />;
  }

  return (
    <div className="app-shell">
      <Header
        companyName={COMPANY_NAME}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onGoHome={goHome}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
      />
      <div className="app-body">
        {isMobileNavOpen && <div className="mobile-nav-scrim" onClick={() => setMobileNavOpen(false)} />}
        <div className={`sidebar-wrapper${isMobileNavOpen ? ' open' : ''}`}>
          <Sidebar
            modules={modules}
            selectedModuleId={view.kind === 'module' ? view.moduleId : null}
            onSelectModule={selectModule}
            onSelectOverview={goHome}
          />
        </div>
        <main className="main-content">{content}</main>
        {activeApp && (
          <AppViewer
            key={activeApp.pulse_appid}
            app={activeApp}
            variant={activeAppVariant}
            accent={activeAppAccent}
            onClose={() => setActiveApp(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
