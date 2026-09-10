import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const commands = [
  resolve(root, "node_modules/typescript/bin/tsc"),
  resolve(root, "node_modules/vite/bin/vite.js"),
];

for (const [index, script] of commands.entries()) {
  const args = index === 0 ? [] : ["build"];
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
