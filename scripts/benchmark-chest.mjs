import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Isolated, synthetic renderer benchmark: no App, user profile, progress or LAN.
// CPU throttling is a comparison aid, not a measurement of a physical phone.
const root = resolve(import.meta.dirname, ".."), modules = new Map();
function load(path) {
  if (extname(path) === ".png") return { default: `data:image/png;base64,${readFileSync(path).toString("base64")}` };
  if (modules.has(path)) return modules.get(path).exports;
  const module = { exports: {} }; modules.set(path, module);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const require = name => {
    if (!name.startsWith(".")) return createRequire(path)(name);
    const base = resolve(dirname(path), name);
    return load(extname(base) ? base : [base + ".tsx", base + ".ts"].find(existsSync));
  };
  new Function("require", "module", "exports", compiled)(require, module, module.exports);
  return module.exports;
}
const Opening = load(join(root, "src/CrateOpeningArt.tsx")).default;
const { GhostMark, ShinyModuleMark } = load(join(root, "src/GameLogoMark.tsx"));
const css = ["styles", "crateOpening", "interface", "refinement", "chestChoreography", "chestPerformance"].map(name => readFileSync(join(root, `src/${name}.css`), "utf8")).join("\n");
const output = mkdtempSync(join(tmpdir(), "caja-fantasma-chest-benchmark-")), profile = join(output, "isolated-profile");
for (const detail of ["full", "light"]) {
  const scene = renderToStaticMarkup(createElement(Opening, { detail, compact: true, keyMark: createElement(ShinyModuleMark), ghostMark: createElement(GhostMark) }));
  writeFileSync(join(output, `${detail}.html`), `<!doctype html><html data-chest-detail="light"><meta charset="utf-8"><style>${css}\nhtml,body{margin:0;width:390px;height:844px;background:#07121b;overflow:hidden}.counter-fixture{position:relative;height:210px;margin-top:100px}.counter-fixture .counter-chest{top:0;right:120px;width:104px;height:118px}.counter-chest-scene{transform:scale(.27)}</style><div class="counter-fixture"><div class="ghost-orbit counter-chest"><span class="counter-chest-scene">${scene}</span></div></div></html>`);
}
const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--window-size=390,844", "about:blank"], { stdio: "ignore", windowsHide: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, closeBrowser;
try {
  const activePort = join(profile, "DevToolsActivePort"), deadline = Date.now() + 20000;
  while (!existsSync(activePort) && Date.now() < deadline) await pause(100);
  if (!existsSync(activePort)) throw new Error("El navegador de pruebas no inició.");
  const port = Number(readFileSync(activePort, "utf8").split("\n")[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  const requests = new Map(); let sequence = 0, layers = [], maxLayers = 0;
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) { const request = requests.get(message.id); if (request) { clearTimeout(request.timeout); requests.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); } }
    if (message.method === "LayerTree.layerTreeDidChange") { layers = message.params.layers ?? []; maxLayers = Math.max(maxLayers, layers.length); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timeout = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    requests.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
  });
  closeBrowser = () => call("Browser.close");
  await call("Page.enable"); await call("LayerTree.enable"); await call("Performance.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await call("Emulation.setCPUThrottlingRate", { rate: 4 });
  const results = [];
  for (const detail of ["full", "light"]) {
    maxLayers = 0; layers = [];
    await call("Page.navigate", { url: pathToFileURL(join(output, `${detail}.html`)).href });
    await pause(600);
    maxLayers = layers.length;
    const before = (await call("Performance.getMetrics")).metrics;
    // Test-only frame sampling; the shipped artwork has no per-frame JS loop.
    const { result } = await call("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `new Promise(resolve=>{const gaps=[];let last=0,start=0;function sample(t){if(!start)start=t;if(last)gaps.push(t-last);last=t;if(t-start<2500)requestAnimationFrame(sample);else resolve({nodes:document.querySelectorAll('*').length,frames:gaps.length,lateFrames:gaps.filter(gap=>gap>25).length,meanFrameMs:gaps.reduce((a,b)=>a+b,0)/gaps.length});}requestAnimationFrame(sample);})` });
    assert(result.value?.frames > 0, "El navegador debe producir fotogramas reales.");
    const after = (await call("Performance.getMetrics")).metrics;
    const delta = name => (after.find(metric => metric.name === name)?.value ?? 0) - (before.find(metric => metric.name === name)?.value ?? 0);
    results.push({ detail, ...result.value, maxLayers, drawingLayers: layers.filter(layer => layer.drawsContent).length, taskMs: Math.round(delta("TaskDuration") * 1000), layoutMs: Math.round(delta("LayoutDuration") * 1000), styleMs: Math.round(delta("RecalcStyleDuration") * 1000) });
    const screenshot = await call("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(output, `${detail}.png`), Buffer.from(screenshot.data, "base64"));
  }
  const report = { fixture: "counter at 390 × 844, CPU ×4, isolated desktop renderer (not physical Android)", results };
  writeFileSync(join(output, "result.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2)); console.log(`Resultados: ${output}`);
  assert(results[1].nodes < results[0].nodes * .15);
  if (results[0].maxLayers > 0 && results[1].maxLayers > 0) assert(results[1].maxLayers < results[0].maxLayers * .5, "La versión ligera debe reducir las capas de composición al menos a la mitad.");
  else console.log("Este motor headless no informa de capas GPU; se conserva la comparación de DOM y fotogramas.");
} finally {
  if (closeBrowser && socket?.readyState === WebSocket.OPEN) { try { await closeBrowser(); } catch { /* Browser may close before replying. */ } }
  socket?.close(); if (browser.exitCode === null) browser.kill();
}
