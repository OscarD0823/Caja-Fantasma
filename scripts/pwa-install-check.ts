import assert from "node:assert/strict";
import { createPwaInstaller, pwaInstallGuide, type InstallPrompt, type PwaInstallStatus } from "../src/pwaInstall.ts";

const changes: PwaInstallStatus[] = [];
const installer = createPwaInstaller((status) => changes.push(status));
const offer = (outcome: "accepted" | "dismissed", prompt: () => Promise<void> = async () => {}) => Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
  prompt, userChoice: Promise.resolve({ outcome }),
}) as InstallPrompt;

assert.equal(await installer.install(), false);
installer.capture(new Event("beforeinstallprompt"));
assert.equal(installer.snapshot().available, false, "Ignore unsupported browser events");
const first = offer("accepted");
installer.capture(first);
assert(first.defaultPrevented);
assert(installer.snapshot().available);
assert.equal(await installer.install(), true);
assert.equal(installer.snapshot().installed, false, "Acceptance is not proof of completed installation");
assert.equal(await installer.install(), false, "An install prompt is single-use");
installer.complete();
assert(installer.snapshot().installed);
installer.capture(offer("accepted"));
assert.equal(installer.snapshot().available, false, "Hide offers once installed");

const cancelled = createPwaInstaller(() => {});
cancelled.capture(offer("dismissed"));
assert.equal(await cancelled.install(), false);
assert.deepEqual(cancelled.snapshot(), { available: false, installed: false, installing: false, failed: false });

const broken = createPwaInstaller(() => {});
broken.capture(offer("accepted", async () => { throw new Error("prompt unavailable"); }));
assert.equal(await broken.install(), false, "Browser errors must not escape into the app");
assert.deepEqual(broken.snapshot(), { available: false, installed: false, installing: false, failed: true });
broken.capture(offer("accepted"));
assert.equal(broken.snapshot().failed, false, "A new offer permits a fresh attempt");

let releasePrompt!: () => void;
let prompts = 0;
const locked = createPwaInstaller(() => {});
locked.capture(offer("accepted", () => {
  prompts++;
  return new Promise<void>((resolve) => { releasePrompt = resolve; });
}));
const pending = locked.install();
assert(locked.snapshot().installing);
assert.equal(await locked.install(), false, "Banner and Devices must share the same install lock");
locked.capture(offer("accepted"));
releasePrompt();
assert.equal(await pending, true);
assert.equal(prompts, 1);
assert.equal(locked.snapshot().available, false, "Ignore new offers while a prompt is pending");
assert.equal(locked.snapshot().installing, false);

const standalone = createPwaInstaller(() => {}, true);
standalone.capture(offer("accepted"));
assert(standalone.snapshot().installed);
assert.equal(await standalone.install(), false);
assert(changes.length > 0);
assert.equal(pwaInstallGuide("Mozilla Android Chrome").platform, "android");
assert.equal(pwaInstallGuide("Mozilla iPhone Safari").platform, "ios");
assert.equal(pwaInstallGuide("Mozilla iPad Safari").platform, "ios");
assert.equal(pwaInstallGuide("Mozilla Macintosh Safari", "MacIntel", 5).platform, "ios", "Detect iPad desktop user agents");
assert.equal(pwaInstallGuide("Mozilla Macintosh Safari", "MacIntel").platform, "safari-mac");
assert.equal(pwaInstallGuide("Mozilla Macintosh Chrome Safari").platform, "desktop");
assert.equal(pwaInstallGuide("Mozilla Windows Edg").platform, "desktop");
console.log("PWA install OK: single-use prompts, shared lock, cancellation, fallback, standalone and platform guides");
