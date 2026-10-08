import { memo, type CSSProperties } from "react";
import { Globe, Monitor, Smartphone } from "lucide-react";
import type { DeviceKind } from "./devicePresence";

/** Decorative signal motion follows real bridge presence, never a simulated connection. */
export default memo(function DevicePresenceStrip({ online, current, english = false }: { online: readonly DeviceKind[]; current: DeviceKind; english?: boolean }) {
  const devices = [{ id: "pc", name: "PC", icon: Monitor }, { id: "web", name: "Web", icon: Globe }, { id: "mobile", name: english ? "Mobile" : "Móvil", icon: Smartphone }] as const;
  return <div className="device-presence" aria-label={english ? "Paired devices" : "Dispositivos emparejados"}>
    {devices.map(({ id, name, icon: Icon }, index) => {
      const connected = online.includes(id);
      const status = connected ? (english ? "connected" : "conectado") : id === current ? (english ? "this device · not paired" : "este dispositivo · sin emparejar") : (english ? "no recent connection" : "sin conexión reciente");
      return <span key={id} className={`device-node ${connected ? "connected" : "offline"} ${id === current ? "current" : ""}`} style={{ "--signal-offset": `${index * -.6}s` } as CSSProperties} title={`${name}: ${status}`} aria-label={`${name}: ${status}`}>
        <span className="device-node-icon" aria-hidden="true"><Icon size={14} /><i className="device-orbit" /></span>
        <span className="device-node-name">{name}</span>
        <span className="device-telemetry" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="device-signal-track" aria-hidden="true"><i /><i /></span>
      </span>;
    })}
  </div>;
});
