import { useCallback, useEffect, useRef, useState } from "react";
import { decodePeerInvitation, encodePeerInvitation, localPeerDescription, peerFingerprint, peerHash, PeerTransferReceiver, PEER_CHUNK_BYTES, PEER_MAX_BYTES, type PeerKind, type PeerSnapshot } from "./directPeerProtocol";

async function finishIce(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("La red no respondió. Comprueba que ambos estén en la misma Wi-Fi / Check that both devices are on the same Wi-Fi")); }, 10_000);
    const changed = () => { if (peer.iceGatheringState === "complete") { cleanup(); resolve(); } };
    const cleanup = () => { window.clearTimeout(timer); peer.removeEventListener("icegatheringstatechange", changed); };
    peer.addEventListener("icegatheringstatechange", changed);
    changed();
  });
}

async function drainChannel(channel: RTCDataChannel) {
  if (channel.readyState !== "open") throw new Error("Conexión cerrada / Connection closed");
  if (channel.bufferedAmount < 256 * 1024) return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("Transferencia detenida / Transfer stalled")); }, 8_000);
    const low = () => { cleanup(); resolve(); };
    const closed = () => { cleanup(); reject(new Error("Conexión cerrada / Connection closed")); };
    const cleanup = () => { window.clearTimeout(timer); channel.removeEventListener("bufferedamountlow", low); channel.removeEventListener("close", closed); };
    channel.addEventListener("bufferedamountlow", low);
    channel.addEventListener("close", closed);
  });
}

