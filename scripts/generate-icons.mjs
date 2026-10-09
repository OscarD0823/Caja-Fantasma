import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mechanically render the same 3D chest, then package it for every platform.
const root = resolve(import.meta.dirname, "..");
execFileSync(process.execPath, [join(root, "scripts/render-chest-emblem.mjs")], { cwd: root, stdio: "inherit", windowsHide: true });
const source = join(root, "src-tauri/icons/source.svg");
// The same original chest + module drives the interface and all installed icons.
const componentPath = join(root, "src/GameLogoMark.tsx");
const componentCache = new Map();
function loadComponent(path) {
  if (extname(path) === ".png") return { default: `data:image/png;base64,${readFileSync(path).toString("base64")}` };
  if (componentCache.has(path)) return componentCache.get(path).exports;
  const componentModule = { exports: {} };
  componentCache.set(path, componentModule);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const require = name => {
    if (!name.startsWith(".")) return createRequire(path)(name);
    const base = resolve(dirname(path), name);
    const source = extname(base) ? base : [base + ".tsx", base + ".ts"].find(existsSync);
    if (!source) throw new Error(`Missing icon material source: ${name}`);
    return loadComponent(source);
  };
  new Function("require", "module", "exports", compiled)(require, componentModule, componentModule.exports);
  return componentModule.exports;
}
const emblem = renderToStaticMarkup(createElement(loadComponent(componentPath).default));
const emblemArtwork = emblem.slice(emblem.indexOf(">") + 1, emblem.lastIndexOf("</svg>"));
writeFileSync(source, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="app-background" cx=".35" cy=".22"><stop stop-color="#25434c"/><stop offset="1" stop-color="#07131e"/></radialGradient></defs><rect width="512" height="512" rx="106" fill="#06111b"/><rect x="12" y="12" width="488" height="488" rx="95" fill="url(#app-background)" stroke="#6b8c89" stroke-width="2"/><g transform="translate(16 16) scale(3.75)">${emblemArtwork}</g></svg>\n`);
const cli = join(root, "node_modules/@tauri-apps/cli/tauri.js");
const temporary = mkdtempSync(join(tmpdir(), "caja-fantasma-icons-"));
const run = (args) => execFileSync(process.execPath, [cli, "icon", ...args], { cwd: root, stdio: "inherit" });
run([source]);
run([source, "--output", temporary, "--png", "32,192,512"]);
for (const size of [192, 512]) copyFileSync(join(temporary, `${size}x${size}.png`), join(root, `public/icons/app-${size}.png`));
copyFileSync(join(temporary, "32x32.png"), join(root, "public/favicon.png"));
const svg = readFileSync(source, "utf8");
const artwork = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
const maskable = join(root, "public/icons/maskable.svg");
writeFileSync(maskable, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 640 640"><rect x="-64" y="-64" width="640" height="640" fill="#07131e"/>${artwork}</svg>\n`);
run([maskable, "--output", join(temporary, "maskable"), "--png", "512"]);
copyFileSync(join(temporary, "maskable/512x512.png"), join(root, "public/icons/app-maskable-512.png"));
console.log("Icons generated from original source: Windows, Android, web and maskable.");
