import { spawn } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withChestBrowser } from "./isolated-chest-browser.mjs";

// Offline, deterministic recording of our ORIGINAL full-detail opening model.
// FFmpeg is a build tool only: neither its binary nor frame capture ships in App.
const root = resolve(import.meta.dirname, ".."), modules = new Map();
const argument = process.argv.indexOf("--ffmpeg"), ffmpeg = argument >= 0 ? process.argv[argument + 1] : process.env.CHEST_FFMPEG;
if (!ffmpeg || !existsSync(ffmpeg)) throw new Error("Indica un FFmpeg local con --ffmpeg <ruta> o CHEST_FFMPEG.");
function load(path) {
  if (extname(path) === ".png") return { default: pathToFileURL(path).href };
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
const fps = 60, durationMs = 7600, frameCount = Math.round(fps * durationMs / 1000), size = 640;
const markup = renderToStaticMarkup(createElement("div", { className: "video-scene" }, createElement(Opening, { detail: "full", keyMark: createElement(ShinyModuleMark), ghostMark: createElement(GhostMark) })));
const output = mkdtempSync(join(tmpdir(), "caja-fantasma-opening-video-")), html = join(output, "opening.html");
const styles = readFileSync(join(root, "src/crateOpening.css"), "utf8") + "\n" + readFileSync(join(root, "src/chestChoreography.css"), "utf8");
writeFileSync(html, `<!doctype html><html><meta charset="utf-8"><style>${styles}\n*{box-sizing:border-box}html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#030c13}.video-scene{position:absolute;width:420px;height:360px;left:110px;top:150px}.vault-sequence{display:none}</style>${markup}</html>`);
const video = join(root, "src/assets/chest-opening.mp4"), poster = join(root, "src/assets/chest-opening-poster.png");
const encoder = spawn(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-vcodec", "png", "-framerate", String(fps), "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-profile:v", "baseline", "-level:v", "3.1", "-g", String(fps), "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", video], { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] });
let encoderErrors = ""; encoder.stderr.on("data", chunk => { encoderErrors += chunk; });
const completed = once(encoder, "close");
encoder.stdin.on("error", () => undefined);
try {
  await withChestBrowser(join(output, "isolated-profile"), size, size, async call => {
    await call("Page.navigate", { url: pathToFileURL(html).href });
    // Seek paused animation objects directly instead of restarting CSS animations
    // with a changing negative delay. All authored particle/tail delays survive.
    await call("Runtime.evaluate", { awaitPromise: true, expression: "document.fonts.ready.then(async()=>{window.openingAnimations=document.getAnimations();for(const animation of openingAnimations){animation.pause();animation.currentTime=0;}await Promise.all(openingAnimations.map(animation=>animation.ready));})" });
    let previousHash, repeated = 0, maxRepeated = 0;
    for (let frame = 0; frame < frameCount; frame++) {
      await call("Runtime.evaluate", { awaitPromise: true, expression: `for(const animation of openingAnimations)animation.currentTime=${frame * 1000 / fps};document.querySelector('.vault-hologram').getBoundingClientRect();new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))` });
      const capture = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const png = Buffer.from(capture.data, "base64");
      if (frame === Math.round(3.2 * fps)) writeFileSync(poster, png);
      if (frame >= frameCount * .51 && frame <= frameCount * .87) {
        const hash = createHash("sha256").update(png).digest("hex");
        repeated = hash === previousHash ? repeated + 1 : 0;
        maxRepeated = Math.max(maxRepeated, repeated); previousHash = hash;
        if (repeated >= 3) throw new Error(`Fotogramas congelados durante la salida del fantasma: ${frame}`);
      }
      if (encoder.exitCode !== null || encoder.stdin.destroyed) throw new Error(`Error codificando: ${encoderErrors}`);
      if (!encoder.stdin.write(png)) await once(encoder.stdin, "drain");
      if (frame % fps === 0) console.log(`Apertura: ${frame}/${frameCount} fotogramas`);
    }
    console.log(`Movimiento continuo: máximo ${maxRepeated} fotogramas idénticos consecutivos durante la salida.`);
  });
  encoder.stdin.end(); const [code] = await completed;
  if (code !== 0) throw new Error(`Error codificando: ${encoderErrors}`);
} catch (error) { encoder.kill(); throw error; }
const digest = file => createHash("sha256").update(readFileSync(join(root, file), "utf8").replaceAll("\r\n", "\n")).digest("hex");
if (readFileSync(video).length >= 2000000) throw new Error("El vídeo supera el límite móvil de 2 MB.");
const dependencies = ["src/CrateOpeningArt.tsx", "src/ChestMaterials.tsx", "src/ChestRelief.tsx", "src/GameLogoMark.tsx", "src/crateOpening.css", "src/chestChoreography.css", "scripts/render-opening-video.mjs", "scripts/isolated-chest-browser.mjs"];
writeFileSync(join(root, "src/assets/chest-opening.render.json"), JSON.stringify({ width: size, height: size, fps, durationMs, frameCount, codec: "h264", profile: "baseline", audio: false, sha256: createHash("sha256").update(readFileSync(video)).digest("hex"), posterSha256: createHash("sha256").update(readFileSync(poster)).digest("hex"), sources: Object.fromEntries(dependencies.map(file => [file, digest(file)])) }, null, 2) + "\n");
console.log(`Vídeo listo: ${video} (${readFileSync(video).length} bytes)`);
