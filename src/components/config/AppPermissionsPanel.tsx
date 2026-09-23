import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAppPermissions } from '../../hooks/useAppPermissions';
import { LoadingState } from '../LoadingState';
import { ErrorState } from '../ErrorState';
import { IconInbox, IconX, IconSearch, IconChevronDown } from '../icons';

interface AppPermissionsPanelProps {
  appId: string;
}

export function AppPermissionsPanel({ appId }: AppPermissionsPanelProps) {
  const { status, error, activePermissions, availableRoles, addRole, removeRole, retry } = useAppPermissions(appId);
  const [query, setQuery] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableRoles;
    return availableRoles.filter((role) => role.name?.toLowerCase().includes(q));
  }, [availableRoles, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState message={error} onRetry={retry} />;

  const noRolesLeft = availableRoles.length === 0;

  function selectRole(roleId: string, roleName: string) {
    setSelectedRoleId(roleId);
    setQuery(roleName);
    setIsOpen(false);
  }

  async function handleAddRole() {
    if (!selectedRoleId) return;
    setBusy(true);
    setActionError(null);
    try {
      await addRole(selectedRoleId);
      setSelectedRoleId('');
      setQuery('');
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

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filteredRoles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const highlighted = filteredRoles[highlightedIndex];
      if (isOpen && highlighted) {
        selectRole(highlighted.roleid, highlighted.name ?? '');
      } else if (selectedRoleId) {
        handleAddRole();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div className="cfg-perms">
      <div className="cfg-perms-add">
        <div className="cfg-role-combobox" ref={containerRef}>
          <IconSearch className="cfg-role-combobox-icon" width={15} height={15} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cfg-role-combobox-input"
            placeholder={noRolesLeft ? 'All roles already added' : 'Search roles to add…'}
            value={query}
            disabled={busy || noRolesLeft}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedRoleId('');
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
          />
          <IconChevronDown className="cfg-role-combobox-chevron" width={14} height={14} aria-hidden="true" />

          {isOpen && !noRolesLeft && (
            <div className="cfg-role-dropdown" role="listbox">
              {filteredRoles.length === 0 ? (
                <div className="cfg-role-dropdown-empty">No matching roles</div>
              ) : (
                filteredRoles.map((role, index) => (
                  <button
                    type="button"
                    key={role.roleid}
                    role="option"
                    aria-selected={role.roleid === selectedRoleId}
                    className={`cfg-role-option${index === highlightedIndex ? ' is-highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => {
                      // Prevent the input from losing focus before the click registers.
                      e.preventDefault();
                      selectRole(role.roleid, role.name ?? '');
                      inputRef.current?.focus();
                    }}
                  >
                    {role.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
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
