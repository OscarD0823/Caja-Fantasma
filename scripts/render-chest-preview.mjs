import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// A generated, read-only artwork fixture, not App: no points, personal storage,
// pairing, network requests or existing browser profile are opened by this QA.
const root = resolve(import.meta.dirname, "..");
const modules = new Map();
function load(path) {
  if (extname(path) === ".png") return { default: `data:image/png;base64,${readFileSync(path).toString("base64")}` };
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} }; modules.set(path, module);
  const compiled = ts.transpileModule(readFileSync(path, "utf8").replaceAll("import.meta.env.DEV", "true"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const require = name => {
    if (!name.startsWith(".")) return createRequire(path)(name);
    const base = resolve(dirname(path), name);
    const source = extname(base) ? base : [base + ".tsx", base + ".ts"].find(existsSync);
    if (!source) throw new Error(`Missing preview dependency: ${name}`);
    return load(source);
  };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}
const { default: Emblem, ShinyModuleMark, GhostMark } = load(join(root, "src/GameLogoMark.tsx"));
const Opening = load(join(root, "src/CrateOpeningArt.tsx")).default;
const Counter = load(join(root, "src/CounterChestArt.tsx")).default;
let artworkInstance = 0;
const markup = node => renderToStaticMarkup(node, { identifierPrefix: `qa-chest-${artworkInstance++}-` });
const chest = (at, detail = "full") => markup(createElement("div", { className: "art-scene intro-preview", style: { "--intro-preview-time": at } }, createElement(Opening, { detail, keyMark: createElement(ShinyModuleMark), ghostMark: createElement(GhostMark) })));
const emblem = markup(createElement(Emblem));
const counter = markup(createElement(Counter, { previewAtMs: 9600, value: 506 }));
const reference = `data:image/webp;base64,${readFileSync(join(root, "src/assets/phantom-crate-reference.webp")).toString("base64")}`;
const output = mkdtempSync(join(tmpdir(), "caja-fantasma-chest-design-"));
const closeup = process.argv.includes("--detail");
const mobile = process.argv.includes("--mobile");
const html = join(output, closeup ? "chest-detail.html" : "chest-comparison.html");
const image = join(output, closeup ? "chest-detail.png" : "chest-comparison.png");
writeFileSync(html, `<!doctype html><html lang="es"><meta charset="utf-8"><title>Comparación del cofre · Caja Fantasma</title><style>
${readFileSync(join(root, "src/crateOpening.css"), "utf8")}
${readFileSync(join(root, "src/chestChoreography.css"), "utf8")}
${readFileSync(join(root, "src/chestPerformance.css"), "utf8")}
*{box-sizing:border-box}body{margin:0;background:#07121b;color:#dae9e7;font:14px 'Segoe UI',sans-serif}main{padding:32px}h1{margin:0 0 8px;font-size:27px}p{color:#9faead;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}section{border:1px solid #405054;border-radius:18px;background:linear-gradient(145deg,#172832,#0b1821);padding:18px;overflow:hidden}h2{font-size:16px;margin:0;color:#d4bc8c}.reference{width:100%;height:350px;object-fit:contain}.art-scene{position:relative;width:420px;height:350px;left:calc(50% - 210px)}.art-scene .opening-vault{transform:scale(.86);transform-origin:50% 65%}.vault-anomaly-orbits,.vault-ground-radar,.vault-sequence,.vault-release-shock,.vault-motes{display:none}.emblem-display{display:flex;align-items:center;justify-content:space-evenly;height:245px}.emblem-display>svg{width:180px;height:180px}.small-emblem{width:48px;height:48px}.small-emblem svg{width:100%;height:100%}.counter-display{position:relative;height:170px}.counter-display .counter-chest{top:0;right:calc(50% - 88px)}.chest-charge-ring,.chest-reward-response{display:none}.caption{color:#a3b8bd;font-size:12px;padding-top:8px;margin:0}.art-scene .vault-spirit-aperture{top:-105px}.footer{margin-top:20px;color:#83989f;font-size:12px}
section:nth-of-type(n+5) .art-scene .opening-vault{transform:translateY(38px) scale(.76)}
.closeup .grid{grid-template-columns:1.35fr 1fr}.closeup section{height:635px}.closeup .art-scene{width:600px;height:550px;left:calc(50% - 300px)}.closeup .art-scene .opening-vault{transform:scale(1.35);transform-origin:50% 65%}.closeup .emblem-display{height:550px}.closeup .emblem-display>svg{width:320px;height:320px}
</style><main class="${closeup ? "closeup" : ""}"><h1>Cofre · metal, armadura y luz</h1><p>${closeup ? "Acero cepillado, bronce envejecido, juntas, tornillos hexagonales y desgaste en los cantos." : "Misma referencia de la portada, reinterpretada con piezas reales para conservar la apertura."}</p><div class="grid">
${mobile ? `
<section><h2>Antes · cerrado</h2>${chest(3200)}</section><section><h2>Móvil ligero · cerrado</h2>${chest(3200, "light")}</section><section><h2>Contador ligero</h2><div class="counter-display">${counter}</div></section>
<section><h2>Antes · tapa abierta</h2>${chest(5400)}</section><section><h2>Móvil ligero · tapa abierta</h2>${chest(5400, "light")}</section><section><h2>Ligero · fantasma se retira</h2>${chest(7300, "light")}</section>
` : closeup ? `<section><h2>Relieve y acabado metálico · vista ampliada</h2>${chest(3200)}<p class="caption">Herrajes gruesos · placas mecanizadas · canales de energía</p></section><section><h2>Icono obtenido del mismo modelo</h2><div class="emblem-display">${emblem}</div><p class="caption">Misma geometría · misma perspectiva · módulo encajado</p></section>` : `
<section><h2>Referencia de la página principal</h2><img class="reference" src="${reference}" alt="Cofre metálico de referencia"><p class="caption">Bronce grueso · acero gastado · cristal central</p></section>
<section><h2>Apertura · tapa en movimiento</h2>${chest(3700)}<p class="caption">Piezas ensambladas, módulo encajado y bisagras reales</p></section>
<section><h2>Icono y cofre del contador</h2><div class="emblem-display">${emblem}<span class="small-emblem">${emblem.replaceAll('emblem-', 'small-emblem-')}</span></div><div class="counter-display">${counter}</div></section>
<section><h2>Antes de abrir</h2>${chest(3200)}</section><section><h2>Fantasma saliendo</h2>${chest(5400)}</section><section><h2>Cofre abierto al final</h2>${chest(7300)}</section>
`}
</div><p class="footer">Vista aislada de diseño · no accede al historial ni a la sincronización.</p></main></html>`);
console.log(`Fixture: ${html}`);
const browser = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (!existsSync(browser)) throw new Error("El motor local de renderizado no está disponible; se conserva la vista HTML.");
const profile = join(output, "isolated-render-profile");
try {
  execFileSync(browser, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--hide-scrollbars", `--user-data-dir=${profile}`, closeup ? "--window-size=1280,860" : "--window-size=1320,1100", `--screenshot=${image}`, pathToFileURL(html).href], { timeout: 60000, stdio: "pipe", windowsHide: true });
} catch (error) {
  if (!existsSync(image)) throw error;
}
const deadline = Date.now() + 15000;
while (!existsSync(image) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
if (!existsSync(image)) throw new Error("No se generó la comparación visual.");
console.log(`Screenshot: ${image}`);
