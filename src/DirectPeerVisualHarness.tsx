import { useCallback, useRef, useState } from "react";
import { createId, type PointAction } from "./model";
import { initialState, mergePersonalSyncPayload, personalSyncPayload } from "./storage";
import { useDirectPeerSync } from "./useDirectPeerSync";
import DirectPeerSyncPanel from "./DirectPeerSyncPanel";
import type { PeerSnapshot } from "./directPeerProtocol";

/** DEV-only WebRTC QA. No App, native bridge or personal-storage reads/writes. */
export default function DirectPeerVisualHarness() {
  const [state, setState] = useState(initialState);
  const updatedAt = useRef(new Date().toISOString());
  const data = useRef(JSON.stringify(personalSyncPayload(state)));
  data.current = JSON.stringify(personalSyncPayload(state));
  const getSnapshot = useCallback(() => ({ dataJson: data.current, updatedAt: updatedAt.current }), []);
  const onSnapshot = useCallback((snapshot: PeerSnapshot) => setState((current) => {
    const newer = Date.parse(snapshot.updatedAt) >= Date.parse(updatedAt.current);
    if (newer) updatedAt.current = snapshot.updatedAt;
    return mergePersonalSyncPayload(current, JSON.parse(snapshot.dataJson), newer);
  }), []);
  const kind = new URLSearchParams(location.search).get("peer-kind") === "mobile" ? "mobile" : "web";
  const peer = useDirectPeerSync({ ready: true, kind, dataJson: data.current, getSnapshot, onSnapshot });
  const add = () => {
    const action: PointAction = { id: createId("test"), activityId: "gravity-platforms", activityName: "Plataformas", visionId: "gravity", points: 4, occurredAt: new Date().toISOString() };
    updatedAt.current = action.occurredAt;
    setState((current) => ({ ...current, actions: [...current.actions, action], activityHistory: [...current.activityHistory, { ...action, count: 1 }] }));
  };
  const remove = () => {
    updatedAt.current = new Date().toISOString();
    setState((current) => {
      const id = current.actions.at(-1)?.id;
      return id ? { ...current, actions: current.actions.filter((item) => item.id !== id), activityHistory: current.activityHistory.filter((item) => item.id !== id), deletedActionIds: [...current.deletedActionIds, id] } : current;
    });
  };
  return <main className="interface-visual-harness">
    <h1>Laboratorio directo · sin datos personales</h1>
    <p>Dispositivo simulado: {kind}. Esta prueba no guarda ni modifica tu progreso.</p>
    <p role="status" aria-label="Puntos de prueba">Puntos: {state.actions.reduce((sum, action) => sum + action.points, 0)} · Historial: {state.activityHistory.length} · Eliminados: {state.deletedActionIds.length}</p>
    <button type="button" className="primary" onClick={add}>Añadir plataforma de prueba</button>
    <button type="button" className="secondary" onClick={remove}>Restar plataforma de prueba</button>
    <DirectPeerSyncPanel peer={peer} english={false} />
  </main>;
}
