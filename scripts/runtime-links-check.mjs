import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = (await readFile(resolve(root, "src-tauri/src/lib.rs"), "utf8")).replace(/\r\n/g, "\n");
const mobile = source.slice(source.indexOf("#[cfg(mobile)]\n"));
assert(mobile.includes(".plugin(tauri_plugin_opener::init())"), "Android must register opener at runtime, not just include its dependency.");
const desktop = source.slice(source.indexOf("#[cfg(desktop)]\npub fn run()"), source.indexOf("#[cfg(mobile)]\n"));
assert(desktop.includes(".plugin(tauri_plugin_opener::init())"), "Windows must also register opener.");
assert(desktop.includes(".plugin(tauri_plugin_single_instance::init("), "Windows must reject duplicate instances.");
assert(desktop.indexOf(".plugin(tauri_plugin_single_instance::init(") < desktop.indexOf(".plugin(\n"), "Single-instance must register before autostart or other plugins.");
assert(desktop.includes("single_instance::should_reveal_main(&args)"), "Duplicate background starts must not steal focus.");
assert(!mobile.includes("tauri_plugin_single_instance"), "Desktop instance locking must not be registered on Android.");
for (const platform of ["default", "android"]) {
  const capabilities = JSON.parse(await readFile(resolve(root, `src-tauri/capabilities/${platform}.json`), "utf8"));
  assert(capabilities.permissions.includes("opener:default"), `${platform} must allow opening external URLs.`);
}
console.log("Runtime OK: external links on Windows/Android, desktop single-instance first and background-safe relaunch.");
