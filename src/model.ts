export type Activity = {
  id: string;
  name: string;
  points: number;
  enabled: boolean;
  note?: string;
};

export type Vision = {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  activities: Activity[];
};

export type SharedEventTiming = {
  selectedVisionId: string;
  waitMinutes: number;
  activeMinutes: number;
  phaseStartedAt: string;
  phase: "waiting" | "active";
  updatedAt: string;
  updatedBy: string;
};

export type Catalog = {
  schemaVersion: 1;
  catalogVersion: number;
  updatedAt: string;
  updatedBy: string;
  boxTargetPoints: number;
  proActivities: Activity[];
  visions: Vision[];
  eventTiming?: SharedEventTiming;
};

export type PointAction = {
  id: string;
  activityId: string;
  activityName: string;
  visionId?: string;
  visionName?: string;
  points: number;
  occurredAt: string;
  characterIds?: string[];
  trackingMode?: "solo" | "team";
  teamSessionId?: string;
};

export type BoxRecord = {
  id: string;
  occurredAt: string;
  points: number;
  claims: number;
  source?: "normal" | "platform-mail";
  carriedPoints?: number;
  characterId?: string;
  characterName?: string;
  breakdown: Array<{ name: string; count: number; points: number }>;
};

export type CharacterProfile = {
  id: string;
  name: string;
  createdAt: string;
};

export type ShinyModRecord = {
  id: string;
  catalogId?: string;
  modName: string;
  englishName?: string;
  groupName: string;
  variant: string;
  attempts: number;
  isShiny: boolean;
  createdAt: string;
  obtainedAt?: string;
};

export type Settings = {
  selectedVisionId: string;
  waitMinutes: number;
  activeMinutes: number;
  phaseStartedAt: string;
  phase: "waiting" | "active";
  overlayEnabled: boolean;
  notificationsEnabled: boolean;
  voiceNotificationsEnabled: boolean;
  voiceLeadMinutes: number;
  timingPresetVersion: number;
  autoStartEnabled: boolean;
  lastNotificationPhaseStartedAt?: string;
  lastVoiceAlertPhaseStartedAt?: string;
  sharedTimingUpdatedAt?: string;
  dataResetVersion: number;
};

export type PersistedState = {
  schemaVersion: 1;
  catalog: Catalog;
  actions: PointAction[];
  boxes: BoxRecord[];
  manualBaselinePoints: number[];
  shinyMods: ShinyModRecord[];
  characters: CharacterProfile[];
  activeCharacterId: string;
  trackingMode: "solo" | "team";
  teamMemberIds: string[];
  activeTeamSessionId: string;
  settings: Settings;
};

export type CycleSnapshot = {
  phase: "waiting" | "active";
  remainingMs: number;
  progress: number;
  phaseEndsAt: string;
};

export const APP_VERSION = "1.7.0";
export const AUTHOR = "OscarD0823";
export const DEFAULT_CHARACTER_ID = "character-main";
export const REPOSITORY_URL = "https://github.com/OscarD0823/Caja-Fantasma";
export const REMOTE_CATALOG_URL = "https://raw.githubusercontent.com/OscarD0823/Caja-Fantasma/main/catalog/visions.json";
// Gravedad terminó y comenzó su espera a las 16:52:30 de Colombia del 10/09/2026.
export const VISION_CYCLE_WAIT_STARTED_AT = "2026-09-10T21:52:30.000Z";
export const BASELINE_BOX_POINTS = [1209, 762, 966, 1143, 320, 797, 1180, 909, 1028, 1098, 408, 889, 1447, 1211, 1333, 588] as const;

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function actionCharacterIds(action: PointAction) {
  return Array.isArray(action.characterIds) ? action.characterIds : [DEFAULT_CHARACTER_ID];
}

export function actionBelongsToCharacter(action: PointAction, characterId: string) {
  return actionCharacterIds(action).includes(characterId);
}

export function actionsForCharacter(actions: PointAction[], characterId: string) {
  return actions.filter((action) => actionBelongsToCharacter(action, characterId));
}

export function actionsForTeamSession(actions: PointAction[], teamSessionId: string) {
  return actions.filter((action) => action.trackingMode === "team" && action.teamSessionId === teamSessionId);
}

export function detachCharacterFromActions(actions: PointAction[], characterId: string, actionIds?: ReadonlySet<string>) {
  return actions.flatMap((action) => {
    if ((actionIds && !actionIds.has(action.id)) || !actionBelongsToCharacter(action, characterId)) return [action];
    const characterIds = actionCharacterIds(action).filter((id) => id !== characterId);
    if (characterIds.length === 0 && action.trackingMode !== "team") return [];
    return [{ ...action, characterIds }];
  });
}

export function createInitialCharacterTracking(now = Date.now()) {
  const createdAt = new Date(now).toISOString();
  return {
    characters: [{ id: DEFAULT_CHARACTER_ID, name: "Personaje principal", createdAt }] as CharacterProfile[],
    activeCharacterId: DEFAULT_CHARACTER_ID,
    trackingMode: "solo" as const,
    teamMemberIds: [DEFAULT_CHARACTER_ID],
    activeTeamSessionId: `team-${now.toString(36)}`,
  };
}

