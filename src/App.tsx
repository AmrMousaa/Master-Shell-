import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ModuleOverview } from './components/ModuleOverview';
import { AppGrid } from './components/AppGrid';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { useNavigationData } from './hooks/useNavigationData';
import type { View } from './types/view';
import './App.css';

const COMPANY_NAME = 'Andalusia Pulse';

function App() {
  const { status, error, modules, modulesById, retry } = useNavigationData();
  const [view, setView] = useState<View>({ kind: 'overview' });
  const [searchQuery, setSearchQuery] = useState('');

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
  }

  function selectModule(moduleId: string) {
    setView({ kind: 'module', moduleId });
    setSearchQuery('');
  }

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
      />
      <Navigation
        modules={modules}
        modulesById={modulesById}
        selectedModuleId={view.kind === 'module' ? view.moduleId : null}
        onSelectModule={selectModule}
        onSelectOverview={goHome}
      />
      <main className="main-content">{content}</main>
    </div>
  );
}

export default App;
