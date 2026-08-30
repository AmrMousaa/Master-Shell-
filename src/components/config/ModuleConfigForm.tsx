import { useState } from 'react';
import type { Pulse_modules } from '../../generated/models/Pulse_modulesModel';
import type { ModuleFormInput } from '../../hooks/useModuleConfig';
import { Icon } from '../Icon';
import { IconChevronLeft } from '../icons';

interface ModuleConfigFormProps {
  initialModule?: Pulse_modules;
  isNameTaken: (name: string, excludeId?: string) => boolean;
  onSubmit: (input: ModuleFormInput) => Promise<void>;
  onCancel: () => void;
}

export function ModuleConfigForm({ initialModule, isNameTaken, onSubmit, onCancel }: ModuleConfigFormProps) {
  const [name, setName] = useState(initialModule?.pulse_name ?? '');
  const [description, setDescription] = useState(initialModule?.pulse_description ?? '');
  const [iconUrl, setIconUrl] = useState(initialModule?.pulse_iconurl ?? '');
  const [isActive, setIsActive] = useState(initialModule ? initialModule.statecode === 0 : true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Module name is required.');
      return;
    }
    if (isNameTaken(trimmedName, initialModule?.pulse_moduleid)) {
      setError('A module with this name already exists.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        pulse_name: trimmedName,
        pulse_description: description.trim() || undefined,
        pulse_iconurl: iconUrl.trim() || undefined,
        statecode: isActive ? 0 : 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the module.');
      setSubmitting(false);
    }
  }

  return (
    <div className="cfg-page">
      <button type="button" className="back-btn" onClick={onCancel}>
        <IconChevronLeft width={14} height={14} aria-hidden="true" />
        Back to modules
      </button>
      <div className="mp-head">
        <div>
          <h1>{initialModule ? 'Edit Module' : 'Add Module'}</h1>
          <p>Modules group related apps together on the home screen.</p>
        </div>
      </div>

      <form className="cfg-form" onSubmit={handleSubmit}>
        <label className="cfg-field">
          <span>
            Name <em>*</em>
          </span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>

        <label className="cfg-field">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
        </label>

        <label className="cfg-field">
          <span>Icon URL</span>
          <div className="cfg-icon-field">
            <input type="text" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://… or data:…" />
            <span className="cfg-icon-preview">
              <Icon src={iconUrl || undefined} alt="" size={20} />
            </span>
          </div>
        </label>

        <div className="cfg-field cfg-field-toggle">
          <span>Status</span>
          <label className="cfg-toggle">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="cfg-toggle-track" aria-hidden="true" />
            <span className="cfg-toggle-label">{isActive ? 'Active' : 'Inactive'}</span>
          </label>
        </div>

        {error && <div className="cfg-form-error">{error}</div>}

        <div className="cfg-form-actions">
          <button type="button" className="cfg-btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="retry-button" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Module'}
          </button>
        </div>
      </form>
    </div>
  );
}
