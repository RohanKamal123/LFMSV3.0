"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppState, CollectionKey } from "./types";
import { emptyState, migrate, uid } from "./defaults";
import {
  cloudConfigured,
  loadLocal,
  pullRemote,
  pushRemote,
  saveLocal,
  stashBackup,
  type SyncStatus,
} from "./storage";

type Row = { id: string };

interface StoreValue {
  state: AppState;
  ready: boolean;
  syncStatus: SyncStatus;
  /** Apply an arbitrary transform; `updatedAt` is stamped for you. */
  update: (fn: (draft: AppState) => void) => void;
  /** Insert or replace a record in one of the array collections. */
  upsert: <K extends CollectionKey>(key: K, row: AppState[K][number]) => void;
  remove: (key: CollectionKey, id: string) => void;
  /** Replace the entire document (import / restore / remote pull). */
  replaceAll: (next: AppState) => void;
  syncNow: () => Promise<void>;
  cloudConfigured: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => emptyState());
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "off" });

  // Skips the very first persist so hydration does not immediately rewrite
  // (and re-timestamp) the document that was just loaded.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- initial load: local first, then reconcile with the cloud ----------
  useEffect(() => {
    const local = loadLocal();
    const initial = local ?? emptyState();
    setState(initial);
    setReady(true);
    hydrated.current = true;

    const code = initial.settings.syncCode;
    if (!cloudConfigured || !code) {
      setSyncStatus({ kind: "off" });
      return;
    }

    let cancelled = false;
    setSyncStatus({ kind: "syncing" });
    pullRemote(code)
      .then((remote) => {
        if (cancelled) return;
        if (remote && remote.data.updatedAt > initial.updatedAt) {
          // Remote is newer - keep a local snapshot before adopting it.
          stashBackup(initial);
          setState(remote.data);
          setSyncStatus({ kind: "idle", at: remote.updatedAt });
        } else if (!remote || remote.data.updatedAt < initial.updatedAt) {
          return pushRemote(code, initial).then((at) => {
            if (!cancelled) setSyncStatus({ kind: "idle", at });
          });
        } else {
          setSyncStatus({ kind: "idle", at: remote.updatedAt });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setSyncStatus({ kind: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- persist to localStorage (debounced) ------------------------------
  useEffect(() => {
    if (!hydrated.current || !ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveLocal(state), 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  // ---- push to the cloud (debounced harder - network, not disk) ---------
  useEffect(() => {
    if (!ready || !cloudConfigured) return;
    const code = state.settings.syncCode;
    if (!code) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      setSyncStatus({ kind: "syncing" });
      pushRemote(code, state)
        .then((at) => setSyncStatus({ kind: "idle", at }))
        .catch((err: Error) => setSyncStatus({ kind: "error", message: err.message }));
    }, 2000);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, ready]);

  const update = useCallback((fn: (draft: AppState) => void) => {
    setState((prev) => {
      // Structured clone keeps the reducer honest: pages always get a new
      // object graph, so React never misses a nested mutation.
      const draft: AppState = JSON.parse(JSON.stringify(prev));
      fn(draft);
      draft.updatedAt = new Date().toISOString();
      return draft;
    });
  }, []);

  const upsert = useCallback(
    <K extends CollectionKey>(key: K, row: AppState[K][number]) => {
      update((draft) => {
        const list = draft[key] as unknown as Row[];
        const item = row as unknown as Row;
        const i = list.findIndex((r) => r.id === item.id);
        if (i >= 0) list[i] = item;
        else list.push(item);
      });
    },
    [update],
  );

  const remove = useCallback(
    (key: CollectionKey, id: string) => {
      update((draft) => {
        const list = draft[key] as unknown as Row[];
        const i = list.findIndex((r) => r.id === id);
        if (i >= 0) list.splice(i, 1);
      });
    },
    [update],
  );

  const replaceAll = useCallback((next: AppState) => {
    setState((prev) => {
      stashBackup(prev);
      const clean = migrate(next);
      clean.updatedAt = new Date().toISOString();
      return clean;
    });
  }, []);

  const syncNow = useCallback(async () => {
    const code = state.settings.syncCode;
    if (!cloudConfigured || !code) {
      setSyncStatus({ kind: "off" });
      return;
    }
    setSyncStatus({ kind: "syncing" });
    try {
      const remote = await pullRemote(code);
      if (remote && remote.data.updatedAt > state.updatedAt) {
        stashBackup(state);
        setState(remote.data);
        setSyncStatus({ kind: "idle", at: remote.updatedAt });
      } else {
        const at = await pushRemote(code, state);
        setSyncStatus({ kind: "idle", at });
      }
    } catch (err) {
      setSyncStatus({ kind: "error", message: (err as Error).message });
    }
  }, [state]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      syncStatus,
      update,
      upsert,
      remove,
      replaceAll,
      syncNow,
      cloudConfigured,
    }),
    [state, ready, syncStatus, update, upsert, remove, replaceAll, syncNow],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

export { uid };
