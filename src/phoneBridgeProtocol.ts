import { completeLocalSyncAddress, isValidLocalSyncAddress, localSyncTargetAddressSpace, splitLocalSyncAddress } from "./localSyncAddress.ts";

const MAX_RESPONSE_BYTES = 18 * 1024 * 1024;
async function readPhoneResponse(response: Response, english: boolean): Promise<unknown> {
  const tooLarge = () => new Error(english ? "Phone response is too large." : "La respuesta del celular supera el tamaño permitido.");
  if (Number(response.headers.get("Content-Length")) > MAX_RESPONSE_BYTES) throw tooLarge();
  if (!response.body) throw new Error(english ? "Empty phone response." : "El celular devolvió una respuesta vacía.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw tooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export type PhoneBridgeSnapshot = { revision: number; updatedAt: string; dataJson: string; catalogJson?: string; connectedDevices?: string[]; lastMobileUpdateAt?: number };
export type PhoneBridgeInfo = { address: string; port: number; pairingCode: string; revision: number };
export function validPhoneBridgeAddress(address: string) {
  if (!isValidLocalSyncAddress(address)) return false;
  const [a, b] = splitLocalSyncAddress(address).octets.map(Number);
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}
export async function exchangeWithPhone(address: string, code: string, action: "live" | "push", snapshot: Pick<PhoneBridgeSnapshot, "updatedAt" | "dataJson">, revision: number, english: boolean, signal?: AbortSignal): Promise<PhoneBridgeSnapshot> {
  if (!validPhoneBridgeAddress(address) || !/^\d{6}$/.test(code)) throw new Error(english ? "Enter the phone IP, port, and six-digit code." : "Completa la IP, el puerto y los seis números del celular.");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const init: RequestInit & { targetAddressSpace: "loopback" | "local" } = {
      method: "POST", mode: "cors", cache: "no-store", credentials: "omit",
      headers: { "Content-Type": "text/plain;charset=UTF-8" }, signal: controller.signal,
      targetAddressSpace: localSyncTargetAddressSpace(address),
      body: JSON.stringify({ protocol: 2, clientKind: "web", pairingCode: code, action, knownRevision: revision, ...snapshot }),
    };
    const response = await fetch(`http://${completeLocalSyncAddress(address)!.address}/sync`, init);
    const value = await readPhoneResponse(response, english) as PhoneBridgeSnapshot & { ok: boolean; message: string };
    if (!value || typeof value !== "object") throw new Error(english ? "Incomplete phone response." : "El celular devolvió una respuesta incompleta.");
    if (!response.ok || !value.ok) throw new Error(value.message || `HTTP ${response.status}`);
    if (!Number.isSafeInteger(value.revision) || value.revision < 1 || !Number.isFinite(Date.parse(value.updatedAt)) || typeof value.dataJson !== "string" || value.dataJson.length > 8 * 1024 * 1024) throw new Error(english ? "Incomplete phone response." : "El celular devolvió una respuesta incompleta.");
    const data = JSON.parse(value.dataJson);
    if (!data || typeof data !== "object" || Array.isArray(data) || !["actions", "activityHistory", "boxes", "shinyMods", "characters"].every(key => Array.isArray(data[key]))) throw new Error(english ? "Incomplete phone history." : "El historial recibido está incompleto.");
    if (value.catalogJson !== undefined && (typeof value.catalogJson !== "string" || value.catalogJson.length > 512 * 1024)) throw new Error(english ? "Invalid event catalog." : "El catálogo recibido no es válido.");
    if (value.connectedDevices !== undefined && (!Array.isArray(value.connectedDevices) || !value.connectedDevices.every(kind => ["pc", "web", "mobile"].includes(kind)))) throw new Error(english ? "Invalid device list." : "La lista de dispositivos no es válida.");
    return value;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) {
      throw new Error(english ? "Phone not found. Keep Sharing with web active in Android, use the same Wi-Fi and allow local network access in your browser." : "No se encontró el celular. Mantén «Compartir con la web» activo en Android, usa la misma Wi-Fi y permite la red local en el navegador.");
    }
    throw error;
  } finally { clearTimeout(timeout); signal?.removeEventListener("abort", cancel); }
}
