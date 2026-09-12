import type { CSSProperties } from "react";
import { Box, GripHorizontal, X, Zap } from "lucide-react";
import { GRAVITY_EVENT_IMAGE_A, GRAVITY_EVENT_IMAGE_B, GRAVITY_WHALE_BOSS_IMAGE, LUNAR_EVENT_IMAGE, SYMBIOSIS_EVENT_IMAGE } from "./assets";
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
const OVERLAY_WHALE_COUNTER_SIZES: Record<OverlayCounterStyle, { width: number; height: number }> = {
  digital: { width: 142, height: 42 },
  compact: { width: 112, height: 38 },
  ring: { width: 72, height: 72 },
};

type Props = {
  vision?: Vision;
  phase: "waiting" | "active";
  remainingMs: number;
  progress: number;
  transitionRemainingMs?: number;
  whale: GravityWhaleSnapshot;
  addonScale: number;
  whaleCounterScale: number;
  whaleCounterStyle: OverlayCounterStyle;
  shape: OverlayShape;
  counterStyle: OverlayCounterStyle;
  nameMode: OverlayNameMode;
  customName: string;
  onClose?: () => void;
  preview?: boolean;
  interactive?: boolean;
};

export function overlayDesignSize(showWhale: boolean, shape: OverlayShape = "event", addonScale = 1, whaleCounterScale = 1, whaleCounterStyle: OverlayCounterStyle = "digital") {
  const base = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  const normalizedAddonScale = whaleScaleWithinWindow(addonScale, shape);
  const normalizedCounterScale = whaleCounterScaleWithinWindow(whaleCounterScale, shape, whaleCounterStyle);
  return showWhale ? {
    width: base.width,
    height: base.height + whaleStageHeight(normalizedAddonScale, normalizedCounterScale, whaleCounterStyle),
  } : base;
}

export default function OverlayVisual({ vision, phase, remainingMs, progress, transitionRemainingMs = 0, whale, addonScale, whaleCounterScale, whaleCounterStyle, shape, counterStyle, nameMode, customName, onClose, preview = false, interactive = true }: Props) {
  const remainingWhalePercent = Math.max(0, Math.min(100, Math.round((1 - whale.progress) * 100)));
  const normalizedAddonScale = whaleScaleWithinWindow(addonScale, shape);
  const normalizedWhaleCounterScale = whaleCounterScaleWithinWindow(whaleCounterScale, shape, whaleCounterStyle);
  const counterCompensation = normalizedWhaleCounterScale / normalizedAddonScale;
  const whaleTimer = whaleCounterStyle === "digital" ? formatDuration(whale.remainingMs) : formatCompactDuration(whale.remainingMs);
  const whaleCanvasOffset = whaleCanvasOffsetWithinStage(normalizedAddonScale, normalizedWhaleCounterScale, whaleCounterStyle);
  const whaleCounterLeft = whaleCounterLeftWithinWindow(normalizedAddonScale, normalizedWhaleCounterScale, shape, whaleCounterStyle);
  const whaleHeight = whaleStageHeight(normalizedAddonScale, normalizedWhaleCounterScale, whaleCounterStyle);
  const eventName = overlayVisionName(vision, nameMode, customName);
  const designSize = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  const transitionActive = transitionRemainingMs > 0;
  const displayedMs = transitionActive ? transitionRemainingMs : remainingMs;
  const timer = counterStyle === "compact" ? formatCompactDuration(displayedMs) : formatDuration(displayedMs);
  const visualStyle = {
    "--overlay-main-width": `${designSize.width - 8}px`,
    "--overlay-main-height": `${designSize.height - 8}px`,
    "--overlay-progress": `${Math.round(Math.max(0, Math.min(1, progress)) * 360)}deg`,
  } as CSSProperties;

  return <div style={visualStyle} className={`overlay-visual ${phase} vision-${vision?.id ?? "none"} shape-${shape} counter-${counterStyle} ${transitionActive ? "transitioning" : ""} ${whale.visible ? "with-whale" : ""} ${preview ? "preview" : ""}`}>
    <section className="overlay-main-shell" aria-label="Contador de Rueda Visional">
      <div className="overlay-event-scene" aria-hidden="true">
        {vision?.id === "lunar" && <img className="overlay-scene-image lunar" src={LUNAR_EVENT_IMAGE} alt="" />}
        {vision?.id === "symbiosis" && <img className="overlay-scene-image symbiosis" src={SYMBIOSIS_EVENT_IMAGE} alt="" />}
        {vision?.id === "gravity" && <><img className="overlay-scene-image gravity scene-a" src={GRAVITY_EVENT_IMAGE_A} alt="" /><img className="overlay-scene-image gravity scene-b" src={GRAVITY_EVENT_IMAGE_B} alt="" /></>}
      </div>
      <span className="overlay-event-vignette" aria-hidden="true" />
      <div className="overlay-content">
        <div className="overlay-icon">{phase === "active" ? <Zap size={23} /> : <Box size={23} />}</div>
        <div className="overlay-copy"><span>{transitionActive ? "Preparando próximo contador" : phase === "active" ? `${eventName} activa` : `Próxima ${eventName}`}</span>{counterStyle === "ring" ? <div className="overlay-timer-ring"><strong>{timer}</strong></div> : <strong>{timer}</strong>}</div>
        {interactive && <GripHorizontal className="overlay-grip" size={18} />}
        {interactive && <button type="button" aria-label={preview ? "Vista previa del botón cerrar" : "Cerrar y desactivar contador"} onClick={onClose}><X size={15} /></button>}
      </div>
    </section>

    {whale.visible && <section style={{ width: (OVERLAY_WHALE_WIDTH - 8) * normalizedAddonScale, height: whaleHeight } as CSSProperties} className={`overlay-whale-stage whale-counter-${whaleCounterStyle} ${whale.departing ? "departing" : "engaged"}`} aria-label={whale.departing ? "El Riftwalker se retira" : `Riftwalker activo durante ${formatDuration(whale.remainingMs)}`}>
      <div className="overlay-whale-canvas" style={{ top: whaleCanvasOffset, transform: `translateX(-50%) scale(${normalizedAddonScale})` }}>
        <div className="overlay-whale-motion">
          <div className="overlay-whale-swimmer">
            <div className="overlay-whale-boss" aria-hidden="true">
              <span className="boss-segment tail"><img src={GRAVITY_WHALE_BOSS_IMAGE} alt="" /></span>
              <span className="boss-segment body"><img src={GRAVITY_WHALE_BOSS_IMAGE} alt="" /></span>
              <span className="boss-segment head"><img src={GRAVITY_WHALE_BOSS_IMAGE} alt="" /></span>
              <span className="boss-energy"><i /><i /><i /></span>
            </div>
            <div className="overlay-whale-beam">
              <span className="overlay-whale-beam-progress" style={{ width: `${remainingWhalePercent}%` }} />
            </div>
          </div>
        </div>
        {!whale.departing && <div className={`overlay-whale-countdown ${whaleCounterStyle}`} style={{ "--whale-counter-compensation": counterCompensation, "--whale-counter-progress": `${remainingWhalePercent * 3.6}deg`, "--whale-counter-left": `${whaleCounterLeft}px` } as CSSProperties}>
          <small>RIFTWALKER</small>
          <strong>{whaleTimer}</strong>
        </div>}
      </div>
    </section>}
  </div>;
}

