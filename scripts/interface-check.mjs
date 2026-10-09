import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFile(resolve(root, file), "utf8");
const loadComponent = async (file) => {
  const module = { exports: {} };
  const compiled = ts.transpileModule(await read(file), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("require", "module", "exports", compiled)(createRequire(resolve(root, file)), module, module.exports);
  return module.exports.default;
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
assert(crate.includes("vault-roof-plate") && crate.includes("vault-reward-module") && crate.includes("ghostMark"));
const Opening = await loadComponent("src/CrateOpeningArt.tsx");
const openingArt = renderToStaticMarkup(createElement("div", null, createElement(Opening, { keyMark: createElement(Emblem) }), createElement(Opening, { keyMark: createElement(Emblem) })));
const openingIds = [...openingArt.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(openingIds.length, new Set(openingIds).size, "Multiple chests need isolated material/clip IDs.");
assert.equal((openingArt.match(/class="vault-roof-plate"/g) ?? []).length, 16, "Each lid is assembled from eight physical plates.");
const commandArity = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
for (const [, path] of openingArt.matchAll(/\bd="([^"]+)"/g)) {
  for (const [, command, coordinates] of path.matchAll(/([a-df-z])([^a-df-z]*)/gi)) {
    const arity = commandArity[command.toLowerCase()];
    const numbers = coordinates.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? [];
    assert(arity === 0 ? numbers.length === 0 : numbers.length >= arity && numbers.length % arity === 0, `Malformed ${command} coordinates: ${path}`);
  }
}
const openingStyles = await read("src/crateOpening.css");
assert(openingStyles.includes(".startup-intro *, .startup-intro *::before, .startup-intro *::after { animation: none !important; }"), "Reduced motion must win the opening cascade.");
const readme = await read("README.md");
assert(readme.includes("https://github.com/OscarD0823/Caja-Fantasma/releases/latest"));
assert(readme.includes("https://oscard0823.github.io/Caja-Fantasma/"));
assert(readme.includes("no un producto oficial") && readme.includes("recursos de terceros"));
assert(readme.includes("GUIA-TECNICA.md"));
console.log("Interface OK: real-presence states, unique emblems, reduced motion, assembled opening and practical downloads/disclaimer.");
