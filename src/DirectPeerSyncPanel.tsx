import { useState } from "react";
import { Link2, Copy, Send, Unplug } from "lucide-react";
import type { useDirectPeerSync } from "./useDirectPeerSync";

export default function DirectPeerSyncPanel({ peer, english }: { peer: ReturnType<typeof useDirectPeerSync>; english: boolean }) {
  const [input, setInput] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const tx = (es: string, en: string) => english ? en : es;
  return <article className="panel direct-peer-panel">
    <div className="panel-title"><div><span className="eyebrow"><Link2 size={15} /> {tx("CONEXIÓN DIRECTA · SIN PC", "DIRECT CONNECTION · NO PC")}</span><h2>{tx("Web ↔ Celular", "Web ↔ Phone")}</h2></div><span className={`local-sync-state ${peer.status === "connected" ? "online" : "offline"}`}>{peer.status === "connected" ? tx("CONECTADOS", "CONNECTED") : peer.status === "pairing" ? tx("EMPAREJANDO", "PAIRING") : tx("SIN CONECTAR", "NOT CONNECTED")}</span></div>
    <p>{tx("Ambos en la misma Wi-Fi, con la web y la app abiertas. No usa servidores, nube ni Firebase. Al conectar se combinan los historiales; nunca se reemplaza tu progreso por una copia vacía.", "Keep both devices on the same Wi-Fi with the website and app open. No servers, cloud, or Firebase. Connecting merges history; an empty copy never replaces your progress.")}</p>
    <ol><li>{tx("En uno, crea una invitación y pásala al otro.", "Create an invitation on one device and send it to the other.")}</li><li>{tx("En el otro, pega la invitación y pulsa Conectar. Devuelve la respuesta generada.", "Paste the invitation on the other device and press Connect. Return its generated answer.")}</li><li>{tx("Pega la respuesta en el primero y pulsa Conectar.", "Paste the answer on the first device and press Connect.")}</li></ol>
    <div className="local-sync-actions"><button type="button" className="secondary" disabled={peer.busy} onClick={() => void peer.createInvitation()}><Link2 size={16} />{tx("Crear invitación", "Create invitation")}</button>{peer.status !== "off" && <button type="button" className="secondary" onClick={peer.disconnect}><Unplug size={16} />{tx("Desconectar", "Disconnect")}</button>}</div>
    {peer.code && <div className="direct-peer-code"><label>{tx("Tu código para el otro dispositivo (caduca en 10 minutos)", "Your code for the other device (expires in 10 minutes)")}<textarea readOnly rows={3} value={peer.code} spellCheck={false} /></label><button type="button" className="secondary compact" onClick={() => void navigator.clipboard.writeText(peer.code).then(() => setCopiedCode(peer.code)).catch(() => setCopiedCode(""))}><Copy size={14} />{copiedCode === peer.code ? tx("Copiado", "Copied") : tx("Copiar código", "Copy code")}</button></div>}
    <label>{tx("Pega aquí la invitación o respuesta recibida", "Paste the received invitation or answer here")}<textarea rows={3} value={input} onChange={(event) => setInput(event.target.value)} placeholder="CF-LAN1.…" autoComplete="off" spellCheck={false} /></label>
    <button type="button" className="primary" disabled={peer.busy || !input.trim()} onClick={() => void peer.acceptCode(input)}>{tx("Conectar y combinar historial", "Connect and merge history")}</button>
    {peer.status === "connected" && <div className="direct-peer-live"><label><input type="checkbox" checked={peer.live} onChange={(event) => peer.setLive(event.target.checked)} />{tx("Cambios en vivo", "Live changes")}</label><button type="button" className="secondary compact" disabled={peer.busy} onClick={() => void peer.send()}><Send size={15} />{tx("Enviar ahora", "Send now")}</button></div>}
    <p role="status">{peer.message}</p>
    <small>{tx("La conexión directa se detiene si Android o el navegador suspenden la app. Vuelve a emparejarla cuando regreses; tus datos quedan guardados. El modo con PC conserva la sincronización nativa en segundo plano.", "Direct connection stops if Android or the browser suspends the app. Pair again when you return; your data remains saved. PC mode retains native background synchronization.")}</small>
  </article>;
}
