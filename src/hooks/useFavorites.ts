import { useCallback, useEffect, useRef, useState } from 'react';
import { Pulse_favoritesService } from '../generated/services/Pulse_favoritesService';
import type { Pulse_favorites, Pulse_favoritesBase } from '../generated/models/Pulse_favoritesModel';
import { getCurrentUserId } from '../services/currentUserAccess';

export const MAX_FAVORITES = 5;

const ACTIVE_FILTER = 'statecode eq 0';
const ORDER_BY = ['pulse_order asc'];

interface FavoritesState {
  status: 'loading' | 'error' | 'ready';
  error?: string;
  favorites: Pulse_favorites[];
}

function sortByOrder(favorites: Pulse_favorites[]): Pulse_favorites[] {
  return [...favorites].sort((a, b) => (a.pulse_order ?? 0) - (b.pulse_order ?? 0));
}

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>({ status: 'loading', favorites: [] });
  const [pendingAppIds, setPendingAppIds] = useState<Set<string>>(new Set());

  // Kept in sync with `state.favorites` so in-flight operations always read the
  // latest list instead of a stale value captured by an earlier closure.
  const favoritesRef = useRef<Pulse_favorites[]>(state.favorites);
  useEffect(() => {
    favoritesRef.current = state.favorites;
  }, [state.favorites]);

  // Serializes add/remove operations per app so a rapid toggle (add, then
  // remove, then add again) can't race an in-flight request for the same app.
  const queueRef = useRef<Map<string, Promise<void>>>(new Map());

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const userId = await getCurrentUserId();
      const result = await Pulse_favoritesService.getAll({
        filter: `${ACTIVE_FILTER} and _pulse_user_value eq ${userId}`,
        orderBy: ORDER_BY,
      });
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? 'Failed to load favorites.');
      }
      setState({ status: 'ready', favorites: sortByOrder(result.data) });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Something went wrong while loading favorites.',
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addFavorite = useCallback(async (appId: string) => {
    const snapshot = favoritesRef.current;

    if (snapshot.some((favorite) => favorite._pulse_app_value === appId)) {
      throw new Error('This app is already in your favorites.');
    }
    if (snapshot.length >= MAX_FAVORITES) {
      throw new Error(`You can only favorite up to ${MAX_FAVORITES} apps.`);
    }

    const userId = await getCurrentUserId();
    const nextOrder = snapshot.length === 0 ? 0 : Math.max(...snapshot.map((f) => f.pulse_order ?? 0)) + 1;

    const tempId = `temp-${appId}`;
    const optimisticFavorite = {
      pulse_favoriteid: tempId,
      pulse_order: nextOrder,
      _pulse_app_value: appId,
      _pulse_user_value: userId,
      statecode: 0,
    } as Pulse_favorites;

    favoritesRef.current = sortByOrder([...favoritesRef.current, optimisticFavorite]);
    setState((prev) => ({ ...prev, favorites: favoritesRef.current }));

    try {
      const result = await Pulse_favoritesService.create({
        pulse_order: nextOrder,
        'pulse_App@odata.bind': `/pulse_apps(${appId})`,
        'pulse_user@odata.bind': `/systemusers(${userId})`,
        statecode: 0,
      } as Omit<Pulse_favoritesBase, 'pulse_favoriteid'>);
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? 'Failed to add favorite.');
      }
      const created = result.data;
      favoritesRef.current = sortByOrder(favoritesRef.current.map((f) => (f.pulse_favoriteid === tempId ? created : f)));
      setState((prev) => ({ ...prev, favorites: favoritesRef.current }));
    } catch (err) {
      favoritesRef.current = favoritesRef.current.filter((f) => f.pulse_favoriteid !== tempId);
      setState((prev) => ({ ...prev, favorites: favoritesRef.current }));
      throw err instanceof Error ? err : new Error('Failed to add favorite.');
    }
  }, []);

  const removeFavorite = useCallback(async (favoriteId: string) => {
    const snapshot = favoritesRef.current;
    const remaining = sortByOrder(snapshot.filter((f) => f.pulse_favoriteid !== favoriteId));
    const resequenced = remaining.map((favorite, index) => ({ ...favorite, pulse_order: index }));

    favoritesRef.current = resequenced;
    setState((prev) => ({ ...prev, favorites: resequenced }));

    try {
      // The favorite may still be mid-creation (an optimistic temp id) if the
      // user removes it before its create() request has resolved. There is
      // nothing to delete on the server yet in that case.
      if (!favoriteId.startsWith('temp-')) {
        await Pulse_favoritesService.delete(favoriteId);
      }

      const changed = resequenced.filter(
        (favorite, index) => !favorite.pulse_favoriteid.startsWith('temp-') && favorite.pulse_order !== (remaining[index].pulse_order ?? 0)
      );
      const results = await Promise.all(
        changed.map((favorite) => Pulse_favoritesService.update(favorite.pulse_favoriteid, { pulse_order: favorite.pulse_order }))
      );
      const failed = results.find((result) => !result.success);
      if (failed) {
        throw new Error(failed.error?.message ?? 'Failed to reorder favorites.');
      }
    } catch (err) {
      favoritesRef.current = snapshot;
      setState((prev) => ({ ...prev, favorites: snapshot }));
      throw err instanceof Error ? err : new Error('Failed to remove favorite.');
    }
  }, []);

  const reorderFavorite = useCallback(async (id: string, newOrder: number) => {
    // Stub for future drag-to-reorder support. Not wired to any UI yet.
    throw new Error(`reorderFavorite is not implemented yet (id=${id}, newOrder=${newOrder}).`);
  }, []);

  const setPending = useCallback((appId: string, isPending: boolean) => {
    setPendingAppIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(appId);
      else next.delete(appId);
      return next;
    });
  }, []);

  // Runs `operation` for `appId` only after any previous pending operation for
  // that same app has settled, so overlapping add/remove calls can't race.
  const runExclusive = useCallback(
    (appId: string, operation: () => Promise<void>) => {
      const previous = queueRef.current.get(appId) ?? Promise.resolve();
      setPending(appId, true);
      const next = previous
        .then(operation)
        .finally(() => {
          if (queueRef.current.get(appId) === next) {
            queueRef.current.delete(appId);
            setPending(appId, false);
          }
        });
      queueRef.current.set(appId, next);
      return next;
    },
    [setPending]
  );

  const toggleFavorite = useCallback(
    (appId: string) =>
      runExclusive(appId, async () => {
        const existing = favoritesRef.current.find((favorite) => favorite._pulse_app_value === appId);
        if (existing) {
          await removeFavorite(existing.pulse_favoriteid);
        } else {
          await addFavorite(appId);
        }
      }),
    [runExclusive, addFavorite, removeFavorite]
  );

  const favoritedAppIds = new Set(state.favorites.map((f) => f._pulse_app_value).filter((id): id is string => Boolean(id)));

  return {
    ...state,
    favoritedAppIds,
    pendingAppIds,
    isFavorite: (appId: string) => favoritedAppIds.has(appId),
    addFavorite,
    removeFavorite,
    reorderFavorite,
    toggleFavorite,
    retry: load,
  };
}
