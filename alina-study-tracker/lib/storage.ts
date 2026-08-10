import type { AppState } from "./types";
import { getSupabase, cloudConfigured } from "./supabase";
import { migrate } from "./defaults";

export const LOCAL_KEY = "alina-study-tracker/v1";
const BACKUP_KEY = "alina-study-tracker/v1.backup";

export function loadLocal(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocal(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch (err) {
    // Quota errors are the realistic failure here; surface them rather than
    // silently losing writes.
    console.error("Could not save to this browser:", err);
  }
}

/**
 * Keep one generation of the previous state before a remote pull overwrites
 * it, so a bad sync is always recoverable from Settings.
 */
export function stashBackup(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
  } catch {
    /* best effort */
  }
}

export function readBackup(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BACKUP_KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export type SyncStatus =
  | { kind: "off" }
  | { kind: "idle"; at?: string }
  | { kind: "syncing" }
  | { kind: "error"; message: string };

export interface RemoteState {
  data: AppState;
  updatedAt: string;
}

/**
 * Reads the row identified by `code`. The table itself is not readable by the
 * anon role - `pull_state` is a security-definer function that only returns
 * the single row whose id matches, so the sync code acts as the secret.
 */
export async function pullRemote(code: string): Promise<RemoteState | null> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud sync is not configured for this deployment.");
  const { data, error } = await sb.rpc("pull_state", { p_code: code });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.data) return null;
  return { data: migrate(row.data), updatedAt: row.updated_at };
}

export async function pushRemote(code: string, state: AppState): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud sync is not configured for this deployment.");
  const { data, error } = await sb.rpc("push_state", {
    p_code: code,
    p_data: state,
    p_updated_at: state.updatedAt,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? state.updatedAt;
}

export { cloudConfigured };

export function newSyncCode(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for very old browsers; still a v4-shaped UUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function downloadJson(state: AppState, filename: string): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