export function useDirectPeerSync({ ready, kind, dataJson, getSnapshot, onSnapshot }: {
  ready: boolean; kind: PeerKind; dataJson: string;
  getSnapshot: () => Pick<PeerSnapshot, "dataJson" | "updatedAt">;
  onSnapshot: (snapshot: PeerSnapshot) => void;
}) {
  const [status, setStatus] = useState<"off" | "pairing" | "connected" | "closed">("off");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(true);
  const [remoteKind, setRemoteKind] = useState<PeerKind>();
  const peerRef = useRef<RTCPeerConnection | undefined>(undefined);
  const channelRef = useRef<RTCDataChannel | undefined>(undefined);
  const sessionRef = useRef("");
  const receiverRef = useRef(new PeerTransferReceiver());
  const receiveQueue = useRef(Promise.resolve());
  const sendingRef = useRef(false);
  const lastSent = useRef("");
  const lastReceived = useRef("");
  const propsRef = useRef({ ready, getSnapshot, onSnapshot, kind });
  propsRef.current = { ready, getSnapshot, onSnapshot, kind };

  const send = useCallback(async () => {
    const channel = channelRef.current;
    if (!propsRef.current.ready || channel?.readyState !== "open" || sendingRef.current) return;
    sendingRef.current = true;
    setBusy(true);
    try {
      const snapshot: PeerSnapshot = { ...propsRef.current.getSnapshot(), protocol: 1, kind: propsRef.current.kind };
      const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
      if (bytes.length > PEER_MAX_BYTES) throw new Error("Historial demasiado grande para enviar / History too large to send");
      const id = crypto.randomUUID();
      const hash = await peerHash(bytes);
      if (channelRef.current !== channel) return;
      channel.send(JSON.stringify({ type: "begin", id, bytes: bytes.length, hash }));
      for (let start = 0; start < bytes.length; start += PEER_CHUNK_BYTES) {
        await drainChannel(channel);
        channel.send(bytes.slice(start, start + PEER_CHUNK_BYTES).buffer);
      }
      channel.send(JSON.stringify({ type: "end", id }));
      lastSent.current = peerFingerprint(snapshot.dataJson);
      setMessage("Datos enviados · el otro dispositivo los combinará / Data sent · the other device will merge them");
    } catch (error) {
      setMessage(String(error));
      // A partial transfer is never usable. Re-pair before any further sends.
      channel.close();
    } finally { sendingRef.current = false; setBusy(false); }
  }, []);

  const disconnect = useCallback(() => {
    channelRef.current?.close();
    const peer = peerRef.current;
    if (peer) { peer.ondatachannel = null; peer.onconnectionstatechange = null; peer.close(); }
    peerRef.current = undefined; channelRef.current = undefined;
    receiverRef.current.reset();
    lastSent.current = ""; lastReceived.current = "";
    setRemoteKind(undefined); setStatus("off"); setCode(""); setMessage("");
  }, []);

  const makePeer = useCallback(() => {
    if (!propsRef.current.ready) throw new Error("Espera a que se cargue el progreso / Wait for progress to load");
    if (typeof RTCPeerConnection === "undefined" || !crypto.subtle) throw new Error("Esta versión del navegador no admite conexión directa / Direct connection is unavailable in this browser");
    disconnect();
    // No STUN, TURN, relay or signaling provider. Local ICE candidates only.
    const peer = new RTCPeerConnection({ iceServers: [] });
    peerRef.current = peer;
    const attach = (channel: RTCDataChannel) => {
      if (channel.label !== "cf-personal-v1" || channel.ordered !== true) { channel.close(); return; }
      channelRef.current = channel;
      channel.binaryType = "arraybuffer";
      channel.bufferedAmountLowThreshold = 128 * 1024;
      channel.onopen = () => { if (peerRef.current === peer) { setStatus("connected"); setCode(""); void send(); } };
      channel.onclose = () => { if (peerRef.current === peer) { receiverRef.current.reset(); setStatus("closed"); setRemoteKind(undefined); } };
      channel.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
        receiveQueue.current = receiveQueue.current.then(async () => {
          if (peerRef.current !== peer || !propsRef.current.ready) return;
          const snapshot = await receiverRef.current.accept(event.data);
          if (!snapshot || peerRef.current !== peer) return;
          lastReceived.current = peerFingerprint(snapshot.dataJson);
          setRemoteKind(snapshot.kind);
          propsRef.current.onSnapshot(snapshot);
          setMessage("Historial recibido y combinado · sin reemplazar tu copia / History received and merged · your copy was not replaced");
        }).catch((error) => { setMessage(String(error)); channel.close(); });
      };
    };
    peer.ondatachannel = (event) => attach(event.channel);
    peer.onconnectionstatechange = () => {
      if (peerRef.current === peer && peer.connectionState === "connected" && channelRef.current?.readyState === "open") {
        setStatus("connected");
        void send();
      }
      if (peerRef.current === peer && ["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        setStatus("closed"); setRemoteKind(undefined);
        setMessage("Conexión interrumpida. El progreso permanece guardado / Connection interrupted. Progress stays saved");
      }
    };
    setStatus("pairing");
    return { peer, attach };
  }, [disconnect, send]);

  const createInvitation = useCallback(async () => {
    setBusy(true); setMessage("");
    let attempted: RTCPeerConnection | undefined;
    try {
      const { peer, attach } = makePeer(); attempted = peer;
      sessionRef.current = crypto.randomUUID();
      attach(peer.createDataChannel("cf-personal-v1", { ordered: true }));
      await peer.setLocalDescription(await peer.createOffer()); await finishIce(peer);
      if (peerRef.current !== peer) return;
      setCode(encodePeerInvitation({ protocol: "cf-lan-1", sessionId: sessionRef.current, createdAt: Date.now(), type: "offer", sdp: localPeerDescription(peer.localDescription!.sdp) }));
      setMessage("Pasa esta invitación al otro dispositivo / Send this invitation to the other device");
    } catch (error) { if (!attempted || peerRef.current === attempted) { disconnect(); setMessage(String(error)); } }
    finally { setBusy(false); }
  }, [disconnect, makePeer]);

  const acceptCode = useCallback(async (text: string) => {
    setBusy(true); setMessage("");
    let attempted: RTCPeerConnection | undefined;
    try {
      const invitation = decodePeerInvitation(text);
      if (invitation.type === "offer") {
        const { peer } = makePeer(); attempted = peer; sessionRef.current = invitation.sessionId;
        await peer.setRemoteDescription({ type: "offer", sdp: invitation.sdp });
        await peer.setLocalDescription(await peer.createAnswer()); await finishIce(peer);
        if (peerRef.current !== peer) return;
        setCode(encodePeerInvitation({ protocol: "cf-lan-1", sessionId: invitation.sessionId, createdAt: Date.now(), type: "answer", sdp: localPeerDescription(peer.localDescription!.sdp) }));
        setMessage("Devuelve esta respuesta a quien creó la invitación / Return this answer to the invitation creator");
      } else {
        const peer = peerRef.current; attempted = peer;
        if (!peer || peer.signalingState !== "have-local-offer" || invitation.sessionId !== sessionRef.current) throw new Error("La respuesta no corresponde a tu invitación / Answer does not match your invitation");
        await peer.setRemoteDescription({ type: "answer", sdp: invitation.sdp });
        setMessage("Conectando directamente por la red local / Connecting directly over the local network");
      }
    } catch (error) {
      // A malformed answer leaves a valid invitation available to retry; a
      // failed newly-created answer must release its ICE resources instead.
      if (attempted && peerRef.current === attempted && attempted.signalingState !== "have-local-offer") disconnect();
      setMessage(String(error));
    }
    finally { setBusy(false); }
  }, [disconnect, makePeer]);

  useEffect(() => {
    if (!ready || !live || status !== "connected" || busy) return;
    const fingerprint = peerFingerprint(dataJson);
    if (fingerprint === lastSent.current || fingerprint === lastReceived.current) return;
    const timer = window.setTimeout(() => void send(), 350);
    return () => window.clearTimeout(timer);
  }, [busy, dataJson, live, ready, send, status]);
  useEffect(() => () => {
    const channel = channelRef.current, peer = peerRef.current;
    channelRef.current = undefined; peerRef.current = undefined;
    if (channel) { channel.onopen = null; channel.onmessage = null; channel.onclose = null; channel.close(); }
    if (peer) { peer.onconnectionstatechange = null; peer.ondatachannel = null; peer.close(); }
    receiverRef.current.reset();
  }, []);
  return { status, code, message, busy, live, setLive, remoteKind, createInvitation, acceptCode, disconnect, send };
}
