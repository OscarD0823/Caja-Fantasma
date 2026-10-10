import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

// Physical-device QA only. No install, reset, import, reward edits or sync push.
// The caller must make a fresh personal backup before the requested relaunch.
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const adb = option("--adb", `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`);
const connected = execFileSync(adb, ["devices"], { encoding: "utf8", timeout: 10000 }).split(/\r?\n/).flatMap(line => /^(\S+)\s+device$/.exec(line)?.[1] ?? []);
const serial = option("--serial", connected.length === 1 ? connected[0] : "");
if (!serial || !connected.includes(serial)) throw new Error("Select a connected phone with --serial");
const label = option("--label", "candidate");
if (!/^[a-zA-Z0-9-]+$/.test(label)) throw new Error("Invalid test label");
if (!args.includes("--output")) throw new Error("Select the private backup/diagnostic directory with --output");
const directory = resolve(option("--output"));
const backup = JSON.parse(readFileSync(join(directory, "respaldo-telefono-antes.json"), "utf8").replace(/^\uFEFF/, ""));
if (!backup.ok || !Array.isArray(JSON.parse(backup.dataJson).actions)) throw new Error("Personal backup required before relaunch");
mkdirSync(directory, { recursive: true });
const run = (...command) => execFileSync(adb, ["-s", serial, ...command], { encoding: "utf8", timeout: 25000 });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const diagnostics = { label, serial, captured: args.includes("--record"), at: new Date().toISOString(), samples: [] };
const capture = diagnostics.captured ? spawn(adb, ["-s", serial, "shell", "screenrecord", "--size", "720x1560", "--bit-rate", "3000000", "--time-limit", "18", `/data/local/tmp/caja-${label}.mp4`], { stdio: "pipe" }) : null;
const captureFinished = capture ? new Promise((resolve, reject) => { capture.on("error", reject); capture.on("exit", code => code === 0 ? resolve() : reject(new Error(`Recording failed: ${code}`))); }) : null;
if (capture) await pause(600);
diagnostics.launch = run("shell", "am", "start", "-S", "-W", "-n", "com.oscard0823.cajafantasma/.MainActivity");
for (let index = 0; index < 3; index++) {
  await pause(3000);
  diagnostics.samples.push(run("shell", "dumpsys", "meminfo", "com.oscard0823.cajafantasma"));
}
diagnostics.graphics = run("shell", "dumpsys", "gfxinfo", "com.oscard0823.cajafantasma");
// Keep this application's records only, not other apps' media history.
diagnostics.codecs = run("shell", "dumpsys", "media.metrics").split(/\r?\n/).filter(line => line.includes("com.oscard0823.cajafantasma")).join("\n");
writeFileSync(join(directory, `${label}-diagnostics.json`), JSON.stringify(diagnostics, null, 2));
if (capture) { await captureFinished; run("pull", `/data/local/tmp/caja-${label}.mp4`, join(directory, `${label}-opening.mp4`)); }
run("shell", "screencap", "-p", `/data/local/tmp/caja-${label}.png`);
run("pull", `/data/local/tmp/caja-${label}.png`, join(directory, `${label}-dashboard.png`));
console.log(JSON.stringify({ label, captured: diagnostics.captured, memory: diagnostics.samples.map(sample => sample.match(/TOTAL PSS:\s*\d+[^\n]*/)?.[0]), graphics: diagnostics.graphics.split("\n").filter(line => /Total frames rendered:|Janky frames:|percentile:/.test(line)).slice(0, 6), output: directory }, null, 2));
