import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname, extname } from "node:path";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFile(resolve(root, file), "utf8");
const loadComponent = async (file, exportName = "default") => {
  const cache = new Map();
  const load = path => {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} }; cache.set(path, module);
    const compiled = ts.transpileModule(readFileSync(path, "utf8").replaceAll("import.meta.env.DEV", "false"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
    const require = name => {
      if (!name.startsWith(".")) return createRequire(path)(name);
      const base = resolve(dirname(path), name);
      const source = extname(base) ? base : [base + ".tsx", base + ".ts"].find(existsSync);
      if (!source) throw new Error(`Missing test module: ${name}`);
      return load(source);
    };
    new Function("require", "module", "exports", compiled)(require, module, module.exports);
    return module.exports;
  };
  return load(resolve(root, file))[exportName];
};
const Presence = await loadComponent("src/DevicePresenceStrip.tsx");
const renderPresence = (online) => renderToStaticMarkup(createElement(Presence, { online, current: "pc" }));
assert.equal((renderPresence(["pc"]).match(/device-node connected/g) ?? []).length, 1);
assert.equal((renderPresence(["pc", "web", "mobile"]).match(/device-node connected/g) ?? []).length, 3);
assert.equal((renderPresence([]).match(/device-node connected/g) ?? []).length, 0);
assert(renderPresence([]).includes("PC: este dispositivo · sin emparejar"));
assert(renderPresence(["pc"]).includes("Móvil: sin conexión reciente"));
const mobilePresence = renderToStaticMarkup(createElement(Presence, { online: ["pc", "web", "mobile"], current: "mobile" }));
assert(mobilePresence.includes('device-node connected current'), "The mobile instance must mark its own real connection.");
assert(mobilePresence.includes("Web: conectado"), "A web heartbeat received by Android must show Web connected, not offline.");
assert.equal((mobilePresence.match(/device-node connected/g) ?? []).length, 3);
const Emblem = await loadComponent("src/GameLogoMark.tsx");
const emblems = renderToStaticMarkup(createElement("div", null, createElement(Emblem), createElement(Emblem)));
const ids = [...emblems.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, "Repeated emblems must not share gradient IDs.");
assert(emblems.includes('viewBox="0 0 128 128"'));
const Ghost = await loadComponent("src/GameLogoMark.tsx", "GhostMark");
const ghost = renderToStaticMarkup(createElement(Ghost));
assert(ghost.includes("spirit-carry-arm") && ghost.includes("spirit-tail") && ghost.includes("spirit-head") && ghost.includes("spirit-eyes"));
const Progress = await loadComponent("src/RewardProgressBar.tsx");
for (const [points, expected, state] of [[-5, 0, "empty"], [187, 187, "energized"], [1250, 1000, "charged"]]) {
  const bar = renderToStaticMarkup(createElement(Progress, { value: points, target: 1000, label: "Progreso" }));
  assert(bar.includes(`aria-valuenow="${expected}"`) && bar.includes(state));
  assert.equal(bar.includes("reward-energy-gain"), expected > 0);
}
assert(renderToStaticMarkup(createElement(Progress, { value: NaN, target: Infinity, label: "Progreso" })).includes('aria-valuenow="0"'));
const refinement = await read("src/refinement.css");
assert(refinement.includes(".progress-track .reward-energy-ticks"), "Decorative ticks must override the old span gradient, not visually fill an incomplete bar.");
const Probability = await loadComponent("src/ObservedProbability.tsx");
const estimate = renderToStaticMarkup(createElement(Probability, { count: 16, perPointPercent: .1, currentChancePercent: 18, tx: es => es }));
assert(estimate.includes("Frecuencia por punto") && estimate.includes("Estimación del intento actual"));
const zeroEstimate = renderToStaticMarkup(createElement(Probability, { count: 0, perPointPercent: 0, currentChancePercent: 0, tx: es => es }));
assert(zeroEstimate.includes("0 muestras") && !zeroEstimate.includes("0.000%"));
const Glyph = await loadComponent("src/ConsoleGlyph.tsx");
for (const section of ["progress", "characters", "vision", "devices", "history", "shiny", "changes", "settings"]) {
  const glyph = renderToStaticMarkup(createElement(Glyph, { section }));
  assert(glyph.includes("<path") && glyph.includes('aria-hidden="true"'), `${section} needs its own decorative glyph.`);
}
const styles = await read("src/interface.css");
assert(styles.includes(".device-presence .connected .device-orbit"));
assert(styles.includes("@media (prefers-reduced-motion: reduce)"));
assert(styles.includes("animation: none !important"));
assert(styles.includes(':root[data-app-hidden="true"]'), "Hidden surfaces must pause decorative motion.");
for (const theme of ["lunar", "gravity", "symbiosis"]) assert(styles.includes(`[data-event="${theme}"]`));
assert(styles.includes(".nav-symbol svg { display: block; }"), "Compact navigation must not hide the new symbols.");
const crate = await read("src/CrateOpeningArt.tsx");
assert.equal((crate.match(/className="vault-hologram"/g) ?? []).length, 1);
assert(crate.includes("vault-key-port") && crate.includes("vault-lid-hinge"));
assert(!crate.includes("<img"), "Opening geometry must not slice a reference photo.");
assert(crate.includes("vault-lock-bolts") && crate.includes("vault-ground-radar"));
assert(crate.includes("vault-roof-plate") && crate.includes("vault-spirit-aperture") && crate.includes("ghostMark"));
const Opening = await loadComponent("src/CrateOpeningArt.tsx");
const openingArt = renderToStaticMarkup(createElement("div", null, createElement(Opening, { keyMark: createElement(Emblem) }), createElement(Opening, { keyMark: createElement(Emblem) })));
const openingIds = [...openingArt.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(openingIds.length, new Set(openingIds).size, "Multiple chests need isolated material/clip IDs.");
assert.equal((openingArt.match(/class="vault-roof-plate"/g) ?? []).length, 16, "Each lid is assembled from eight physical plates.");
const commandArity = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
for (const [, path] of (openingArt + emblems + ghost).matchAll(/\bd="([^"]+)"/g)) {
  for (const [, command, coordinates] of path.matchAll(/([a-df-z])([^a-df-z]*)/gi)) {
    const arity = commandArity[command.toLowerCase()];
    const numbers = coordinates.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? [];
    assert(arity === 0 ? numbers.length === 0 : numbers.length >= arity && numbers.length % arity === 0, `Malformed ${command} coordinates: ${path}`);
  }
}
const openingStyles = await read("src/crateOpening.css");
assert(!crate.includes("moduleMark") && !crate.includes("vault-reward-module"), "The docking module stays with the chest, not the departing ghost.");
assert(openingStyles.includes("89%, 100% { opacity: 0; transform: translate(235px"), "The ghost must leave before the chest fades out.");
assert(openingStyles.includes("0%, 98% { opacity: 1; }"), "Leave the open chest visible alone at the end.");
assert(openingStyles.includes("counter-hinge-cycle") && openingStyles.includes("--vault-duration: 14s") && openingStyles.includes(".counter-chest *::after { animation: none !important"), "The mini chest needs a quiet repeat and reduced-motion support.");
const counter = await read("src/CounterChestArt.tsx");
assert(counter.includes("memo(function CounterChestArt") && counter.includes("<CrateOpeningArt compact") && !counter.includes("<img") && !counter.includes("setInterval"));
const app = await read("src/App.tsx");
assert(app.includes('<CrateOpeningArt keyMark={<ShinyModuleMark />}') && app.includes("<CounterChestArt value={currentPoints} target={target}") && !app.includes("PHANTOM_CRATE_IMAGE"));
assert(app.includes('(creatorAccess === "granted" || ownerEntryRequested) && <article className="owner-panel panel">'), "Visitors must not see the owner login panel by default.");
assert(app.includes('event.ctrlKey && event.altKey && event.shiftKey') && !app.includes("Suma lo que reclames"));
assert(openingStyles.includes(".startup-intro *, .startup-intro *::before, .startup-intro *::after { animation: none !important; }"), "Reduced motion must win the opening cascade.");
const readme = await read("README.md");
assert(readme.includes("https://github.com/OscarD0823/Caja-Fantasma/releases/latest"));
assert(readme.includes("https://oscard0823.github.io/Caja-Fantasma/"));
assert(readme.includes("no un producto oficial") && readme.includes("recursos de terceros"));
assert(readme.includes("GUIA-TECNICA.md"));
const platform = await loadComponent("src/runtimePlatform.ts", "runtimePlatform");
assert.equal(platform(false, "Mozilla Android"), "web");
assert.equal(platform(false, "Windows NT"), "web");
assert.equal(platform(true, "Mozilla Android"), "android");
assert.equal(platform(true, "Windows NT"), "windows");
const Phone = await loadComponent("src/PhoneBridgeSyncPanel.tsx");
const props = { bridge: { enabled: false, busy: false, online: [], message: "", live: true }, language: "es", address: "", code: "", onAddress() {}, onCode() {}, newCode() {} };
for (const mobile of [false, true]) {
  const phoneWeb = renderToStaticMarkup(createElement(Phone, { ...props, mobile, web: true }));
  const buttons = [...phoneWeb.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(match => match[1].replace(/<[^>]*>/g, ""));
  assert(buttons.includes("Conectar con el celular") && !buttons.includes("Compartir con la web"), "Every web surface, including Android browsers, must show the phone client.");
  assert(phoneWeb.includes("Código del celular"));
}
assert(renderToStaticMarkup(createElement(Phone, { ...props, mobile: true, web: false })).includes("Compartir con la web"));
const Tutorial = await loadComponent("src/AppTutorial.tsx");
const tour = renderToStaticMarkup(createElement(Tutorial, { language: "es", onClose() {}, onVisit() {} }));
assert(tour.includes('role="dialog"') && tour.includes("Registra tus recompensas") && tour.includes("Siguiente"));
const Update = await loadComponent("src/UpdateExperience.tsx");
for (const progress of [null, 72]) {
  const experience = renderToStaticMarkup(createElement(Update, { status: "downloading", progress, route: { current: "1.21.8", next: "1.22.0" }, language: "en", android: true, notes: "", error: "", dismiss() {}, install() {} }));
  assert(experience.includes("Updating Caja Fantasma") && experience.includes('role="progressbar"'));
  assert.equal(experience.includes("aria-valuenow"), progress !== null, "Unknown download progress must not invent a percentage.");
}
const Counter = await loadComponent("src/CounterChestArt.tsx");
const confirmation = renderToStaticMarkup(createElement(Update, { status: "confirming", progress: 100, route: { current: "1.21.8", next: "1.22.0" }, language: "en", android: true, notes: "", error: "", dismiss() {}, install() {} }));
assert(confirmation.includes("Verification") && !confirmation.includes(">Installation</li>"), "Opening Android's installer confirms verification, not that installation has finished.");
const charged = renderToStaticMarkup(createElement(Counter, { value: 187, target: 1000 }));
assert(charged.includes("chest-charge-ring") && charged.includes('aria-hidden="true"') && !charged.includes("puntos"));
console.log("Interface OK: real-presence states, unique emblems, reduced motion, assembled opening and practical downloads/disclaimer.");
