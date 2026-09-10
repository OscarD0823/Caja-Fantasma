import assert from "node:assert/strict";
import catalog from "../catalog/visions.json" with { type: "json" };
import { BASELINE_BOX_POINTS, VISION_CYCLE_WAIT_STARTED_AT, boxStatistics, buildBreakdown, computeCycle, parseManualBaseline, splitPlatformCarryover, validateCatalog, type BoxRecord, type PointAction, type Settings } from "../src/model.ts";

assert.equal(validateCatalog(catalog), true, "El catálogo incluido debe ser válido.");
assert.equal(catalog.proActivities.find((item) => item.id === "pro-monolith-boss")?.points, 1);
assert.equal(catalog.proActivities.find((item) => item.id === "pro-silo")?.points, 1);
assert.equal(catalog.proActivities.find((item) => item.id === "pro-war")?.points, 2);
assert.equal(catalog.proActivities.find((item) => item.id === "dream-zone-invasion")?.points, 1);
assert.deepEqual(
  ["dreamer-light", "dreamer-deep", "dreamer-eternal"].map((id) => catalog.proActivities.find((item) => item.id === id)?.points),
  [1, 1, 1],
);
assert.equal(catalog.boxTargetPoints, 956);
assert.equal(catalog.visions.find((vision) => vision.id === "gravity")?.activities.find((item) => item.id === "gravity-whale")?.points, 1);
assert.equal(catalog.visions.find((vision) => vision.id === "gravity")?.activities.find((item) => item.id === "gravity-platforms")?.points, 4);
assert.equal(catalog.visions.find((vision) => vision.id === "symbiosis")?.enabled, false);
assert.ok(catalog.visions.find((vision) => vision.id === "symbiosis")?.activities.every((item) => item.points === 0 && !item.enabled));

const settings: Settings = {
  selectedVisionId: "gravity",
  waitMinutes: 30,
  activeMinutes: 30,
  phase: "waiting",
  phaseStartedAt: "2026-09-10T10:00:00.000Z",
  overlayEnabled: true,
  notificationsEnabled: true,
  voiceNotificationsEnabled: true,
  voiceLeadMinutes: 5,
  timingPresetVersion: 3,
  autoStartEnabled: true,
};
assert.deepEqual(computeCycle(settings, Date.parse("2026-09-10T10:15:00.000Z")).phase, "waiting");
assert.deepEqual(computeCycle(settings, Date.parse("2026-09-10T10:40:00.000Z")).phase, "active");
assert.deepEqual(computeCycle(settings, Date.parse("2026-09-10T11:10:00.000Z")).phase, "waiting");
const synchronizedSettings = { ...settings, phaseStartedAt: VISION_CYCLE_WAIT_STARTED_AT };
const synchronizedStart = computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT));
assert.equal(synchronizedStart.phase, "waiting");
assert.equal(synchronizedStart.remainingMs, 30 * 60_000);
const synchronizedSnapshot = computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 3 * 60_000);
assert.equal(synchronizedSnapshot.phase, "waiting");
assert.equal(synchronizedSnapshot.remainingMs, 27 * 60_000);
assert.equal(computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 30 * 60_000).phase, "active");
assert.equal(computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 60 * 60_000).phase, "waiting");

const actions: PointAction[] = [
  { id: "1", activityId: "gravity-whale", activityName: "Ballena", visionId: "gravity", visionName: "Gravedad", points: 1, occurredAt: "2026-09-10T10:00:00Z" },
  { id: "2", activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", visionName: "Gravedad", points: 4, occurredAt: "2026-09-10T10:05:00Z" },
  { id: "3", activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", visionName: "Gravedad", points: 4, occurredAt: "2026-09-10T10:10:00Z" },
];
assert.deepEqual(buildBreakdown(actions), [
  { name: "Gravedad · Plataformas", count: 2, points: 8 },
  { name: "Gravedad · Ballena", count: 1, points: 1 },
]);

const boxes: BoxRecord[] = [8, 12, 20].map((points, index) => ({ id: String(index), occurredAt: new Date().toISOString(), points, claims: points, breakdown: [] }));
const statistics = boxStatistics(boxes, 5, []);
assert.equal(statistics.minimum, 8);
assert.equal(statistics.maximum, 20);
assert.equal(Number(statistics.average.toFixed(2)), 13.33);
assert.ok(statistics.perPointPercent > 0 && statistics.currentChancePercent > 0);

const baseline = boxStatistics([], 0);
assert.equal(BASELINE_BOX_POINTS.reduce((sum, points) => sum + points, 0), 15_288);
assert.equal(baseline.count, 16);
assert.equal(baseline.minimum, 320);
assert.equal(baseline.maximum, 1_447);
assert.equal(baseline.average, 955.5);
assert.equal(baseline.median, 997);
assert.equal(baseline.lowerAverage, 704.875);
assert.equal(baseline.upperAverage, 1_206.125);

assert.deepEqual(parseManualBaseline("762, 966\n1143; no-valido 0 -4 10001"), [762, 966, 1_143]);
const extendedBaseline = boxStatistics([], 0, [...BASELINE_BOX_POINTS, 500]);
assert.equal(extendedBaseline.count, 17);
assert.equal(extendedBaseline.baselineCount, 17);

const platformActions: PointAction[] = [
  { id: "old", activityId: "pro-silo", activityName: "Silo", points: 1, occurredAt: "2026-09-10T10:00:00.000Z" },
  { id: "new-1", activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", visionName: "Gravedad", points: 4, occurredAt: "2026-09-10T10:10:00.000Z" },
  { id: "new-2", activityId: "gravity-whale", activityName: "Ballena", visionId: "gravity", visionName: "Gravedad", points: 1, occurredAt: "2026-09-10T10:30:00.000Z" },
];
const platformSplit = splitPlatformCarryover(platformActions, Date.parse("2026-09-10T11:05:00.000Z"), 60);
assert.deepEqual(platformSplit.completedAttempt.map((action) => action.id), ["old"]);
assert.deepEqual(platformSplit.carryOver.map((action) => action.id), ["new-1", "new-2"]);

console.log(JSON.stringify({ catalog: "OK", cycle: "OK", points: "OK", statistics: "OK", baseline: "OK", platformCarryover: "OK" }));