export function computeCycle(settings: Settings, now = Date.now()): CycleSnapshot {
  const waitMs = clampNumber(settings.waitMinutes, 1, 525_600) * 60_000;
  const activeMs = clampNumber(settings.activeMinutes, 1, 525_600) * 60_000;
  let startedAt = new Date(settings.phaseStartedAt).getTime();
  if (!Number.isFinite(startedAt)) startedAt = now;
  const fullCycleMs = waitMs + activeMs;
  const elapsedFromAnchor = Math.max(0, now - startedAt);
  const completedCycles = Math.floor(elapsedFromAnchor / fullCycleMs);
  const remainder = elapsedFromAnchor - completedCycles * fullCycleMs;
  startedAt += completedCycles * fullCycleMs;

  let phase = settings.phase;
  let duration = phase === "active" ? activeMs : waitMs;
  if (remainder >= duration) {
    startedAt += duration;
    phase = phase === "active" ? "waiting" : "active";
    duration = phase === "active" ? activeMs : waitMs;
  }

  const elapsed = Math.max(0, now - startedAt);
  return {
    phase,
    remainingMs: Math.max(0, duration - elapsed),
    progress: Math.min(1, elapsed / duration),
    phaseEndsAt: new Date(startedAt + duration).toISOString(),
  };
}

export function shouldShowGravityWhale(settings: Settings, now = Date.now()) {
  if (settings.selectedVisionId !== "gravity") return false;
  const cycle = computeCycle(settings, now);
  if (cycle.phase === "active") {
    const elapsedMs = clampNumber(settings.activeMinutes, 1, 525_600) * 60_000 - cycle.remainingMs;
    return elapsedMs >= 15 * 60_000;
  }
  const elapsedWaitingMs = clampNumber(settings.waitMinutes, 1, 525_600) * 60_000 - cycle.remainingMs;
  return elapsedWaitingMs <= 5 * 60_000;
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  if (days > 0) return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

export function boxStatistics(boxes: BoxRecord[], currentPoints: number, baseline: readonly number[] = BASELINE_BOX_POINTS) {
  const referenceSamples = baseline.filter((value) => Number.isFinite(value) && value > 0);
  const personalSamples = boxes.map((box) => box.points).filter((value) => value > 0);
  const samples = [...referenceSamples, ...personalSamples];
  if (samples.length === 0) {
    return { count: 0, baselineCount: 0, personalCount: 0, minimum: 0, maximum: 0, average: 0, median: 0, lowerAverage: 0, upperAverage: 0, perPointPercent: 0, currentChancePercent: 0 };
  }
  const total = samples.reduce((sum, value) => sum + value, 0);
  const probability = samples.length / total;
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const lower = sorted.length === 1 ? sorted : sorted.slice(0, middle);
  const upper = sorted.length === 1 ? sorted : sorted.slice(Math.ceil(sorted.length / 2));
  const averageOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    count: samples.length,
    baselineCount: referenceSamples.length,
    personalCount: personalSamples.length,
    minimum: Math.min(...samples),
    maximum: Math.max(...samples),
    average: total / samples.length,
    median,
    lowerAverage: averageOf(lower),
    upperAverage: averageOf(upper),
    perPointPercent: probability * 100,
    currentChancePercent: (1 - Math.pow(1 - probability, Math.max(0, currentPoints))) * 100,
  };
}

export function parseManualBaseline(text: string, limit = 500) {
  return text
    .split(/[\s,;]+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 10_000)
    .map((value) => Math.round(value))
    .slice(0, Math.max(0, limit));
}

export function buildBreakdown(actions: PointAction[]) {
  const groups = new Map<string, { name: string; count: number; points: number }>();
  for (const action of actions) {
    const key = `${action.visionId ?? "pro"}:${action.activityId}`;
    const current = groups.get(key) ?? { name: action.visionName ? `${action.visionName} · ${action.activityName}` : action.activityName, count: 0, points: 0 };
    current.count += 1;
    current.points += action.points;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export function splitPlatformCarryover(actions: PointAction[], now = Date.now(), delayMinutes = 60) {
  const cutoff = now - clampNumber(delayMinutes, 1, 1_440) * 60_000;
  const completedAttempt: PointAction[] = [];
  const carryOver: PointAction[] = [];
  for (const action of actions) {
    const occurredAt = new Date(action.occurredAt).getTime();
    if (Number.isFinite(occurredAt) && occurredAt > cutoff) carryOver.push(action);
    else completedAttempt.push(action);
  }
  return { completedAttempt, carryOver, cutoff: new Date(cutoff).toISOString() };
}

export function validateCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as Partial<Catalog>;
  const validActivity = (activity: Activity) => Boolean(activity && typeof activity.id === "string" && typeof activity.name === "string" && Number.isFinite(activity.points) && typeof activity.enabled === "boolean");
  const timing = catalog.eventTiming;
  const validTiming = timing === undefined || (typeof timing.selectedVisionId === "string"
    && Number.isFinite(timing.waitMinutes) && timing.waitMinutes >= 1 && timing.waitMinutes <= 525_600
    && Number.isFinite(timing.activeMinutes) && timing.activeMinutes >= 1 && timing.activeMinutes <= 525_600
    && typeof timing.phaseStartedAt === "string"
    && Number.isFinite(Date.parse(timing.phaseStartedAt))
    && (timing.phase === "waiting" || timing.phase === "active")
    && typeof timing.updatedAt === "string"
    && Number.isFinite(Date.parse(timing.updatedAt))
    && typeof timing.updatedBy === "string");
  return catalog.schemaVersion === 1
    && Number.isInteger(catalog.catalogVersion)
    && typeof catalog.updatedAt === "string"
    && typeof catalog.updatedBy === "string"
    && Number.isFinite(catalog.boxTargetPoints)
    && Array.isArray(catalog.proActivities)
    && catalog.proActivities.every(validActivity)
    && Array.isArray(catalog.visions)
    && catalog.visions.every((vision) => vision && typeof vision.id === "string" && typeof vision.name === "string" && typeof vision.enabled === "boolean" && Array.isArray(vision.activities) && vision.activities.every(validActivity))
    && validTiming;
}
