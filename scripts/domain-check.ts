import assert from "node:assert/strict";
import catalog from "../catalog/visions.json" with { type: "json" };
import { boxStatistics, buildBreakdown, computeCycle, validateCatalog, type BoxRecord, type PointAction, type Settings } from "../src/model.ts";

assert.equal(validateCatalog(catalog), true, "El catálogo incluido debe ser válido.");
assert.equal(catalog.proActivities.find((item) => item.id === "pro-monolith-boss")?.points, 1);
assert.equal(catalog.proActivities.find((item) => item.id === "pro-silo")?.points, 1);
assert.equal(catalog.proActivities.find((item) => item.id === "pro-war")?.points, 2);
assert.equal(catalog.visions.find((vision) => vision.id === "gravity")?.activities.find((item) => item.id === "gravity-whale")?.points, 1);
assert.equal(catalog.visions.find((vision) => vision.id === "gravity")?.activities.find((item) => item.id === "gravity-platforms")?.points, 4);
assert.equal(catalog.visions.find((vision) => vision.id === "symbiosis")?.enabled, false);
assert.ok(catalog.visions.find((vision) => vision.id === "symbiosis")?.activities.every((item) => item.points === 0 && !item.enabled));

const settings: Settings = {
  selectedVisionId: "gravity",
  waitMinutes: 60,
  activeMinutes: 30,
  phase: "waiting",
  phaseStartedAt: "2026-09-10T10:00:00.000Z",
  overlayEnabled: true,
  notificationsEnabled: true,
  autoStartEnabled: true,
  ownerMode: false,
};
assert.deepEqual(computeCycle(settings, Date.parse("2026-09-10T10:30:00.000Z")).phase, "waiting");
assert.deepEqual(computeCycle(settings, Date.parse("2026-09-10T11:10:00.000Z")).phase, "active");
assert.deepEqual(computeCycle(settings, Date.parse("2026-09-10T11:40:00.000Z")).phase, "waiting");

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
const statistics = boxStatistics(boxes, 5);
assert.equal(statistics.minimum, 8);
assert.equal(statistics.maximum, 20);
assert.equal(Number(statistics.average.toFixed(2)), 13.33);
assert.ok(statistics.perPointPercent > 0 && statistics.currentChancePercent > 0);

console.log(JSON.stringify({ catalog: "OK", cycle: "OK", points: "OK", statistics: "OK" }));
