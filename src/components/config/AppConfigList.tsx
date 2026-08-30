import { useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Pulse_apps } from '../../generated/models/Pulse_appsModel';
import type { Pulse_modules } from '../../generated/models/Pulse_modulesModel';
import { Icon } from '../Icon';
import { ModuleFilterDropdown } from '../ModuleFilterDropdown';
import { IconArchive, IconGripVertical, IconInbox, IconPlus } from '../icons';
import { SortableRow } from './SortableRow';

interface AppConfigListProps {
  apps: Pulse_apps[];
  modules: Pulse_modules[];
  moduleNameById: Map<string, string>;
  roleCountByAppId: Map<string, number>;
  favoriteCountByAppId: Map<string, number>;
  onAdd: () => void;
  onEdit: (app: Pulse_apps) => void;
  onDeactivate: (app: Pulse_apps) => Promise<void>;
  onReorder: (reorderedForModule: Pulse_apps[]) => Promise<void>;
  onSyncIconsWithModules: () => Promise<number>;
}

export function AppConfigList({
  apps,
  modules,
  moduleNameById,
  roleCountByAppId,
  favoriteCountByAppId,
  onAdd,
  onEdit,
  onDeactivate,
  onReorder,
  onSyncIconsWithModules,
}: AppConfigListProps) {
  const [moduleFilter, setModuleFilter] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingSync, setConfirmingSync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleSyncIcons() {
    setSyncing(true);
    try {
      const updated = await onSyncIconsWithModules();
      setSyncMessage(updated === 0 ? "All app icons already match their module's icon." : `Updated ${updated} app icon${updated === 1 ? '' : 's'}.`);
    } catch {
      // Already surfaced to the user via the shared error toast.
    } finally {
      setSyncing(false);
      setConfirmingSync(false);
    }
  }

  const displayedApps = useMemo(() => {
    if (moduleFilter) {
      return apps
        .filter((app) => app._pulse_module_value === moduleFilter)
        .sort((a, b) => (a.pulse_order ?? 0) - (b.pulse_order ?? 0));
    }
    return [...apps].sort((a, b) => {
      const moduleA = moduleNameById.get(a._pulse_module_value ?? '') ?? '';
      const moduleB = moduleNameById.get(b._pulse_module_value ?? '') ?? '';
      if (moduleA !== moduleB) return moduleA.localeCompare(moduleB);
      return (a.pulse_order ?? 0) - (b.pulse_order ?? 0);
    });
  }, [apps, moduleFilter, moduleNameById]);

  const canReorder = Boolean(moduleFilter);

  async function handleDragEnd(event: DragEndEvent) {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayedApps.findIndex((a) => a.pulse_appid === active.id);
    const newIndex = displayedApps.findIndex((a) => a.pulse_appid === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    await onReorder(arrayMove(displayedApps, oldIndex, newIndex));
  }

  async function confirmDeactivate(app: Pulse_apps) {
    setPendingId(app.pulse_appid);
    try {
      await onDeactivate(app);
    } finally {
      setPendingId(null);
      setConfirmingId(null);
    }
  }

  const list = (
    <div className="cfg-list">
      {displayedApps.map((app) => {
        const isActive = app.statecode === 0;
        const moduleName = moduleNameById.get(app._pulse_module_value ?? '') ?? 'Unassigned';
        const roleCount = roleCountByAppId.get(app.pulse_appid) ?? 0;
        const favoriteCount = favoriteCountByAppId.get(app.pulse_appid) ?? 0;
        const isConfirming = confirmingId === app.pulse_appid;
        const isPending = pendingId === app.pulse_appid;

        const row = (
          <div
            className={`cfg-row${isActive ? '' : ' cfg-row-inactive'}`}
            key={canReorder ? undefined : app.pulse_appid}
          >
            <span className="cfg-row-icon">
              <Icon src={app.pulse_iconurl} alt={app.pulse_name ?? 'App'} size={22} />
            </span>
            <div className="cfg-row-main">
              <div className="cfg-row-name">{app.pulse_name}</div>
              <div className="cfg-row-desc">{moduleName}</div>
            </div>
            <span className="cfg-row-meta">
              {roleCount} {roleCount === 1 ? 'role' : 'roles'}
            </span>
            <span className={`cfg-badge${isActive ? ' active' : ' inactive'}`}>{isActive ? 'Active' : 'Inactive'}</span>
            <div className="cfg-row-actions">
              <button type="button" className="cfg-link-btn" onClick={() => onEdit(app)}>
                Edit
              </button>
              {isActive &&
                (isConfirming ? (
                  <span className="cfg-confirm">
                    <span>
                      {favoriteCount > 0
                        ? `${favoriteCount} ${favoriteCount === 1 ? 'user has' : 'users have'} favorited this app. Deactivate anyway?`
                        : 'Deactivate this app?'}
                    </span>
                    <button
                      type="button"
                      className="cfg-link-btn cfg-link-danger"
                      disabled={isPending}
                      onClick={() => confirmDeactivate(app)}
                    >
                      {isPending ? 'Deactivating…' : 'Confirm'}
                    </button>
                    <button type="button" className="cfg-link-btn" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="cfg-link-btn cfg-link-danger"
                    onClick={() => setConfirmingId(app.pulse_appid)}
                  >
                    <IconArchive width={13} height={13} aria-hidden="true" />
                    Deactivate
                  </button>
                ))}
            </div>
          </div>
        );

        if (!canReorder) return row;

        return (
          <SortableRow key={app.pulse_appid} id={app.pulse_appid}>
            {({ attributes, listeners, isDragging }) => (
              <div className={isDragging ? 'cfg-row-dragging' : ''}>
                <div className="cfg-row-with-handle">
                  <span className="cfg-drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
                    <IconGripVertical width={16} height={16} aria-hidden="true" />
                  </span>
                  {row}
                </div>
              </div>
            )}
          </SortableRow>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="sec-head" style={{ marginTop: 0 }}>
        <div className="sec-head-left">
          <h2>Apps</h2>
        </div>
        <button type="button" className="cfg-add-btn" onClick={onAdd}>
          <IconPlus width={15} height={15} aria-hidden="true" />
          Add App
        </button>
      </div>

      <div className="cfg-toolbar">
        <ModuleFilterDropdown modules={modules} value={moduleFilter} onChange={setModuleFilter} />
        {!canReorder && <span className="hint">Select a module to enable drag-and-drop reordering.</span>}
      </div>

      <div className="cfg-toolbar">
        {confirmingSync ? (
          <span className="cfg-confirm">
            <span>Overwrite every app's icon with its module's icon?</span>
            <button type="button" className="cfg-link-btn" disabled={syncing} onClick={handleSyncIcons}>
              {syncing ? 'Syncing…' : 'Confirm'}
            </button>
            <button type="button" className="cfg-link-btn" onClick={() => setConfirmingSync(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="cfg-btn-secondary" onClick={() => setConfirmingSync(true)}>
            Sync App Icons with Modules
          </button>
        )}
        {syncMessage && <span className="hint">{syncMessage}</span>}
      </div>

      {displayedApps.length === 0 ? (
        <div className="empty-state">
          <IconInbox width={26} height={26} aria-hidden="true" />
          <p>No apps match this filter yet.</p>
        </div>
      ) : canReorder ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={displayedApps.map((a) => a.pulse_appid)} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}
    </div>
  );
}
