import assert from "node:assert/strict";
import catalog from "../catalog/visions.json" with { type: "json" };
import { BASELINE_BOX_POINTS, VISION_CYCLE_WAIT_STARTED_AT, boxStatistics, buildBreakdown, computeCycle, parseManualBaseline, shouldShowGravityWhale, splitPlatformCarryover, validateCatalog, type BoxRecord, type PointAction, type Settings } from "../src/model.ts";
import { SHINY_MOD_CATALOG, SHINY_MOD_CATALOG_META, SHINY_MOD_GROUPS, matchesModSearch, normalizeModSearch } from "../src/shinyModsCatalog.ts";

assert.equal(validateCatalog(catalog), true, "El catálogo incluido debe ser válido.");
for (const id of ["pro-monolith-boss", "pro-silo", "dream-manibus-challenge", "pro-war", "manibus-manibus", "dream-zone-invasion", "dreamer-light", "dreamer-deep", "dreamer-eternal"]) {
  assert.ok(catalog.proActivities.some((item) => item.id === id), `Falta la recompensa editable ${id}.`);
}
for (const visionId of ["lunar", "gravity", "symbiosis"]) {
  assert.ok(catalog.visions.some((vision) => vision.id === visionId), `Falta la rueda editable ${visionId}.`);
}
assert.ok(catalog.boxTargetPoints >= 1 && catalog.boxTargetPoints <= 10_000);
assert.ok(catalog.proActivities.every((item) => item.points >= 0 && item.points <= 1_000));
assert.ok(catalog.visions.flatMap((vision) => vision.activities).every((item) => item.points >= 0 && item.points <= 1_000));

const settings: Settings = {
  selectedVisionId: "gravity",
  waitMinutes: 30,
  activeMinutes: 30,
  phase: "waiting",
  phaseStartedAt: "2026-09-10T10:00:00.000Z",
  overlayEnabled: true,
  notificationsEnabled: false,
  voiceNotificationsEnabled: true,
  voiceLeadMinutes: 5,
  timingPresetVersion: 4,
  autoStartEnabled: true,
  dataResetVersion: 1,
  sharedTimingUpdatedAt: "2026-09-10T21:52:30.000Z",
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
assert.equal(computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 24 * 60 * 60_000).phase, "waiting", "El ciclo absoluto debe avanzar aunque el PC haya estado apagado.");
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 44 * 60_000), false);
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 45 * 60_000), true);
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 65 * 60_000), true);
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 65 * 60_000 + 1), false);

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

assert.equal(SHINY_MOD_CATALOG.length, 1_825, "El catálogo debe contener los 1.825 registros exactos.");
assert.deepEqual(SHINY_MOD_CATALOG_META, {
  sourceUrl: "https://wikily.gg/es-la/once-human/mods/",
  sourceCheckedAt: SHINY_MOD_CATALOG_META.sourceCheckedAt,
  total: 1_825,
  legacy: 207,
  normal: 809,
  shiny: 809,
});
assert.equal(SHINY_MOD_CATALOG.filter((item) => item.system === "legacy").length, 207);
assert.equal(SHINY_MOD_CATALOG.filter((item) => item.system === "new" && !item.isCatalogShiny).length, 809);
assert.equal(SHINY_MOD_CATALOG.filter((item) => item.system === "new" && item.isCatalogShiny).length, 809);
assert.equal(new Set(SHINY_MOD_CATALOG.map((item) => item.id)).size, SHINY_MOD_CATALOG.length);
assert.ok(SHINY_MOD_GROUPS.filter((item) => item.category === "weapon").length >= 9);
const rushHourNormal = SHINY_MOD_CATALOG.find((item) => item.englishName === "Rush Hour <Downstar>" && !item.isCatalogShiny);
const rushHourShiny = SHINY_MOD_CATALOG.find((item) => item.englishName === "Rush Hour <Downstar>" && item.isCatalogShiny);
assert.equal(rushHourNormal?.name, "Hora punta <Estrella descendente>");
assert.equal(rushHourNormal?.variant, "Estrella Descendente");
assert.equal(rushHourNormal?.levelLabel, "Nivel 1–17");
assert.equal(rushHourShiny?.name, "Hora punta <Estrella descendente>");
assert.equal(rushHourShiny?.levelLabel, "Nivel 17 brillante");
assert.equal(matchesModSearch(rushHourNormal!, normalizeModSearch("19500542")), true);
assert.equal(matchesModSearch(rushHourNormal!, normalizeModSearch("hora punta estrella descendente")), true);
assert.equal(normalizeModSearch("Vórtice de escarcha"), "vortice de escarcha");

console.log(JSON.stringify({ catalog: "OK", cycle: "OK", points: "OK", statistics: "OK", baseline: "OK", platformCarryover: "OK", shinyMods: "OK" }));
