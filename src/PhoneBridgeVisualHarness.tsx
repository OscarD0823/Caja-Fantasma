import { useCallback, useRef, useState } from "react";
import PhoneBridgeSyncPanel from "./PhoneBridgeSyncPanel";
import { usePhoneBridgeSync } from "./usePhoneBridgeSync";
import type { PhoneBridgeSnapshot } from "./phoneBridgeProtocol";
import DevicePresence from "./DevicePresenceStrip";

/** DEV-only link check: no App, localStorage, native backup or invented rewards. */
export default function PhoneBridgeVisualHarness() {
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [snapshot, setSnapshot] = useState(() => ({ dataJson: JSON.stringify({ actions: [], activityHistory: [], boxes: [], pointRounds: [], shinyMods: [], characters: [], deletedActionIds: [] }), updatedAt: new Date().toISOString() }));
  const current = useRef(snapshot);
  current.current = snapshot;
  const getSnapshot = useCallback(() => current.current, []);
  const onSnapshot = useCallback((value: PhoneBridgeSnapshot) => setSnapshot({ dataJson: value.dataJson, updatedAt: value.updatedAt }), []);
  const onCatalog = useCallback(() => undefined, []);
  const bridge = usePhoneBridgeSync({ ready: true, mobile: false, web: true, address, code, dataJson: snapshot.dataJson, catalogJson: "{}", english: false, getSnapshot, onSnapshot, onCatalog });
  const data = JSON.parse(snapshot.dataJson) as { actions: { points: number }[]; boxes: unknown[] };
  return <main className="interface-visual-harness" style={{ maxWidth: 900, margin: "auto" }}>
    <h1>Prueba de enlace con Android</h1><p>No carga ni guarda datos del navegador. Empieza sin registros y no tiene botones para añadir recompensas.</p>
    <DevicePresence current="web" online={bridge.online} />
    <p role="status">Datos recibidos: {data.actions.reduce((sum, item) => sum + item.points, 0)} puntos · {data.boxes.length} cajas</p>
    <PhoneBridgeSyncPanel bridge={bridge} mobile={false} web language="es" address={address} code={code} newCode={() => ""} onAddress={value => { bridge.setEnabled(false); setAddress(value); }} onCode={value => { bridge.setEnabled(false); setCode(value); }} />
  </main>;
}
