import assert from "node:assert/strict";
import { decodePeerInvitation, encodePeerInvitation, localPeerDescription, peerFingerprint, peerHash, PeerTransferReceiver, PEER_CHUNK_BYTES, PEER_MAX_BYTES, validatePeerSnapshot, type PeerSnapshot } from "../src/directPeerProtocol.ts";
import { initialState, mergePersonalSyncPayload, personalSyncPayload } from "../src/storage.ts";

const now = Date.now();
const candidate = (address: string, type = "host") => `a=candidate:1 1 udp 2113937151 ${address} 54247 typ ${type}\r\n`;
const offer = { protocol: "cf-lan-1" as const, sessionId: crypto.randomUUID(), createdAt: now, type: "offer" as const, sdp: "v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n" + candidate("192.168.1.2") };
assert.deepEqual(decodePeerInvitation(encodePeerInvitation(offer), now), offer);
assert.throws(() => decodePeerInvitation(encodePeerInvitation(offer), now + 600_001));
assert.throws(() => decodePeerInvitation("CF-LAN1.broken"));
assert.throws(() => decodePeerInvitation(encodePeerInvitation({ ...offer, sdp: offer.sdp + "m=audio 9 UDP\r\n" })));
assert.equal(localPeerDescription(offer.sdp + candidate("8.8.8.8") + candidate("10.0.0.2", "relay")), offer.sdp);
assert.throws(() => decodePeerInvitation(encodePeerInvitation({ ...offer, sdp: offer.sdp + candidate("8.8.8.8") })));
assert.throws(() => localPeerDescription(candidate("2001:db8::1")));
assert.throws(() => localPeerDescription("v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n"));
for (const address of ["e3bbb459-9708-47f5-bc96-b6f31bc4c04e.local", "10.0.0.4", "172.16.1.9", "fd00::1", "fe80::2"]) {
  assert.equal(localPeerDescription(candidate(address)), candidate(address));
}

const state = initialState();
const action = { id: "sample", activityId: "gravity-platforms", activityName: "Plataformas", points: 4, occurredAt: new Date(now).toISOString() };
state.actions.push(action); state.activityHistory.push({ ...action, count: 1 });
const snapshot: PeerSnapshot = { protocol: 1, kind: "mobile", updatedAt: new Date(now).toISOString(), dataJson: JSON.stringify(personalSyncPayload(state)) };
validatePeerSnapshot(snapshot);
assert.throws(() => validatePeerSnapshot({ ...snapshot, dataJson: "{}" }));
assert.throws(() => validatePeerSnapshot({ ...snapshot, updatedAt: "not a date" }));
const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
const header = { type: "begin", id: crypto.randomUUID(), bytes: bytes.length, hash: await peerHash(bytes) };
const receiver = new PeerTransferReceiver();
assert.equal(await receiver.accept(JSON.stringify(header)), undefined);
for (let offset = 0; offset < bytes.length; offset += PEER_CHUNK_BYTES) await receiver.accept(bytes.slice(offset, offset + PEER_CHUNK_BYTES).buffer);
assert.deepEqual(await receiver.accept(JSON.stringify({ type: "end", id: header.id })), snapshot);
await receiver.accept(JSON.stringify(header));
await assert.rejects(() => receiver.accept(JSON.stringify({ type: "end", id: header.id })), /Incomplete/);
await receiver.accept(JSON.stringify(header));
const corrupted = bytes.slice(); corrupted[0] ^= 1;
await receiver.accept(corrupted.buffer);
await assert.rejects(() => receiver.accept(JSON.stringify({ type: "end", id: header.id })), /checksum/);
await assert.rejects(() => receiver.accept(JSON.stringify({ ...header, bytes: PEER_MAX_BYTES + 1 })), /header/);
await receiver.accept(JSON.stringify(header), now);
await assert.rejects(() => receiver.accept(bytes.slice().buffer, now + 30_001), /frame/);
await assert.rejects(() => receiver.accept(new Uint8Array(PEER_CHUNK_BYTES + 1).buffer), /frame/);

const other = { ...action, id: "other", points: 1 };
const combined = mergePersonalSyncPayload(state, { ...personalSyncPayload(state), actions: [other, action], activityHistory: [{ ...other, count: 1 }, { ...action, count: 1 }] }, true);
assert.equal(combined.actions.reduce((sum, item) => sum + item.points, 0), 5);
assert.equal(mergePersonalSyncPayload(combined, personalSyncPayload(initialState()), true).actions.length, 2, "An empty peer never erases durable progress");
const removed = { ...personalSyncPayload(combined), actions: [other], activityHistory: [{ ...other, count: 1 }], deletedActionIds: [action.id] };
const deleted = mergePersonalSyncPayload(combined, removed, true);
assert.equal(deleted.actions.reduce((sum, item) => sum + item.points, 0), 1);
assert.equal(mergePersonalSyncPayload(deleted, personalSyncPayload(combined), true).actions.length, 1, "A stale peer cannot resurrect a deletion");
const ordered = JSON.stringify({ actions: [action, other], boxes: [], a: 1 });
const reversed = JSON.stringify({ a: 1, boxes: [], actions: [other, action] });
assert.equal(peerFingerprint(ordered), peerFingerprint(reversed), "Ordering alone must not cause a live echo");
console.log("Direct LAN protocol OK: bounded/checksummed transfer, expiring data-only invitation, safe merging, deletions and stable fingerprints.");
