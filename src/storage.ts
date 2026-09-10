import defaultCatalog from "../catalog/visions.json";
import type { Catalog, PersistedState } from "./model";
import { validateCatalog } from "./model";

const STORAGE_KEY = "caja-fantasma.once-human.state.v1";

export function initialState(): PersistedState {
  return {
    schemaVersion: 1,
    catalog: defaultCatalog as Catalog,
    actions: [],
    boxes: [],
    settings: {
      selectedVisionId: "gravity",
      waitMinutes: 30,
      activeMinutes: 30,
      phaseStartedAt: new Date().toISOString(),
      phase: "waiting",
      overlayEnabled: false,
      notificationsEnabled: true,
      voiceNotificationsEnabled: true,
      voiceLeadMinutes: 5,
      timingPresetVersion: 1,
      autoStartEnabled: true,
      ownerMode: false,
    },
  };
}

export function loadState(): PersistedState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PersistedState> | null;
    if (!parsed || parsed.schemaVersion !== 1 || !validateCatalog(parsed.catalog)) return initialState();
    const fresh = initialState();
    const settings = { ...fresh.settings, ...(parsed.settings ?? {}) };
    if (!parsed.settings?.timingPresetVersion) {
      settings.waitMinutes = 30;
      settings.activeMinutes = 30;
      settings.phase = "waiting";
      settings.phaseStartedAt = new Date().toISOString();
      settings.timingPresetVersion = 1;
    }
    return {
      ...fresh,
      ...parsed,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      boxes: Array.isArray(parsed.boxes) ? parsed.boxes : [],
      settings,
    };
  } catch {
    return initialState();
  }
}

export function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("caja-fantasma-state", { detail: state }));
}

export function exportState(state: PersistedState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `caja-fantasma-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function importState(text: string) {
  const parsed = JSON.parse(text) as PersistedState;
  if (parsed.schemaVersion !== 1 || !validateCatalog(parsed.catalog) || !Array.isArray(parsed.actions) || !Array.isArray(parsed.boxes)) {
    throw new Error("El archivo no es un respaldo válido de Caja Fantasma.");
  }
  return parsed;
}
