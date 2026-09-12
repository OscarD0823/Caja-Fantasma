import assert from "node:assert/strict";
import catalog from "../catalog/visions.json" with { type: "json" };
import { BASELINE_BOX_POINTS, DEFAULT_CHARACTER_ID, VISION_CYCLE_WAIT_STARTED_AT, actionsForCharacter, actionsForTeamSession, boxStatistics, buildBreakdown, computeCountdownTransition, computeCycle, computeGravityWhale, createInitialCharacterTracking, detachCharacterFromActions, formatCompactDuration, overlayVisionName, parseManualBaseline, resolveTransitionDelayMilliseconds, sharedVisionId, shouldShowGravityWhale, splitPlatformCarryover, validateCatalog, type BoxRecord, type PointAction, type Settings } from "../src/model.ts";
import { SHINY_MOD_CATALOG, SHINY_MOD_CATALOG_META, SHINY_MOD_GROUPS, matchesModSearch, normalizeModSearch } from "../src/shinyModsCatalog.ts";

const freshState = { ...createInitialCharacterTracking(Date.parse("2026-09-11T00:00:00Z")), actions: [] as PointAction[] };
assert.equal(freshState.trackingMode, "solo", "La aplicación debe iniciar en Solitario.");
assert.equal(freshState.characters.length, 1);
assert.equal(actionsForTeamSession(freshState.actions, freshState.activeTeamSessionId).length, 0, "El conteo inicial de Equipo debe empezar en cero.");

assert.equal(validateCatalog(catalog), true, "El catálogo incluido debe ser válido.");
assert.equal(sharedVisionId(catalog), catalog.eventTiming.selectedVisionId, "La rueda pública debe ser la que eligió el administrador.");
assert.equal(catalog.visions.find((vision) => vision.id === sharedVisionId(catalog))?.enabled, true, "La rueda pública no puede estar desactivada.");
const invalidDisabledSelection = structuredClone(catalog);
invalidDisabledSelection.visions.find((vision) => vision.id === "lunar")!.enabled = true;
invalidDisabledSelection.visions.find((vision) => vision.id === invalidDisabledSelection.eventTiming.selectedVisionId)!.enabled = false;
assert.equal(validateCatalog(invalidDisabledSelection), false, "El administrador no puede publicar como actual una rueda desactivada.");
assert.equal(sharedVisionId(invalidDisabledSelection), "lunar", "Si una copia antigua apunta a una rueda desactivada debe usar la primera habilitada.");
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
  overlayScale: 1,
  overlayAddonScale: 1,
  overlayShape: "event",
  overlayCounterStyle: "digital",
  overlayNameMode: "spanish",
  overlayCustomName: "",
  transitionDelayMilliseconds: 3_000,
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
const transitionStart = computeCountdownTransition(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 60 * 60_000);
assert.equal(transitionStart.active, true);
assert.equal(transitionStart.remainingMs, 3_000);
assert.equal(computeCountdownTransition(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 60 * 60_000 + 3_001).active, false);
assert.equal(resolveTransitionDelayMilliseconds({ transitionDelayMilliseconds: 2_750 }), 2_750);
assert.equal(resolveTransitionDelayMilliseconds({ transitionDelaySeconds: 2.75 }), 2_750, "Los catálogos anteriores deben migrar su retraso a milisegundos.");
assert.equal(computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 60 * 60_000 + 3_001).remainingMs, 30 * 60_000 - 3_001, "El retraso visual no debe mover el ciclo real.");
assert.equal(computeCycle(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 24 * 60 * 60_000).phase, "waiting", "El ciclo absoluto debe avanzar aunque el PC haya estado apagado.");
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 44 * 60_000), false);
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 45 * 60_000), true);
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 65 * 60_000), true);
assert.equal(shouldShowGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 65 * 60_000 + 1), false);
const whaleArrival = computeGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 45 * 60_000);
assert.equal(whaleArrival.visible, true);
assert.equal(whaleArrival.remainingMs, 20 * 60_000, "El rayo debe comenzar con los 15 minutos restantes del evento más 5 minutos adicionales.");
assert.equal(computeGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 60 * 60_000).remainingMs, 5 * 60_000);
const whaleDeparture = computeGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 65 * 60_000);
assert.equal(whaleDeparture.departing, true);
assert.equal(computeGravityWhale(synchronizedSettings, Date.parse(VISION_CYCLE_WAIT_STARTED_AT) + 65 * 60_000 + 4_001).visible, false);
const gravityVision = catalog.visions.find((vision) => vision.id === "gravity");
assert.equal(overlayVisionName(gravityVision, "spanish"), "Abismo de Gravedad");
assert.equal(overlayVisionName(gravityVision, "english"), "Gravity Abyss");
assert.equal(overlayVisionName(gravityVision, "custom", "Mi rueda azul"), "Mi rueda azul");
assert.equal(overlayVisionName(gravityVision, "custom", "  "), "Abismo de Gravedad");
assert.equal(catalog.visions.find((vision) => vision.id === "lunar")?.name, "Lunar");
assert.equal(catalog.visions.find((vision) => vision.id === "lunar")?.englishName, "Lunar Revelry");
assert.equal(catalog.visions.find((vision) => vision.id === "symbiosis")?.englishName, "Aberrant Progeny");
assert.equal(formatCompactDuration(17 * 60_000 + 8_000), "17m 08s");

