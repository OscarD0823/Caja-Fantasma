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

// A mechanical still of the SAME assembled model as the opening/counter.
// This fixture never mounts App, storage, personal data or the device bridge.
const root = resolve(import.meta.dirname, "..");
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
    if (!source) throw new Error(`Missing chest geometry: ${name}`);
    return load(source);
  };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}
const Opening = load(join(root, "src/CrateOpeningArt.tsx")).default;
const { ShinyModuleMark } = load(join(root, "src/GameLogoMark.tsx"));
const art = renderToStaticMarkup(createElement("div", { className: "emblem-scene intro-preview", style: { "--intro-preview-time": 3200 } }, createElement(Opening, { keyMark: createElement(ShinyModuleMark) })), { identifierPrefix: "emblem-source-" });
const temporary = mkdtempSync(join(tmpdir(), "caja-fantasma-emblem-model-"));
const html = join(temporary, "chest-model.html"), png = join(temporary, "chest-model.png");
writeFileSync(html, `<!doctype html><html><meta charset="utf-8"><style>
${readFileSync(join(root, "src/crateOpening.css"), "utf8")}
*{box-sizing:border-box}html,body{margin:0;width:1024px;height:1024px;background:transparent;overflow:hidden}body{display:grid;place-items:center}.emblem-scene{position:relative;width:420px;height:360px;transform:translateY(-20px) scale(2.5)}
.vault-anomaly-orbits,.vault-ground-radar,.vault-sequence,.vault-release-shock,.vault-motes,.vault-energy-column,.vault-spirit-aperture,.vault-key-ring{display:none}
.vault-key{box-shadow:inset 0 0 0 2px #90eacf40,0 2px 0 #04232c}
</style>${art}</html>`);
const browser = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (!existsSync(browser)) throw new Error("Necesitas el motor local de Edge para regenerar el icono desde el modelo.");
execFileSync(browser, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--hide-scrollbars", "--default-background-color=00000000", `--user-data-dir=${join(temporary, "isolated-render-profile")}`, "--window-size=1024,1024", `--screenshot=${png}`, pathToFileURL(html).href], { timeout: 60000, stdio: "pipe", windowsHide: true });
const deadline = Date.now() + 15000;
let data;
while (Date.now() < deadline) {
  if (existsSync(png)) {
    const candidate = readFileSync(png);
    if (candidate.subarray(-8, -4).toString("ascii") === "IEND") { data = candidate; break; }
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (!data) throw new Error("El renderizador no completó el icono del cofre.");
if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || data.readUInt32BE(16) !== 1024 || data.readUInt32BE(20) !== 1024 || data[25] !== 6) throw new Error("La imagen del cofre debe ser PNG RGBA de 1024 × 1024.");
copyFileSync(png, join(root, "src/assets/chest-emblem.png"));
const dependencies = ["src/CrateOpeningArt.tsx", "src/ChestRelief.tsx", "src/ChestMaterials.tsx", "src/crateOpening.css", "src/GameLogoMark.tsx", "scripts/render-chest-emblem.mjs"];
const digest = path => createHash("sha256").update(path.endsWith(".png") ? readFileSync(join(root, path)) : readFileSync(join(root, path), "utf8").replaceAll("\r\n", "\n")).digest("hex");
writeFileSync(join(root, "src/assets/chest-emblem.render.json"), JSON.stringify({ width: 1024, height: 1024, atMs: 3200, sha256: digest("src/assets/chest-emblem.png"), sources: Object.fromEntries(dependencies.map(path => [path, digest(path)])) }, null, 2) + "\n");
console.log(`Cofre generado desde la geometría real: ${png}`);
