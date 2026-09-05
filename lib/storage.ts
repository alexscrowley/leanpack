import { emptyState, type AppState } from "./types";

const KEY = "leanpack.v1";

export function loadState(): AppState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== "object") return emptyState();
    return {
      ...emptyState(),
      ...parsed,
      draft: { ...emptyState().draft, ...parsed.draft },
      exchanges: Array.isArray(parsed.exchanges) ? parsed.exchanges.slice(-12) : [],
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota — packing still works for the session.
  }
}

export function clearState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
