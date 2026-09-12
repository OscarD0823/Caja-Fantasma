import { useMemo, useState } from "react";
import { Eye, MonitorUp, Radio, Waves } from "lucide-react";
import type { Catalog, GravityWhaleSnapshot, OverlayCounterStyle, OverlayNameMode, OverlayShape } from "./model";
import { clampNumber } from "./model";
import OverlayVisual, { overlayDesignSize } from "./OverlayVisual";

type Props = {
  catalog: Catalog;
  scale: number;
  addonScale: number;
  shape: OverlayShape;
  counterStyle: OverlayCounterStyle;
  nameMode: OverlayNameMode;
  customName: string;
  onScaleChange: (scale: number) => void;
  onAddonScaleChange: (scale: number) => void;
  onAppearanceChange: (patch: Partial<{ shape: OverlayShape; counterStyle: OverlayCounterStyle; nameMode: OverlayNameMode; customName: string }>) => void;
  onOpenRealOverlay: () => void;
};

type WhaleMode = "hidden" | "active" | "departing";

export default function OverlayPreviewLab({ catalog, scale, addonScale, shape, counterStyle, nameMode, customName, onScaleChange, onAddonScaleChange, onAppearanceChange, onOpenRealOverlay }: Props) {
  const publicVisionId = catalog.eventTiming?.selectedVisionId ?? catalog.visions.find((vision) => vision.enabled)?.id ?? catalog.visions[0]?.id;
  const [visionId, setVisionId] = useState(publicVisionId);
  const [phase, setPhase] = useState<"waiting" | "active" | "transition">("active");
  const [whaleMode, setWhaleMode] = useState<WhaleMode>("hidden");
  const vision = catalog.visions.find((item) => item.id === visionId) ?? catalog.visions[0];
  const normalizedScale = clampNumber(scale, .2, 1.5);
  const normalizedAddonScale = clampNumber(addonScale, .2, 1);
  const whale = useMemo<GravityWhaleSnapshot>(() => ({
    visible: vision?.id === "gravity" && whaleMode !== "hidden",
    departing: whaleMode === "departing",
    remainingMs: whaleMode === "departing" ? 0 : 12 * 60_000 + 34_000,
    progress: whaleMode === "departing" ? 1 : .38,
  }), [vision?.id, whaleMode]);
  const designSize = overlayDesignSize(whale.visible, shape, normalizedAddonScale);

  return <section className="overlay-lab">
    <div className="overlay-lab-heading">
      <div><span className="eyebrow"><Eye size={15} /> LABORATORIO VISUAL</span><h3>Probar ventana flotante</h3><p>Esta simulación no cambia la rueda ni el contador de los demás.</p></div>
      <button type="button" className="secondary compact" onClick={onOpenRealOverlay}><MonitorUp size={15} /> Abrir ventana real</button>
    </div>

    <div className="overlay-lab-controls">
      <label>Rueda<select value={vision?.id ?? ""} onChange={(event) => { setVisionId(event.target.value); if (event.target.value !== "gravity") setWhaleMode("hidden"); }}>{catalog.visions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.enabled ? "" : " · desactivada"}</option>)}</select></label>
      <label>Forma<select value={shape} onChange={(event) => onAppearanceChange({ shape: event.target.value as OverlayShape })}><option value="event">Automática por evento</option><option value="rectangle">Rectangular</option><option value="square">Cuadrada</option><option value="vertical">Vertical</option><option value="round">Redonda</option></select></label>
      <label>Contador<select value={counterStyle} onChange={(event) => onAppearanceChange({ counterStyle: event.target.value as OverlayCounterStyle })}><option value="digital">Digital</option><option value="compact">Compacto</option><option value="ring">Anillo</option></select></label>
      <label>Nombre<select value={nameMode} onChange={(event) => onAppearanceChange({ nameMode: event.target.value as OverlayNameMode })}><option value="spanish">Español</option><option value="english">Inglés</option><option value="custom">Personalizado</option></select></label>
      {nameMode === "custom" && <label>Nombre personalizado<input maxLength={40} value={customName} placeholder="Mi evento" onChange={(event) => onAppearanceChange({ customName: event.target.value })} /></label>}
      <div><span>Fase</span><div className="preview-choice"><button type="button" className={phase === "waiting" ? "selected" : ""} onClick={() => setPhase("waiting")}><Radio size={14} /> Espera</button><button type="button" className={phase === "active" ? "selected" : ""} onClick={() => setPhase("active")}><Radio size={14} /> Activa</button><button type="button" className={phase === "transition" ? "selected" : ""} onClick={() => setPhase("transition")}><Radio size={14} /> Retraso</button></div></div>
      <div><span>Ballena</span><div className="preview-choice"><button type="button" className={whaleMode === "hidden" ? "selected" : ""} onClick={() => setWhaleMode("hidden")}>Oculta</button><button type="button" disabled={vision?.id !== "gravity"} className={whaleMode === "active" ? "selected" : ""} onClick={() => setWhaleMode("active")}><Waves size={14} /> Disparando</button><button type="button" disabled={vision?.id !== "gravity"} className={whaleMode === "departing" ? "selected" : ""} onClick={() => setWhaleMode("departing")}>Salida</button></div></div>
      <label className="overlay-size-control"><span>Tamaño de ventana <strong>{Math.round(normalizedScale * 100)}%</strong></span><input type="range" min={20} max={150} step={5} value={Math.round(normalizedScale * 100)} onChange={(event) => onScaleChange(Number(event.target.value) / 100)} /></label>
      <label className="overlay-size-control"><span>Área de Ballena <strong>{Math.round(normalizedAddonScale * 100)}%</strong></span><input type="range" min={20} max={100} step={5} value={Math.round(normalizedAddonScale * 100)} onChange={(event) => onAddonScaleChange(Number(event.target.value) / 100)} /></label>
    </div>

    <div className="overlay-lab-canvas" style={{ minHeight: Math.round(designSize.height * normalizedScale) + 28 }}>
      <div className="overlay-scale-stage" style={{ width: designSize.width, height: designSize.height, transform: `scale(${normalizedScale})` }}>
        <OverlayVisual vision={vision} phase={phase === "active" ? "active" : "waiting"} remainingMs={phase === "active" ? 12 * 60_000 + 34_000 : 17 * 60_000 + 8_000} progress={.58} transitionRemainingMs={phase === "transition" ? 2_800 : 0} whale={whale} addonScale={normalizedAddonScale} shape={shape} counterStyle={counterStyle} nameMode={nameMode} customName={customName} preview />
      </div>
    </div>
  </section>;
}
