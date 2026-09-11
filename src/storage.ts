import defaultCatalog from "../catalog/visions.json";
import type { Catalog, CharacterProfile, PersistedState, ShinyModRecord } from "./model";
import { VISION_CYCLE_WAIT_STARTED_AT, clampNumber, createInitialCharacterTracking, sharedVisionId, validateCatalog } from "./model";

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

function sanitizeCharacters(value: unknown, fallback: CharacterProfile[]) {
  if (!Array.isArray(value)) return fallback;
  const usedIds = new Set<string>();
  const characters = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<CharacterProfile>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 40) : "";
    if (!id || !name || usedIds.has(id)) return [];
    usedIds.add(id);
    return [{ id, name, createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString() }];
  }).slice(0, 12);
  return characters.length > 0 ? characters : fallback;
}

function characterState(parsed: Partial<PersistedState>, fallback: PersistedState) {
  const characters = sanitizeCharacters(parsed.characters, fallback.characters);
  const characterIds = new Set(characters.map((character) => character.id));
  const activeCharacterId = typeof parsed.activeCharacterId === "string" && characterIds.has(parsed.activeCharacterId) ? parsed.activeCharacterId : characters[0].id;
  const teamMemberIds = Array.isArray(parsed.teamMemberIds)
    ? [...new Set(parsed.teamMemberIds.filter((id): id is string => typeof id === "string" && characterIds.has(id)))]
    : characters.map((character) => character.id);
  return {
    characters,
    activeCharacterId,
    teamMemberIds,
    trackingMode: "solo" as const,
    activeTeamSessionId: typeof parsed.activeTeamSessionId === "string" && parsed.activeTeamSessionId ? parsed.activeTeamSessionId : `team-${Date.now().toString(36)}`,
  };
}

export function initialState(): PersistedState {
  return {
    schemaVersion: 1,
    catalog: defaultCatalog as Catalog,
    actions: [],
    boxes: [],
    manualBaselinePoints: [],
    shinyMods: [],
    ...createInitialCharacterTracking(),
    settings: {
      selectedVisionId: sharedVisionId(defaultCatalog as Catalog),
      waitMinutes: 30,
      activeMinutes: 30,
      phaseStartedAt: VISION_CYCLE_WAIT_STARTED_AT,
      phase: "waiting",
      overlayEnabled: false,
      overlayScale: 1,
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
    settings.selectedVisionId = sharedVisionId(catalog, settings.selectedVisionId);
    settings.overlayScale = clampNumber(Number(settings.overlayScale) || 1, .7, 1.5);
    const characters = characterState(parsed, fresh);
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
      ...characters,
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
  const characters = characterState(parsed, fresh);
  const catalog = parsed.catalog as Catalog;
  return {
    ...fresh,
    ...parsed,
    actions: parsed.actions,
    boxes: parsed.boxes,
    manualBaselinePoints: Array.isArray(parsed.manualBaselinePoints)
      ? parsed.manualBaselinePoints.filter((value) => Number.isFinite(value) && value > 0 && value <= 10_000).map(Math.round).slice(0, 500)
      : [],
    shinyMods: sanitizeShinyMods(parsed.shinyMods),
    ...characters,
    settings: { ...fresh.settings, ...(parsed.settings ?? {}), selectedVisionId: sharedVisionId(catalog), overlayScale: clampNumber(Number(parsed.settings?.overlayScale) || 1, .7, 1.5), notificationsEnabled: false, dataResetVersion: CURRENT_DATA_RESET_VERSION },
  };
}
