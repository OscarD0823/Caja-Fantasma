import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageInfo = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const tauriInfo = JSON.parse(await readFile(resolve(root, "src-tauri/tauri.conf.json"), "utf8"));
assert.equal(tauriInfo.version, packageInfo.version, "Windows, Android and web must publish the same version.");
assert((await readFile(resolve(root, "src/model.ts"), "utf8")).includes(`export const APP_VERSION = "${packageInfo.version}";`));
assert((await readFile(resolve(root, "src-tauri/Cargo.toml"), "utf8")).includes(`version = "${packageInfo.version}"`));
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
const androidUpdater = await readFile(resolve(root, "plugins/android-updater/src/lib.rs"), "utf8");
const androidStatus = await readFile(resolve(root, "plugins/android-updater/src/background_status.rs"), "utf8");
const androidService = await readFile(resolve(root, "plugins/android-updater/android/src/main/java/BackgroundSyncService.kt"), "utf8");
assert(androidUpdater.includes("pub use background_status::BackgroundSyncStatus;"), "The mobile bridge must use the tested status wire format.");
assert(androidStatus.includes("pub connected_devices: Vec<String>"), "Rust must retain device presence from Kotlin.");
assert(androidService.includes('"connectedDevices"'), "Android must include the full device list in background status.");
const app = await readFile(resolve(root, "src/App.tsx"), "utf8");
assert(app.includes("background.connectedDevices?.length"), "Frontend must consume mobile presence, with a legacy fallback.");
const overlay = await readFile(resolve(root, "src/Overlay.tsx"), "utf8");
assert(!overlay.includes("saveState("), "The overlay must never overwrite personal progress with cached data.");
assert(app.includes("if (personalRestoreReady) saveState(state)"), "Startup must hydrate before persisting a stale cache.");
console.log("Runtime OK: external links, single-instance, mobile presence wire format, hydration and read-only overlay.");
