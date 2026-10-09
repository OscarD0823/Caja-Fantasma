import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mechanical asset generation: one original SVG drives Windows, Android and PWA.
const root = resolve(import.meta.dirname, "..");
const source = join(root, "src-tauri/icons/source.svg");
// The same original chest + module drives the interface and all installed icons.
const componentPath = join(root, "src/GameLogoMark.tsx");
const componentModule = { exports: {} };
const compiled = ts.transpileModule(readFileSync(componentPath, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
new Function("require", "module", "exports", compiled)(createRequire(componentPath), componentModule, componentModule.exports);
const emblem = renderToStaticMarkup(createElement(componentModule.exports.default));
const emblemArtwork = emblem.slice(emblem.indexOf(">") + 1, emblem.lastIndexOf("</svg>"));
writeFileSync(source, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><radialGradient id="app-background" cx=".35" cy=".2"><stop stop-color="#335c64"/><stop offset="1" stop-color="#07131e"/></radialGradient></defs><rect width="512" height="512" rx="106" fill="#07131e"/><rect x="17" y="17" width="478" height="478" rx="91" fill="url(#app-background)" stroke="#a9c4b4" stroke-width="3"/><path d="M87 66h70M66 88v69m359-91h-70m91 22v69M87 446h70M66 424v-69m359 91h-70m91-22v-69" fill="none" stroke="#d8b57f" stroke-width="5"/><g transform="translate(48 39) scale(3.25)">${emblemArtwork}</g></svg>\n`);
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
