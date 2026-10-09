import assert from "node:assert/strict";
import { exchangeWithPhone, validPhoneBridgeAddress } from "../src/phoneBridgeProtocol.ts";
import { createPhoneBridgeLifecycle } from "../src/phoneBridgeLifecycle.ts";

for (const address of ["192.168.1.20:47183", "10.0.0.4", "172.16.0.5:47184", "127.0.0.1:47183", "169.254.3.1:47183"]) assert(validPhoneBridgeAddress(address));
for (const address of ["8.8.8.8:47183", "172.32.0.1", "192.168.1.256", "192.168.1.2:0", "192.168.1.2:65536", "https://evil.example", "127.0.0.1@evil.example"]) assert(!validPhoneBridgeAddress(address));
const snapshot = { updatedAt: "2026-10-08T23:00:00.000Z", dataJson: JSON.stringify({ actions: [], activityHistory: [], boxes: [], pointRounds: [], shinyMods: [], characters: [], deletedActionIds: [] }) };
const canonical = { ok: true, revision: 4, ...snapshot, catalogJson: "{}", connectedDevices: ["mobile", "web"] };
const originalFetch = globalThis.fetch;
let calls = 0;
let response: () => Response = () => Response.json(canonical);
globalThis.fetch = async (url, init) => {
  calls++;
  assert.equal(url, "http://192.168.1.20:47183/sync");
  assert.equal(init?.credentials, "omit");
  const data = JSON.parse(String(init?.body));
  assert.equal(data.protocol, 2);
  assert.equal(data.clientKind, "web");
  assert.equal(data.pairingCode, "123456");
  assert.deepEqual(JSON.parse(data.dataJson), JSON.parse(snapshot.dataJson));
  return response();
};
try {
  const result = await exchangeWithPhone("192.168.1.20", "123456", "live", snapshot, 3, false);
  assert.deepEqual(result.connectedDevices, ["mobile", "web"]);
  await assert.rejects(exchangeWithPhone("8.8.8.8", "123456", "live", snapshot, 3, false), /IP/);
  await assert.rejects(exchangeWithPhone("192.168.1.20", "12345", "live", snapshot, 3, false), /seis/);
  assert.equal(calls, 1, "Bad addresses/codes must fail without network traffic.");
  for (const invalid of [null, { ...canonical, revision: 0 }, { ...canonical, updatedAt: "invalid" }, { ...canonical, dataJson: "{}" }, { ...canonical, catalogJson: [] }, { ...canonical, connectedDevices: ["unknown"] }]) {
    response = () => Response.json(invalid);
    await assert.rejects(exchangeWithPhone("192.168.1.20", "123456", "live", snapshot, 3, false));
  }
  response = () => Response.json({ ok: false, message: "Código incorrecto" }, { status: 400 });
  await assert.rejects(exchangeWithPhone("192.168.1.20", "123456", "live", snapshot, 3, false), /Código incorrecto/);
  response = () => new Response("{}", { headers: { "Content-Length": String(20 * 1024 * 1024) } });
  await assert.rejects(exchangeWithPhone("192.168.1.20", "123456", "live", snapshot, 3, false), /tamaño permitido/);
  const cancelled = new AbortController();
  cancelled.abort();
  globalThis.fetch = async (_url, init) => {
    assert(init?.signal?.aborted, "Disconnect must cancel the HTTP request as well as its polling timer.");
    throw new DOMException("Cancelled", "AbortError");
  };
  await assert.rejects(exchangeWithPhone("192.168.1.20", "123456", "live", snapshot, 3, false, cancelled.signal), /No se encontró el celular/);
} finally { globalThis.fetch = originalFetch; }

const lifecycle = createPhoneBridgeLifecycle();
const order: string[] = [];
let release!: () => void;
const blocked = new Promise<void>(resolve => { release = resolve; });
const starting = lifecycle.run(async () => { order.push("start"); await blocked; order.push("started"); });
const stopping = lifecycle.run(async () => { order.push("stop"); });
await Promise.resolve();
assert.deepEqual(order, ["start"]);
release();
await Promise.all([starting, stopping]);
assert.deepEqual(order, ["start", "started", "stop"], "Disconnect/unmount must run after a pending start, not before it.");
await assert.rejects(lifecycle.run(async () => { throw new Error("cannot bind"); }), /cannot bind/);
await lifecycle.run(async () => { order.push("retry"); });
assert.equal(order.at(-1), "retry", "A failed start must not block a later stop/retry.");
console.log("Phone bridge OK: LAN addresses, six-digit codes, protocol 2, bounded/validated replies, ordered start/stop.");
