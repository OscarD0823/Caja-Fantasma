import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Static finishes of our own geometry, not photographs or animation frames.
// Six surfaces share one 1024px atlas (2x), retaining real moving box/lid planes.
// The isolated renderer never mounts App, storage or synchronization.
const root = resolve(import.meta.dirname, "..");
const chestStyles = readFileSync(join(root, "src/crateOpening.css"), "utf8");
const gold = chestStyles.match(/--vault-gold: ([^;]+);/)?.[1];
if (!gold) throw new Error("El acabado de los herrajes no está definido.");
const modules = new Map();
function load(path) {
  if (extname(path) === ".png") return { default: pathToFileURL(path).href };
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} }; modules.set(path, module);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const require = name => {
    if (!name.startsWith(".")) return createRequire(path)(name);
    const base = resolve(dirname(path), name);
    const source = extname(base) ? base : [base + ".tsx", base + ".ts"].find(existsSync);
    if (!source) throw new Error(`Missing chest surface source: ${name}`);
    return load(source);
  };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}
const { default: Opening, Metalwork, VaultedLid } = load(join(root, "src/CrateOpeningArt.tsx"));
const fixtures = [
  ["front", 0, 0, createElement(Opening, { detail: "full", keyMark: null })],
  ["side", 600, 0, createElement(Opening, { detail: "full", keyMark: null })],
  ["end", 600, 360, createElement(Metalwork, { side: true, lid: true })],
  ["roof", 0, 360, createElement(VaultedLid)],
  ["underside", 0, 680, createElement(VaultedLid)],
  ["latch", 600, 464, createElement(VaultedLid)],
].map(([name, left, top, child]) => renderToStaticMarkup(createElement("div", { className: `surface-fixture fixture-${name}`, style: { left, top } }, child), { identifierPrefix: `${name}-surface-` })).join("");
const temporary = mkdtempSync(join(tmpdir(), "caja-fantasma-chest-surfaces-"));
const html = join(temporary, "surfaces.html"), png = join(temporary, "surfaces.png");
writeFileSync(html, `<!doctype html><html><meta charset="utf-8"><style>
${chestStyles}
*{box-sizing:border-box;animation:none!important;transition:none!important}
html,body{margin:0;width:1024px;height:1024px;background:transparent;overflow:hidden}
.surface-fixture{position:absolute;width:300px;height:180px;transform:scale(2);transform-origin:0 0;--vault-gold:${gold}}
.fixture-side,.fixture-end{width:160px}.fixture-end{height:52px}.fixture-roof{height:160px}.fixture-underside{height:160px}.fixture-latch{width:64px;height:51px}
.surface-fixture .opening-vault{perspective:none}
.surface-fixture .vault-camera{transform:none}
.surface-fixture .vault-solid{top:0;left:0;margin:0}
.surface-fixture .opening-vault> :not(.vault-camera),.surface-fixture .vault-camera> :not(.vault-solid){display:none}
.fixture-front .vault-solid> :not(.vault-front),.fixture-side .vault-solid> :not(.vault-right){display:none}
.surface-fixture .vault-front,.surface-fixture .vault-right{left:0;transform:none}
.fixture-front .vault-key-port,.fixture-front .vault-clasp,.fixture-front .vault-lock-bolts,.fixture-front .vault-status-leds{display:none}
.fixture-roof> :not(.vault-roof-plate),.fixture-underside> :not(.vault-lid-underside),.fixture-latch> :not(.vault-lid-latch){display:none}
.fixture-underside .vault-lid-underside,.fixture-latch .vault-lid-latch{left:0;top:0;transform:none}
.fixture-underside .vault-lid-underside{border:0;border-radius:0}
.fixture-roof .vault-roof-plate{height:20px!important;transform:none!important}
.fixture-roof .vault-roof-band{height:20px;bottom:auto}
.fixture-roof .vault-band-cap{transform:none}
.fixture-roof .vault-band-wall{display:none}
</style>${fixtures}<script>document.querySelectorAll('.fixture-roof .vault-roof-plate').forEach((plate,index)=>plate.style.top=index*20+'px');</script></html>`);
const browser = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (!existsSync(browser)) throw new Error("Necesitas el motor local de Edge para regenerar los acabados del cofre.");
execFileSync(browser, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--hide-scrollbars", "--default-background-color=00000000", `--user-data-dir=${join(temporary, "isolated-render-profile")}`, "--window-size=1024,1024", `--screenshot=${png}`, pathToFileURL(html).href], { timeout: 60000, stdio: "pipe", windowsHide: true });
// Edge's launcher can exit before its renderer completes the screenshot.
const deadline = Date.now() + 15000;
let data;
while (Date.now() < deadline) {
  if (existsSync(png)) {
    const candidate = readFileSync(png);
    if (candidate.subarray(-8, -4).toString("ascii") === "IEND") { data = candidate; break; }
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (!data) throw new Error("El renderizador no completó la textura del cofre.");
if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || data.readUInt32BE(16) !== 1024 || data.readUInt32BE(20) !== 1024 || data[25] !== 6) throw new Error("Los acabados deben ser PNG RGBA de 1024 × 1024.");
copyFileSync(png, join(root, "src/assets/chest-surfaces.png"));
const dependencies = ["src/CrateOpeningArt.tsx", "src/ChestRelief.tsx", "src/ChestMaterials.tsx", "src/crateOpening.css", "scripts/render-chest-surfaces.mjs"];
const digest = path => createHash("sha256").update(readFileSync(join(root, path), "utf8").replaceAll("\r\n", "\n")).digest("hex");
writeFileSync(join(root, "src/assets/chest-surfaces.render.json"), JSON.stringify({ width: 1024, height: 1024, sha256: createHash("sha256").update(data).digest("hex"), sources: Object.fromEntries(dependencies.map(path => [path, digest(path)])) }, null, 2) + "\n");
console.log(`Acabados del cofre generados (${data.length} bytes): ${png}`);
