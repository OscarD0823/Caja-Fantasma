import type { CSSProperties } from "react";
import { Box, GripHorizontal, X, Zap } from "lucide-react";
import { GRAVITY_EVENT_IMAGE_A, GRAVITY_EVENT_IMAGE_B, GRAVITY_WHALE_BEAM_IMAGE, GRAVITY_WHALE_PASS_IMAGE, LUNAR_EVENT_IMAGE, SYMBIOSIS_EVENT_IMAGE } from "./assets";
import type { GravityWhaleSnapshot, OverlayCounterStyle, OverlayNameMode, OverlayShape, Vision } from "./model";
import { formatCompactDuration, formatDuration, overlayVisionName } from "./model";

const OVERLAY_SHAPE_SIZES: Record<OverlayShape, { width: number; height: number }> = {
  event: { width: 430, height: 108 },
  rectangle: { width: 430, height: 108 },
  square: { width: 238, height: 238 },
  vertical: { width: 198, height: 288 },
  round: { width: 238, height: 238 },
};
export const OVERLAY_WHALE_WIDTH = 520;
export const OVERLAY_WHALE_HEIGHT = 150;

type Props = {
  vision?: Vision;
  phase: "waiting" | "active";
  remainingMs: number;
  progress: number;
  whale: GravityWhaleSnapshot;
  shape: OverlayShape;
  counterStyle: OverlayCounterStyle;
  nameMode: OverlayNameMode;
  customName: string;
  onClose?: () => void;
  preview?: boolean;
};

export function overlayDesignSize(showWhale: boolean, shape: OverlayShape = "event") {
  const base = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  return showWhale ? { width: Math.max(base.width, OVERLAY_WHALE_WIDTH), height: base.height + OVERLAY_WHALE_HEIGHT } : base;
}

export default function OverlayVisual({ vision, phase, remainingMs, progress, whale, shape, counterStyle, nameMode, customName, onClose, preview = false }: Props) {
  const remainingWhalePercent = Math.max(0, Math.min(100, Math.round((1 - whale.progress) * 100)));
  const eventName = overlayVisionName(vision, nameMode, customName);
  const designSize = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  const timer = counterStyle === "compact" ? formatCompactDuration(remainingMs) : formatDuration(remainingMs);
  const visualStyle = {
    "--overlay-main-width": `${designSize.width - 8}px`,
    "--overlay-main-height": `${designSize.height - 8}px`,
    "--overlay-progress": `${Math.round(Math.max(0, Math.min(1, progress)) * 360)}deg`,
  } as CSSProperties;

  return <div style={visualStyle} className={`overlay-visual ${phase} vision-${vision?.id ?? "none"} shape-${shape} counter-${counterStyle} ${whale.visible ? "with-whale" : ""} ${preview ? "preview" : ""}`}>
    <section className="overlay-main-shell" aria-label="Contador de Rueda Visional">
      <div className="overlay-event-scene" aria-hidden="true">
        {vision?.id === "lunar" && <img className="overlay-scene-image lunar" src={LUNAR_EVENT_IMAGE} alt="" />}
        {vision?.id === "symbiosis" && <img className="overlay-scene-image symbiosis" src={SYMBIOSIS_EVENT_IMAGE} alt="" />}
        {vision?.id === "gravity" && <><img className="overlay-scene-image gravity scene-a" src={GRAVITY_EVENT_IMAGE_A} alt="" /><img className="overlay-scene-image gravity scene-b" src={GRAVITY_EVENT_IMAGE_B} alt="" /></>}
      </div>
      <span className="overlay-event-vignette" aria-hidden="true" />
      <div className="overlay-content">
        <div className="overlay-icon">{phase === "active" ? <Zap size={23} /> : <Box size={23} />}</div>
        <div className="overlay-copy"><span>{phase === "active" ? `${eventName} activa` : `Próxima ${eventName}`}</span>{counterStyle === "ring" ? <div className="overlay-timer-ring"><strong>{timer}</strong></div> : <strong>{timer}</strong>}</div>
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
