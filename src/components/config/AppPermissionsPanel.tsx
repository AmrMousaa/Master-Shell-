import { useState } from 'react';
import { useAppPermissions } from '../../hooks/useAppPermissions';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { IconInbox, IconX } from '../icons';

interface AppPermissionsPanelProps {
  appId: string;
}

export function AppPermissionsPanel({ appId }: AppPermissionsPanelProps) {
  const { status, error, activePermissions, availableRoles, addRole, removeRole, retry } = useAppPermissions(appId);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState message={error} onRetry={retry} />;

  async function handleAddRole() {
    if (!selectedRoleId) return;
    setBusy(true);
    setActionError(null);
    try {
      await addRole(selectedRoleId);
      setSelectedRoleId('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add the role.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveRole(permissionId: string) {
    setBusy(true);
    setActionError(null);
    try {
      await removeRole(permissionId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove the role.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cfg-perms">
      <div className="cfg-perms-add">
        <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} disabled={busy || availableRoles.length === 0}>
          <option value="">{availableRoles.length === 0 ? 'All roles already added' : 'Select a role to add…'}</option>
          {availableRoles.map((role) => (
            <option key={role.roleid} value={role.roleid}>
              {role.name}
            </option>
          ))}
        </select>
        <button type="button" className="cfg-btn-secondary" onClick={handleAddRole} disabled={busy || !selectedRoleId}>
          Add Role
        </button>
      </div>

      {actionError && <div className="cfg-form-error">{actionError}</div>}

      {activePermissions.length === 0 ? (
        <div className="empty-state">
          <IconInbox width={26} height={26} aria-hidden="true" />
          <p>No roles are linked to this app yet — it won't be visible to anyone in the catalog.</p>
        </div>
      ) : (
        <div className="cfg-role-list">
          {activePermissions.map((permission) => (
            <div key={permission.pulse_apppermissionid} className="cfg-role-chip">
              <span>{permission.pulse_securityrolename}</span>
              <button
                type="button"
                className="cfg-chip-remove"
                aria-label={`Remove ${permission.pulse_securityrolename}`}
                disabled={busy}
                onClick={() => handleRemoveRole(permission.pulse_apppermissionid)}
              >
                <IconX width={11} height={11} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
