import defaultCatalog from "../catalog/visions.json";
import type { Catalog, PersistedState, ShinyModRecord } from "./model";
import { VISION_CYCLE_WAIT_STARTED_AT, validateCatalog } from "./model";

const STORAGE_KEY = "caja-fantasma.once-human.state.v1";
const OVERLAY_POSITION_KEY = "caja-fantasma.once-human.overlay-position.v1";
const CURRENT_DATA_RESET_VERSION = 1;

export type OverlayPosition = { x: number; y: number };

function sanitizeShinyMods(value: unknown): ShinyModRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<ShinyModRecord>;
    if (typeof candidate.id !== "string" || typeof candidate.modName !== "string" || typeof candidate.groupName !== "string" || typeof candidate.variant !== "string") return [];
    return [{
      id: candidate.id,
      catalogId: typeof candidate.catalogId === "string" ? candidate.catalogId : undefined,
      modName: candidate.modName,
      englishName: typeof candidate.englishName === "string" ? candidate.englishName : undefined,
      groupName: candidate.groupName,
      variant: candidate.variant,
      attempts: Math.min(100_000, Math.max(0, Math.floor(Number(candidate.attempts) || 0))),
      isShiny: candidate.isShiny === true,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
      obtainedAt: typeof candidate.obtainedAt === "string" ? candidate.obtainedAt : undefined,
    }];
  }).slice(0, 5_000);
}

export function initialState(): PersistedState {
  return {
    schemaVersion: 1,
    catalog: defaultCatalog as Catalog,
    actions: [],
    boxes: [],
    manualBaselinePoints: [],
    shinyMods: [],
    settings: {
      selectedVisionId: "gravity",
      waitMinutes: 30,
      activeMinutes: 30,
      phaseStartedAt: VISION_CYCLE_WAIT_STARTED_AT,
      phase: "waiting",
      overlayEnabled: false,
      notificationsEnabled: false,
      voiceNotificationsEnabled: true,
      voiceLeadMinutes: 5,
      timingPresetVersion: 4,
      autoStartEnabled: true,
      sharedTimingUpdatedAt: (defaultCatalog as Catalog).eventTiming?.updatedAt,
      dataResetVersion: CURRENT_DATA_RESET_VERSION,
    },
  };
}

export function loadState(): PersistedState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PersistedState> | null;
    if (!parsed || parsed.schemaVersion !== 1 || !validateCatalog(parsed.catalog)) return initialState();
    const fresh = initialState();
    const settings = { ...fresh.settings, ...(parsed.settings ?? {}), notificationsEnabled: false };
    if ((parsed.settings?.timingPresetVersion ?? 0) < 4) {
      const timing = fresh.catalog.eventTiming;
      settings.selectedVisionId = timing?.selectedVisionId ?? "gravity";
      settings.waitMinutes = timing?.waitMinutes ?? 30;
      settings.activeMinutes = timing?.activeMinutes ?? 30;
      settings.phase = timing?.phase ?? "waiting";
      settings.phaseStartedAt = timing?.phaseStartedAt ?? VISION_CYCLE_WAIT_STARTED_AT;
      settings.lastNotificationPhaseStartedAt = undefined;
      settings.lastVoiceAlertPhaseStartedAt = undefined;
      settings.sharedTimingUpdatedAt = timing?.updatedAt;
      settings.timingPresetVersion = 4;
    }
    const mustClearPreviousRecords = (parsed.settings?.dataResetVersion ?? 0) < CURRENT_DATA_RESET_VERSION;
    settings.dataResetVersion = CURRENT_DATA_RESET_VERSION;
    const catalog = parsed.catalog.catalogVersion >= fresh.catalog.catalogVersion ? parsed.catalog : fresh.catalog;
    return {
      ...fresh,
      ...parsed,
      catalog,
      actions: mustClearPreviousRecords ? [] : Array.isArray(parsed.actions) ? parsed.actions : [],
      boxes: mustClearPreviousRecords ? [] : Array.isArray(parsed.boxes) ? parsed.boxes : [],
      manualBaselinePoints: mustClearPreviousRecords ? [] : Array.isArray(parsed.manualBaselinePoints)
        ? parsed.manualBaselinePoints.filter((value) => Number.isFinite(value) && value > 0 && value <= 10_000).map(Math.round).slice(0, 500)
        : [],
      shinyMods: mustClearPreviousRecords ? [] : sanitizeShinyMods(parsed.shinyMods),
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

export function loadOverlayPosition(): OverlayPosition | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(OVERLAY_POSITION_KEY) ?? "null") as Partial<OverlayPosition> | null;
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return undefined;
    if (Math.abs(value.x!) > 100_000 || Math.abs(value.y!) > 100_000) return undefined;
    return { x: Math.round(value.x!), y: Math.round(value.y!) };
  } catch {
    return undefined;
  }
}

export function saveOverlayPosition(position: OverlayPosition) {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
  localStorage.setItem(OVERLAY_POSITION_KEY, JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) }));
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
  const parsed = JSON.parse(text) as Partial<PersistedState>;
  if (parsed.schemaVersion !== 1 || !validateCatalog(parsed.catalog) || !Array.isArray(parsed.actions) || !Array.isArray(parsed.boxes)) {
    throw new Error("El archivo no es un respaldo válido de Caja Fantasma.");
  }
  const fresh = initialState();
  return {
    ...fresh,
    ...parsed,
    actions: parsed.actions,
    boxes: parsed.boxes,
    manualBaselinePoints: Array.isArray(parsed.manualBaselinePoints)
      ? parsed.manualBaselinePoints.filter((value) => Number.isFinite(value) && value > 0 && value <= 10_000).map(Math.round).slice(0, 500)
      : [],
    shinyMods: sanitizeShinyMods(parsed.shinyMods),
    settings: { ...fresh.settings, ...(parsed.settings ?? {}), notificationsEnabled: false, dataResetVersion: CURRENT_DATA_RESET_VERSION },
  };
}
