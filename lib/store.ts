import { emptyState, type AppState } from "./types";
import { loadState, saveState } from "./storage";

const EMPTY: AppState = emptyState();
let snapshot: AppState = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): AppState {
  return snapshot;
}

export function getServerSnapshot(): AppState {
  return EMPTY;
}

export function hydrateFromStorage() {
  snapshot = loadState();
  emit();
}

export function setAppState(updater: AppState | ((prev: AppState) => AppState)) {
  snapshot = typeof updater === "function" ? updater(snapshot) : updater;
  saveState(snapshot);
  emit();
}

export function resetAppState() {
  snapshot = emptyState();
  saveState(snapshot);
  emit();
}