const actions: PointAction[] = [
  { id: "1", activityId: "gravity-whale", activityName: "Ballena", visionId: "gravity", visionName: "Gravedad", points: 1, occurredAt: "2026-09-10T10:00:00Z" },
  { id: "2", activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", visionName: "Gravedad", points: 4, occurredAt: "2026-09-10T10:05:00Z" },
  { id: "3", activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", visionName: "Gravedad", points: 4, occurredAt: "2026-09-10T10:10:00Z" },
];
assert.deepEqual(buildBreakdown(actions), [
  { name: "Gravedad · Plataformas", count: 2, points: 8 },
  { name: "Gravedad · Ballena", count: 1, points: 1 },
]);
assert.equal(actionsForCharacter(actions, DEFAULT_CHARACTER_ID).length, 3, "Los registros anteriores deben migrar al personaje principal.");

const teamActions: PointAction[] = [
  { id: "team-1", activityId: "pro-silo", activityName: "Silo", points: 1, occurredAt: "2026-09-10T12:00:00Z", characterIds: ["alpha", "beta"], trackingMode: "team", teamSessionId: "session-a" },
  { id: "solo-alpha", activityId: "pro-war", activityName: "Guerra Pro", points: 2, occurredAt: "2026-09-10T12:05:00Z", characterIds: ["alpha"], trackingMode: "solo" },
];
assert.equal(actionsForCharacter(teamActions, "alpha").reduce((sum, action) => sum + action.points, 0), 3);
assert.equal(actionsForCharacter(teamActions, "beta").reduce((sum, action) => sum + action.points, 0), 1);
assert.equal(actionsForTeamSession(teamActions, "session-a").length, 1);
const afterAlphaBox = detachCharacterFromActions(teamActions, "alpha", new Set(["team-1", "solo-alpha"]));
assert.equal(actionsForCharacter(afterAlphaBox, "alpha").length, 0);
assert.equal(actionsForCharacter(afterAlphaBox, "beta").length, 1, "Cerrar la caja de un personaje no debe quitar puntos a sus compañeros.");
assert.equal(actionsForTeamSession(afterAlphaBox, "session-a").length, 1, "El conteo del equipo debe conservarse aunque un integrante cierre su caja.");

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
assert.equal(rushHourNormal?.levelLabel, "Nivel 0–17");
assert.equal(rushHourShiny?.name, "Hora punta <Estrella descendente>");
assert.equal(rushHourShiny?.levelLabel, "Brillante");
assert.equal(SHINY_MOD_CATALOG.every((item) => item.levelLabel === (item.isCatalogShiny ? "Brillante" : "Nivel 0–17")), true);
assert.equal(matchesModSearch(rushHourNormal!, normalizeModSearch("19500542")), true);
assert.equal(matchesModSearch(rushHourNormal!, normalizeModSearch("hora punta estrella descendente")), true);
assert.equal(normalizeModSearch("Vórtice de escarcha"), "vortice de escarcha");

console.log(JSON.stringify({ catalog: "OK", cycle: "OK", points: "OK", statistics: "OK", baseline: "OK", platformCarryover: "OK", shinyMods: "OK" }));