function clampAddonScale(value: number) {
  return Math.max(.2, Math.min(1, Number.isFinite(value) ? value : 1));
}

export function whaleScaleWithinWindow(value: number, shape: OverlayShape = "event") {
  const base = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  const maximumScale = Math.min(1, (base.width - 8) / (OVERLAY_WHALE_WIDTH - 8));
  return clampAddonScale(value) * maximumScale;
}

export function whaleCounterScaleWithinWindow(value: number, shape: OverlayShape = "event", style: OverlayCounterStyle = "digital") {
  const base = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  const size = OVERLAY_WHALE_COUNTER_SIZES[style] ?? OVERLAY_WHALE_COUNTER_SIZES.digital;
  const requestedScale = Math.max(.2, Math.min(1.5, Number.isFinite(value) ? value : 1));
  return Math.min(requestedScale, (base.width - 16) / size.width);
}

function whaleStageHeight(addonScale: number, counterScale: number, style: OverlayCounterStyle) {
  const counterHeight = OVERLAY_WHALE_COUNTER_SIZES[style]?.height ?? OVERLAY_WHALE_COUNTER_SIZES.digital.height;
  const bossHeight = (OVERLAY_WHALE_HEIGHT - 4) * addonScale;
  const counterCenter = 91 * addonScale;
  const counterBottom = counterCenter + counterHeight * counterScale / 2 + 8;
  return Math.ceil(whaleCanvasOffsetWithinStage(addonScale, counterScale, style) + Math.max(bossHeight, counterBottom));
}

function whaleCanvasOffsetWithinStage(addonScale: number, counterScale: number, style: OverlayCounterStyle) {
  const counterHeight = OVERLAY_WHALE_COUNTER_SIZES[style]?.height ?? OVERLAY_WHALE_COUNTER_SIZES.digital.height;
  return Math.max(0, counterHeight * counterScale / 2 + 6 - 91 * addonScale);
}

function whaleCounterLeftWithinWindow(addonScale: number, counterScale: number, shape: OverlayShape, style: OverlayCounterStyle) {
  const base = OVERLAY_SHAPE_SIZES[shape] ?? OVERLAY_SHAPE_SIZES.event;
  const counterWidth = (OVERLAY_WHALE_COUNTER_SIZES[style]?.width ?? OVERLAY_WHALE_COUNTER_SIZES.digital.width) * counterScale;
  const halfCounter = counterWidth / 2;
  const rightBoundary = base.width / 2 - halfCounter - 8;
  const beamEndFromCenter = (OVERLAY_WHALE_WIDTH * .97 - OVERLAY_WHALE_WIDTH / 2) * addonScale;
  const finalCenter = Math.min(rightBoundary, beamEndFromCenter - 8 + halfCounter);
  return OVERLAY_WHALE_WIDTH / 2 + finalCenter / addonScale;
}
