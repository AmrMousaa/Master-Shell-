import { useEffect, useRef, useState } from 'react';
import type { Pulse_apps } from '../../generated/models/Pulse_appsModel';
import type { Pulse_modules } from '../../generated/models/Pulse_modulesModel';
import type { AppFormInput } from '../../hooks/useAppConfig';
import { Icon } from '../Icon';
import { IconChevronLeft } from '../icons';
import { AppPermissionsPanel } from './AppPermissionsPanel';

interface AppConfigFormProps {
  initialApp?: Pulse_apps;
  activeModules: Pulse_modules[];
  defaultModuleId?: string;
  onSubmit: (input: AppFormInput) => Promise<void>;
  onCancel: () => void;
}

function isWellFormedUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function AppConfigForm({ initialApp, activeModules, defaultModuleId, onSubmit, onCancel }: AppConfigFormProps) {
  const [tab, setTab] = useState<'details' | 'permissions'>('details');
  const [name, setName] = useState(initialApp?.pulse_name ?? '');
  const [description, setDescription] = useState(initialApp?.pulse_description ?? '');
  const [appUrl, setAppUrl] = useState(initialApp?.pulse_appurl ?? '');
  const [moduleId, setModuleId] = useState(initialApp?._pulse_module_value ?? defaultModuleId ?? activeModules[0]?.pulse_moduleid ?? '');
  const [iconUrl, setIconUrl] = useState(
    initialApp?.pulse_iconurl ?? activeModules.find((m) => m.pulse_moduleid === moduleId)?.pulse_iconurl ?? ''
  );
  const [isActive, setIsActive] = useState(initialApp ? initialApp.statecode === 0 : true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // For a new app, keep the icon in sync with its module's icon by default —
  // but stop once the admin edits the Icon URL field themselves.
  const iconUrlTouchedRef = useRef(Boolean(initialApp));
  useEffect(() => {
    if (initialApp || iconUrlTouchedRef.current) return;
    setIconUrl(activeModules.find((m) => m.pulse_moduleid === moduleId)?.pulse_iconurl ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = appUrl.trim();

    if (!trimmedName) {
      setError('App name is required.');
      return;
    }
    if (!trimmedUrl) {
      setError('App URL is required.');
      return;
    }
    if (!isWellFormedUrl(trimmedUrl)) {
      setError('Enter a valid, fully-qualified URL (e.g. https://example.com).');
      return;
    }
    if (!moduleId) {
      setError('Select a module for this app.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        pulse_name: trimmedName,
        pulse_description: description.trim() || undefined,
        pulse_appurl: trimmedUrl,
        pulse_iconurl: iconUrl.trim() || undefined,
        moduleId,
        statecode: isActive ? 0 : 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the app.');
      setSubmitting(false);
    }
  }

  return (
    <div className="cfg-page">
      <button type="button" className="back-btn" onClick={onCancel}>
        <IconChevronLeft width={14} height={14} aria-hidden="true" />
        Back to apps
      </button>
      <div className="mp-head">
        <div>
          <h1>{initialApp ? 'Edit App' : 'Add App'}</h1>
          <p>Apps launch external tools and are grouped under a module.</p>
        </div>
      </div>

      {initialApp && (
        <div className="cfg-tabs">
          <button type="button" className={`cfg-tab${tab === 'details' ? ' active' : ''}`} onClick={() => setTab('details')}>
            Details
          </button>
          <button type="button" className={`cfg-tab${tab === 'permissions' ? ' active' : ''}`} onClick={() => setTab('permissions')}>
            Permissions
          </button>
        </div>
      )}

      {tab === 'permissions' && initialApp ? (
        <AppPermissionsPanel appId={initialApp.pulse_appid} />
      ) : (
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
            <span>
              App URL <em>*</em>
            </span>
            <input type="text" value={appUrl} onChange={(e) => setAppUrl(e.target.value)} placeholder="https://…" required />
          </label>

          <label className="cfg-field">
            <span>Icon URL</span>
            <div className="cfg-icon-field">
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => {
                  iconUrlTouchedRef.current = true;
                  setIconUrl(e.target.value);
                }}
                placeholder="https://… or defaults to the module's icon"
              />
              <span className="cfg-icon-preview">
                <Icon src={iconUrl || undefined} alt="" size={20} />
              </span>
            </div>
          </label>

          <label className="cfg-field">
            <span>
              Module <em>*</em>
            </span>
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} required>
              <option value="" disabled>
                Select a module…
              </option>
              {activeModules.map((module) => (
                <option key={module.pulse_moduleid} value={module.pulse_moduleid}>
                  {module.pulse_name}
                </option>
              ))}
            </select>
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
              {submitting ? 'Saving…' : 'Save App'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
