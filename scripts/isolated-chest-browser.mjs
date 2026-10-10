import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Only our freshly created headless profile. Never attaches to user tabs. */
export async function withChestBrowser(profile, width, height, action) {
  const browser = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-extensions", "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore", windowsHide: true });
  let socket, call;
  const requests = new Map(), handlers = new Map(); let sequence = 0;
  try {
    const activePort = join(profile, "DevToolsActivePort"), deadline = Date.now() + 20000;
    while (!existsSync(activePort) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    if (!existsSync(activePort)) throw new Error("El renderizador aislado no inició.");
    const port = Number(readFileSync(activePort, "utf8").split("\n")[0]);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) { const request = requests.get(message.id); if (request) { clearTimeout(request.timeout); requests.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); } }
      if (message.method) handlers.get(message.method)?.(message.params);
    });
    call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence, timeout = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      requests.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
    });
    await call("Page.enable");
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    return await action(call, (event, handler) => handlers.set(event, handler));
  } finally {
    if (call && socket?.readyState === WebSocket.OPEN) { try { await call("Browser.close"); } catch { /* The browser may close before replying. */ } }
    for (const request of requests.values()) { clearTimeout(request.timeout); request.reject(new Error("Renderizador cerrado.")); }
    socket?.close(); if (browser.exitCode === null) browser.kill();
  }
}
