import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withChestBrowser } from "./isolated-chest-browser.mjs";

// Run against Vite's DEV-only interface harness, never the real App route.
const base = process.argv[2] ?? "http://127.0.0.1:1427/";
const url = new URL(base);
assert(["127.0.0.1", "localhost"].includes(url.hostname), "Playback QA must use an isolated local harness.");
url.searchParams.set("interface-visual-test", "");
const output = mkdtempSync(join(tmpdir(), "caja-fantasma-video-playback-"));
await withChestBrowser(join(output, "isolated-profile"), 390, 844, async (call, on) => {
  await call("Runtime.enable");
  on("Runtime.exceptionThrown", params => console.log("Fixture error:", params.exceptionDetails.exception?.description ?? params.exceptionDetails.text));
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, milliseconds = 15000) => {
    const deadline = Date.now() + milliseconds;
    while (Date.now() < deadline) {
      try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* Navigation may replace its execution context. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log("Fixture state:", await evaluate("({url:location.href,title:document.title,body:document.body.innerText.slice(0,400)})"));
    const snapshot = await call("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(output, "failure.png"), Buffer.from(snapshot.data, "base64"));
    console.log(`Diagnostic: ${join(output, "failure.png")}`);
    throw new Error(`Playback assertion timed out: ${expression}`);
  };
  const navigate = async preview => {
    url.searchParams.set("intro-preview", String(preview));
    await call("Page.navigate", { url: url.href });
    await waitFor("document.querySelector('.interface-visual-harness') && document.querySelector('.startup-intro')");
    assert((await evaluate("document.querySelector('h1').textContent")).includes("sin datos personales"));
  };
  await navigate(5400);
  await waitFor("document.querySelector('video')?.readyState >= 2 && Math.abs(document.querySelector('video').currentTime - 5.4) < .1");
  const paused = await evaluate("(()=>{const v=document.querySelector('video');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,paused:v.paused,muted:v.muted,inline:v.playsInline,loop:v.loop,models:document.querySelector('.startup-intro').querySelectorAll('.vault-solid').length}})()");
  assert.deepEqual(paused, { width: 640, height: 640, duration: 7.6, paused: true, muted: true, inline: true, loop: false, models: 0 });
  const screenshot = await call("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(output, "phone-opening.png"), Buffer.from(screenshot.data, "base64"));
  await navigate(0);
  await waitFor("document.querySelector('video')?.currentTime > .25 && !document.querySelector('video').paused");
  await evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");
  assert.equal(await evaluate("document.querySelector('video').paused"), true);
  await evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))");
  await waitFor("!document.querySelector('video').paused");
  await waitFor("!document.querySelector('.startup-intro')", 12000);
  assert.equal(await evaluate("document.documentElement.dataset.introActive ?? null"), null);
  await evaluate("document.querySelector('.counter-chest').scrollIntoView({block:'center'})");
  await waitFor("document.querySelector('.counter-chest').dataset.motionPaused === 'false'");
  await evaluate("window.chestQaNode=document.querySelector('.counter-chest-scene');document.querySelector('.progress-hero .hero-actions button.primary').click()");
  await waitFor("document.querySelector('.hero-copy h2').textContent.includes('287')");
  assert.equal(await evaluate("window.chestQaNode === document.querySelector('.counter-chest-scene')"), true);
  await evaluate("document.querySelector('.progress-hero').style.transform='translateX(-200vw)'");
  await waitFor("document.querySelector('.counter-chest').dataset.motionPaused === 'true'");
  await navigate(0);
  await waitFor("document.querySelector('video')");
  await evaluate("document.querySelector('video').dispatchEvent(new Event('error'))");
  await waitFor("document.querySelector('.intro-video-stage img') && !document.querySelector('.intro-video-stage video')");
  await waitFor("!document.querySelector('.startup-intro')", 4000);
  await call("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: false });
  await navigate(5400);
  await waitFor("document.querySelector('video')?.readyState >= 2 && Math.abs(document.querySelector('video').currentTime - 5.4) < .1");
  assert.equal(await evaluate("document.querySelector('.intro-video-stage').getBoundingClientRect().height <= innerHeight"), true);
  const landscape = await call("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(output, "phone-landscape-opening.png"), Buffer.from(landscape.data, "base64"));
  await call("Emulation.setDeviceMetricsOverride", { width: 1320, height: 850, deviceScaleFactor: 1, mobile: false });
  await navigate(5400);
  await waitFor("document.querySelector('video')?.readyState >= 2 && Math.abs(document.querySelector('video').currentTime - 5.4) < .1");
  assert.equal(await evaluate("(()=>{const r=document.querySelector('.intro-video-stage').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"), true);
  const desktop = await call("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(output, "desktop-opening.png"), Buffer.from(desktop.data, "base64"));
  await navigate(0);
  await waitFor("document.querySelector('video')?.currentTime > .25 && !document.querySelector('video').paused");
  await waitFor("!document.querySelector('.startup-intro')", 12000);
  await evaluate("document.querySelector('.counter-chest').scrollIntoView({block:'center'})");
  await waitFor("document.querySelector('.counter-chest').dataset.motionPaused === 'false'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.counter-chest .vault-hologram')).animationName"), "vault-spirit-flow");
  assert((await evaluate("document.querySelector('.counter-chest').querySelectorAll('*').length")) < 400);
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await navigate(5400);
  assert.equal(await evaluate("document.querySelectorAll('.intro-video-stage video').length"), 0);
  assert.equal(await evaluate("document.querySelectorAll('.intro-video-stage img').length"), 1);
  console.log("Opening playback OK: 640px/60fps MP4, phone portrait/landscape and 1320px desktop, actual playback, visibility pause/resume, completed intro, counter reuse/offscreen pause, continuous ghost flight, error fallback and reduced motion.");
  console.log(`Vista de teléfono: ${join(output, "phone-opening.png")}`);
});
