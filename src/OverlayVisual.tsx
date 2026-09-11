import { Box, GripHorizontal, X, Zap } from "lucide-react";
import { GRAVITY_EVENT_IMAGE_A, GRAVITY_EVENT_IMAGE_B, GRAVITY_WHALE_BEAM_IMAGE, GRAVITY_WHALE_PASS_IMAGE, LUNAR_EVENT_IMAGE, SYMBIOSIS_EVENT_IMAGE } from "./assets";
import type { GravityWhaleSnapshot, Vision } from "./model";
import { formatDuration } from "./model";

export const OVERLAY_BASE_SIZE = { width: 430, height: 108 };
export const OVERLAY_WHALE_SIZE = { width: 520, height: 258 };

type Props = {
  vision?: Vision;
  phase: "waiting" | "active";
  remainingMs: number;
  whale: GravityWhaleSnapshot;
  onClose?: () => void;
  preview?: boolean;
};

export function overlayDesignSize(showWhale: boolean) {
  return showWhale ? OVERLAY_WHALE_SIZE : OVERLAY_BASE_SIZE;
}

export default function OverlayVisual({ vision, phase, remainingMs, whale, onClose, preview = false }: Props) {
  const remainingWhalePercent = Math.max(0, Math.min(100, Math.round((1 - whale.progress) * 100)));

  return <div className={`overlay-visual ${phase} vision-${vision?.id ?? "none"} ${whale.visible ? "with-whale" : ""} ${preview ? "preview" : ""}`}>
    <section className="overlay-main-shell" aria-label="Contador de Rueda Visional">
      <div className="overlay-event-scene" aria-hidden="true">
        {vision?.id === "lunar" && <img className="overlay-scene-image lunar" src={LUNAR_EVENT_IMAGE} alt="" />}
        {vision?.id === "symbiosis" && <img className="overlay-scene-image symbiosis" src={SYMBIOSIS_EVENT_IMAGE} alt="" />}
        {vision?.id === "gravity" && <><img className="overlay-scene-image gravity scene-a" src={GRAVITY_EVENT_IMAGE_A} alt="" /><img className="overlay-scene-image gravity scene-b" src={GRAVITY_EVENT_IMAGE_B} alt="" /></>}
      </div>
      <span className="overlay-event-vignette" aria-hidden="true" />
      <div className="overlay-content">
        <div className="overlay-icon">{phase === "active" ? <Zap size={23} /> : <Box size={23} />}</div>
        <div className="overlay-copy"><span>{phase === "active" ? `${vision?.name ?? "Rueda"} activa` : `Próxima ${vision?.name ?? "Rueda"}`}</span><strong>{formatDuration(remainingMs)}</strong></div>
        <GripHorizontal className="overlay-grip" size={18} />
        <button type="button" aria-label={preview ? "Vista previa del botón cerrar" : "Cerrar y desactivar contador"} onClick={onClose}><X size={15} /></button>
      </div>
    </section>

    {whale.visible && <section className={`overlay-whale-stage ${whale.departing ? "departing" : "engaged"}`} aria-label={whale.departing ? "La Ballena se retira" : `Ballena activa durante ${formatDuration(whale.remainingMs)}`}>
      <div className="overlay-whale-motion">
        <img className="overlay-whale-image pass" src={GRAVITY_WHALE_PASS_IMAGE} alt="" />
        <img className="overlay-whale-image firing" src={GRAVITY_WHALE_BEAM_IMAGE} alt="" />
        <div className="overlay-whale-beam">
          <span style={{ width: `${remainingWhalePercent}%` }} />
          {!whale.departing && <strong>{formatDuration(whale.remainingMs)}</strong>}
        </div>
      </div>
    </section>}
  </div>;
}
