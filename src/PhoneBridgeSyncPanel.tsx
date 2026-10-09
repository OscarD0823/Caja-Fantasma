import { RefreshCw, Send, Smartphone, Wifi, WifiOff } from "lucide-react";
import LocalSyncAddressFields from "./LocalSyncAddressFields";
import { validPhoneBridgeAddress } from "./phoneBridgeProtocol";
import type { usePhoneBridgeSync } from "./usePhoneBridgeSync";
import type { UiLanguage } from "./i18n";

export default function PhoneBridgeSyncPanel({ bridge, mobile, web, language, address, code, onAddress, onCode, newCode }: {
  bridge: ReturnType<typeof usePhoneBridgeSync>; mobile: boolean; web: boolean; language: UiLanguage; address: string; code: string;
  onAddress: (value: string) => void; onCode: (value: string) => void; newCode: () => string;
}) {
  const english = language !== "es";
  const tx = (es: string, en: string) => english ? en : es;
  const ready = validPhoneBridgeAddress(address) && /^\d{6}$/.test(code);
  return <article id="phone-connection" className="panel phone-bridge-panel">
    <div className="local-sync-heading"><div><span className="eyebrow"><Smartphone size={15} /> {tx("CONEXIÓN DIRECTA", "DIRECT CONNECTION")}</span><h2>{tx("Web ↔ Celular", "Web ↔ Phone")}</h2><p>{tx("En la misma Wi-Fi, con la página y la app abiertas.", "On the same Wi-Fi with the website and app open.")}</p></div><span className={`local-sync-state ${bridge.online.includes("web") ? "online" : "offline"}`}>{bridge.online.includes("web") ? tx("CONECTADOS", "CONNECTED") : bridge.enabled ? tx("ESPERANDO", "WAITING") : tx("APAGADA", "OFF")}</span></div>
    {mobile && !web ? <>
      {bridge.enabled && bridge.info && <div className="local-sync-desktop-grid"><div><small>{tx("IP DEL CELULAR", "PHONE IP")}</small><strong>{bridge.info.address.split(":")[0]}</strong></div><div><small>{tx("PUERTO", "PORT")}</small><strong>{bridge.info.port}</strong></div><div><small>{tx("CÓDIGO DE CONEXIÓN", "PAIRING CODE")}</small><strong className="pairing-code">{code}</strong></div></div>}
      <div className="local-sync-actions"><button type="button" className={bridge.enabled ? "secondary" : "primary"} disabled={!bridge.enabled && bridge.busy} onClick={() => { if (!bridge.enabled && !/^\d{6}$/.test(code)) onCode(newCode()); bridge.setEnabled(!bridge.enabled); }}>{bridge.enabled ? <WifiOff size={17} /> : <Wifi size={17} />}{bridge.enabled ? tx("Dejar de compartir", "Stop sharing") : tx("Compartir con la web", "Share with website")}</button>{bridge.enabled && <button type="button" className="secondary" disabled={bridge.busy} onClick={() => onCode(newCode())}><RefreshCw size={16} />{tx("Cambiar código", "Change code")}</button>}</div>
      <small>{tx("Escribe estos datos en Dispositivos de la página.", "Enter these details in Devices on the website.")}</small>
    </> : web ? <>
      <p className="connection-instruction">{tx("En la APK abre Dispositivos → Compartir con la web. Copia aquí la IP, puerto y código que muestra el celular.", "In the APK, open Devices → Share with website. Enter the IP, port and code shown by the phone here.")}</p>
      <div className="local-sync-mobile-fields"><LocalSyncAddressFields language={language} device="phone" value={address} onChange={onAddress} /><label className="local-pairing-field">{tx("Código de 6 números", "Six-digit code")}<input inputMode="numeric" maxLength={6} autoComplete="off" aria-label={tx("Código del celular", "Phone code")} value={code} placeholder="000000" onChange={event => onCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label></div>
      <div className="local-sync-actions"><button type="button" className={bridge.enabled ? "secondary" : "primary"} disabled={!bridge.enabled && (bridge.busy || !ready)} onClick={() => bridge.setEnabled(!bridge.enabled)}>{bridge.enabled ? <WifiOff size={17} /> : <Wifi size={17} />}{bridge.enabled ? tx("Desconectar", "Disconnect") : tx("Conectar con el celular", "Connect to phone")}</button>{bridge.enabled && <button type="button" className="secondary" disabled={bridge.busy} onClick={() => void bridge.send()}><Send size={16} />{tx("Enviar ahora", "Send now")}</button>}</div>
    </> : <small>{tx("En Android pulsa «Compartir con la web» y usa su IP, puerto y código en la página. El PC no es necesario para esa conexión.", "In Android, select ‘Share with website’ and enter its IP, port, and code on the website. This connection does not need a PC.")}</small>}
    {(mobile || web) && <div className="local-live-sync-option"><span><strong>{tx("Sincronización en vivo", "Live synchronization")}</strong></span><button type="button" className={`switch ${bridge.live ? "on" : ""}`} aria-label={tx("Cambios web y celular en vivo", "Live web and phone changes")} aria-pressed={bridge.live} onClick={() => bridge.setLive(!bridge.live)}><span /></button></div>}
    {bridge.message && <p className="local-sync-message" role="status">{bridge.message}</p>}
  </article>;
}
