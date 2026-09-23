import { useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Pulse_modules } from '../../generated/models/Pulse_modulesModel';
import { Icon } from '../Icon';
import { IconArchive, IconGripVertical, IconInbox, IconPlus } from '../icons';
import { SortableRow } from './SortableRow';

interface ModuleConfigListProps {
  modules: Pulse_modules[];
  appCountByModuleId: Map<string, number>;
  activeAppCountByModuleId: Map<string, number>;
  searchActive?: boolean;
  onAdd: () => void;
  onEdit: (module: Pulse_modules) => void;
  onDeactivate: (module: Pulse_modules) => Promise<void>;
  onReorder: (reordered: Pulse_modules[]) => Promise<void>;
}

export function ModuleConfigList({
  modules,
  appCountByModuleId,
  activeAppCountByModuleId,
  searchActive = false,
  onAdd,
  onEdit,
  onDeactivate,
  onReorder,
}: ModuleConfigListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.pulse_moduleid === active.id);
    const newIndex = modules.findIndex((m) => m.pulse_moduleid === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    await onReorder(arrayMove(modules, oldIndex, newIndex));
  }

  async function confirmDeactivate(module: Pulse_modules) {
    setPendingId(module.pulse_moduleid);
    try {
      await onDeactivate(module);
    } finally {
      setPendingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <div className="sec-head" style={{ marginTop: 0 }}>
        <div className="sec-head-left">
          <h2>Modules</h2>
        </div>
        <button type="button" className="cfg-add-btn" onClick={onAdd}>
          <IconPlus width={15} height={15} aria-hidden="true" />
          Add Module
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="empty-state">
          <IconInbox width={26} height={26} aria-hidden="true" />
          <p>{searchActive ? 'No modules match your search.' : 'No modules have been configured yet.'}</p>
        </div>
      ) : (
        (() => {
          const rows = modules.map((module) => {
            const isActive = module.statecode === 0;
            const appCount = appCountByModuleId.get(module.pulse_moduleid) ?? 0;
            const activeAppCount = activeAppCountByModuleId.get(module.pulse_moduleid) ?? 0;
            const isConfirming = confirmingId === module.pulse_moduleid;
            const isPending = pendingId === module.pulse_moduleid;

            const rowBody = (attributes?: object, listeners?: object, isDragging?: boolean) => (
              <div className={`cfg-row${isActive ? '' : ' cfg-row-inactive'}${isDragging ? ' cfg-row-dragging' : ''}`}>
                {!searchActive && (
                  <span className="cfg-drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
                    <IconGripVertical width={16} height={16} aria-hidden="true" />
                  </span>
                )}
                <span className="cfg-row-icon">
                  <Icon src={module.pulse_iconurl} alt={module.pulse_name ?? 'Module'} size={22} />
                </span>
                <div className="cfg-row-main">
                  <div className="cfg-row-name">{module.pulse_name}</div>
                  {module.pulse_description && <div className="cfg-row-desc">{module.pulse_description}</div>}
                </div>
                <span className="cfg-row-meta">
                  {appCount} {appCount === 1 ? 'app' : 'apps'}
                </span>
                <span className={`cfg-badge${isActive ? ' active' : ' inactive'}`}>{isActive ? 'Active' : 'Inactive'}</span>
                <div className="cfg-row-actions">
                  <button type="button" className="cfg-link-btn" onClick={() => onEdit(module)}>
                    Edit
                  </button>
                  {isActive &&
                    (isConfirming ? (
                      <span className="cfg-confirm">
                        <span>
                          {activeAppCount > 0
                            ? `This module has ${activeAppCount} active ${activeAppCount === 1 ? 'app' : 'apps'}. Deactivate anyway?`
                            : 'Deactivate this module?'}
                        </span>
                        <button
                          type="button"
                          className="cfg-link-btn cfg-link-danger"
                          disabled={isPending}
                          onClick={() => confirmDeactivate(module)}
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
                        onClick={() => setConfirmingId(module.pulse_moduleid)}
                      >
                        <IconArchive width={13} height={13} aria-hidden="true" />
                        Deactivate
                      </button>
                    ))}
                </div>
              </div>
            );

            if (searchActive) {
              return <div key={module.pulse_moduleid}>{rowBody()}</div>;
            }

            return (
              <SortableRow key={module.pulse_moduleid} id={module.pulse_moduleid}>
                {({ attributes, listeners, isDragging }) => rowBody(attributes, listeners, isDragging)}
              </SortableRow>
            );
          });

          if (searchActive) {
            return <div className="cfg-list">{rows}</div>;
          }

          return (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={modules.map((m) => m.pulse_moduleid)} strategy={verticalListSortingStrategy}>
                <div className="cfg-list">{rows}</div>
              </SortableContext>
            </DndContext>
          );
        })()
      )}
    </div>
  );
}
