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

export type Catalog = {
  schemaVersion: 1;
  catalogVersion: number;
  updatedAt: string;
  updatedBy: string;
  boxTargetPoints: number;
  proActivities: Activity[];
  visions: Vision[];
};

export type PointAction = {
  id: string;
  activityId: string;
  activityName: string;
  visionId?: string;
  visionName?: string;
  points: number;
  occurredAt: string;
};

export type BoxRecord = {
  id: string;
  occurredAt: string;
  points: number;
  claims: number;
  breakdown: Array<{ name: string; count: number; points: number }>;
};

export type Settings = {
  selectedVisionId: string;
  waitMinutes: number;
  activeMinutes: number;
  phaseStartedAt: string;
  phase: "waiting" | "active";
  overlayEnabled: boolean;
  notificationsEnabled: boolean;
  autoStartEnabled: boolean;
  ownerMode: boolean;
  lastNotificationPhaseStartedAt?: string;
};

export type PersistedState = {
  schemaVersion: 1;
  catalog: Catalog;
  actions: PointAction[];
  boxes: BoxRecord[];
  settings: Settings;
};

export type CycleSnapshot = {
  phase: "waiting" | "active";
  remainingMs: number;
  progress: number;
  phaseEndsAt: string;
};

export const APP_VERSION = "1.0.0";
export const AUTHOR = "OscarD0823";
export const REPOSITORY_URL = "https://github.com/OscarD0823/Caja-Fantasma";
export const REMOTE_CATALOG_URL = "https://raw.githubusercontent.com/OscarD0823/Caja-Fantasma/main/catalog/visions.json";

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function computeCycle(settings: Settings, now = Date.now()): CycleSnapshot {
  const waitMs = clampNumber(settings.waitMinutes, 1, 525_600) * 60_000;
  const activeMs = clampNumber(settings.activeMinutes, 1, 525_600) * 60_000;
  let phase = settings.phase;
  let startedAt = new Date(settings.phaseStartedAt).getTime();
  if (!Number.isFinite(startedAt)) startedAt = now;

  let duration = phase === "active" ? activeMs : waitMs;
  while (now >= startedAt + duration) {
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

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;
  if (days > 0) return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

export function boxStatistics(boxes: BoxRecord[], currentPoints: number) {
  const samples = boxes.map((box) => box.points).filter((value) => value > 0);
  if (samples.length === 0) {
    return { count: 0, minimum: 0, maximum: 0, average: 0, perPointPercent: 0, currentChancePercent: 0 };
  }
  const total = samples.reduce((sum, value) => sum + value, 0);
  const probability = samples.length / total;
  return {
    count: samples.length,
    minimum: Math.min(...samples),
    maximum: Math.max(...samples),
    average: total / samples.length,
    perPointPercent: probability * 100,
    currentChancePercent: (1 - Math.pow(1 - probability, Math.max(0, currentPoints))) * 100,
  };
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

export function validateCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== "object") return false;
  const catalog = value as Partial<Catalog>;
  const validActivity = (activity: Activity) => Boolean(activity && typeof activity.id === "string" && typeof activity.name === "string" && Number.isFinite(activity.points) && typeof activity.enabled === "boolean");
  return catalog.schemaVersion === 1
    && Number.isInteger(catalog.catalogVersion)
    && typeof catalog.updatedAt === "string"
    && typeof catalog.updatedBy === "string"
    && Number.isFinite(catalog.boxTargetPoints)
    && Array.isArray(catalog.proActivities)
    && catalog.proActivities.every(validActivity)
    && Array.isArray(catalog.visions)
    && catalog.visions.every((vision) => vision && typeof vision.id === "string" && typeof vision.name === "string" && typeof vision.enabled === "boolean" && Array.isArray(vision.activities) && vision.activities.every(validActivity));
}
