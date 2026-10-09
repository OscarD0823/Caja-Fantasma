/** Data-only LAN protocol. Signaling is exchanged by the user, not a cloud service. */
export const PEER_MAX_BYTES = 8 * 1024 * 1024;
export const PEER_CHUNK_BYTES = 16 * 1024;
const MAX_PAIRING_BYTES = 64 * 1024;
export type PeerKind = "pc" | "web" | "mobile";
export type PeerSnapshot = { protocol: 1; kind: PeerKind; updatedAt: string; dataJson: string };
export type PeerInvitation = { protocol: "cf-lan-1"; sessionId: string; createdAt: number; type: "offer" | "answer"; sdp: string };

function localCandidate(line: string): boolean {
  const fields = line.trim().split(/\s+/);
  if (fields[6] !== "typ" || fields[7] !== "host") return false;
  const host = fields[4]?.toLowerCase();
  if (!host) return false;
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.local$/.test(host)) return true;
  if (host.includes(":")) return host === "::1" || /^(fc|fd)[0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
  const parts = host.split(".").map(Number);
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host) || parts.some((part) => part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 169 && parts[1] === 254);
}

/** Publish only LAN/mDNS candidates, never public IPs or relays. */
export function localPeerDescription(sdp: string): string {
  const lines = sdp.split(/\r?\n/);
  const candidates = lines.filter((line) => line.startsWith("a=candidate:"));
  if (!candidates.some(localCandidate)) throw new Error("No se encontró una dirección local / No local address found");
  return lines.filter((line) => !line.startsWith("a=candidate:") || localCandidate(line)).join("\r\n");
}

export function encodePeerInvitation(invitation: PeerInvitation) {
  const bytes = new TextEncoder().encode(JSON.stringify(invitation));
  return "CF-LAN1." + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

export function decodePeerInvitation(text: string, now = Date.now()): PeerInvitation {
  const code = text.trim().replace(/\s/g, "");
  if (!code.startsWith("CF-LAN1.") || code.length > MAX_PAIRING_BYTES) throw new Error("Invitación de Caja Fantasma inválida / Invalid invitation");
  let value: PeerInvitation;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(code.slice(8)), (char) => char.charCodeAt(0)))) as PeerInvitation; }
  catch { throw new Error("El código está incompleto / The code is incomplete"); }
  if (value?.protocol !== "cf-lan-1" || !/^[a-f0-9-]{36}$/i.test(value.sessionId) ||
      !["offer", "answer"].includes(value.type) || typeof value.sdp !== "string" ||
      !value.sdp.includes("m=application") || /m=(audio|video)/.test(value.sdp) ||
      !Number.isFinite(value.createdAt) || Math.abs(now - value.createdAt) > 10 * 60_000) {
    throw new Error("Código vencido o no compatible / Expired or incompatible code");
  }
  if (localPeerDescription(value.sdp) !== value.sdp.replace(/\r?\n/g, "\r\n")) throw new Error("La invitación debe usar solo la red local / Invitation must use only the local network");
  return value;
}

export function validatePeerSnapshot(value: unknown): asserts value is PeerSnapshot {
  const snapshot = value as PeerSnapshot;
  if (!snapshot || snapshot.protocol !== 1 || !["pc", "web", "mobile"].includes(snapshot.kind) ||
      !Number.isFinite(Date.parse(snapshot.updatedAt)) || typeof snapshot.dataJson !== "string" ||
      new TextEncoder().encode(snapshot.dataJson).length > PEER_MAX_BYTES) throw new Error("Datos directos inválidos / Invalid direct data");
  const data = JSON.parse(snapshot.dataJson) as Record<string, unknown>;
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      !["actions", "deletedActionIds", "activityHistory", "boxes", "pointRounds", "manualBaselinePoints", "shinyMods", "characters", "teamMemberIds"].every((key) => Array.isArray(data[key])) ||
      typeof data.pointRoundBoundaries !== "object" || !data.pointRoundBoundaries || Array.isArray(data.pointRoundBoundaries)) {
    throw new Error("El historial recibido está incompleto / Received history is incomplete");
  }
}

/** Stable ordering prevents a merge echo merely because records have a different order. */
export function peerFingerprint(dataJson: string): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const items = value.every((item) => item && typeof item === "object" && "id" in item)
        ? [...value].sort((left, right) => String(left.id).localeCompare(String(right.id))) : value;
      return items.map(canonical);
    }
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
    return value;
  };
  return JSON.stringify(canonical(JSON.parse(dataJson)));
}

export async function peerHash(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** One bounded, ordered transfer at a time; nothing is applied before SHA-256 verification. */
export class PeerTransferReceiver {
  private pending?: { id: string; bytes: number; hash: string; chunks: Uint8Array[]; received: number; startedAt: number };
  reset() { this.pending = undefined; }
  async accept(frame: string | ArrayBuffer, now = Date.now()): Promise<PeerSnapshot | undefined> {
    if (this.pending && now - this.pending.startedAt > 30_000) this.reset();
    try {
      if (typeof frame === "string") {
        if (frame.length > 1024) throw new Error("Invalid control frame");
        const message = JSON.parse(frame) as { type: string; id: string; bytes: number; hash: string };
        if (message.type === "begin") {
          if (this.pending || !Number.isSafeInteger(message.bytes) || message.bytes < 1 || message.bytes > PEER_MAX_BYTES ||
              !/^[a-f0-9-]{36}$/i.test(message.id) || !/^[a-f0-9]{64}$/.test(message.hash)) throw new Error("Invalid transfer header");
          this.pending = { ...message, chunks: [], received: 0, startedAt: now };
          return;
        }
        const pending = this.pending;
        if (message.type !== "end" || !pending || message.id !== pending.id || pending.bytes !== pending.received) throw new Error("Incomplete transfer");
        this.reset();
        const bytes = new Uint8Array(pending.bytes);
        let offset = 0;
        for (const chunk of pending.chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        if (await peerHash(bytes) !== pending.hash) throw new Error("Transfer checksum mismatch");
        const snapshot: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        validatePeerSnapshot(snapshot);
        return snapshot;
      }
      const pending = this.pending;
      if (!(frame instanceof ArrayBuffer) || !pending || frame.byteLength < 1 || frame.byteLength > PEER_CHUNK_BYTES ||
          pending.received + frame.byteLength > pending.bytes) throw new Error("Invalid data frame");
      pending.chunks.push(new Uint8Array(frame));
      pending.received += frame.byteLength;
    } catch (error) { this.reset(); throw error; }
  }
}
