import { useEffect, useMemo, useState } from "react";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Box, GripHorizontal, X, Zap } from "lucide-react";
import { GRAVITY_EVENT_IMAGE_A, GRAVITY_EVENT_IMAGE_B, GRAVITY_WHALE_BEAM_IMAGE, GRAVITY_WHALE_PASS_IMAGE, LUNAR_EVENT_IMAGE, SYMBIOSIS_EVENT_IMAGE } from "./assets";
import type { PersistedState } from "./model";
import { computeCycle, computeGravityWhale, formatDuration } from "./model";
import { loadOverlayPosition, loadState, saveOverlayPosition, saveState } from "./storage";

const BASE_OVERLAY_SIZE = { width: 430, height: 108 };
const WHALE_OVERLAY_SIZE = { width: 520, height: 258 };

export default function Overlay() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [now, setNow] = useState(Date.now());
  const cycle = computeCycle(state.settings, now);
  const whale = computeGravityWhale(state.settings, now);
  const selectedVision = useMemo(() => state.catalog.visions.find((vision) => vision.id === state.settings.selectedVisionId), [state.catalog.visions, state.settings.selectedVisionId]);
  const remainingWhalePercent = Math.max(0, Math.min(100, Math.round((1 - whale.progress) * 100)));

  const hideOverlay = () => {
    const next = { ...state, settings: { ...state.settings, overlayEnabled: false } };
    saveState(next);
    setState(next);
    void getCurrentWindow().hide();
  };

  useEffect(() => {
    document.documentElement.classList.add("overlay-document");
    document.body.classList.add("overlay-document");
    return () => {
      document.documentElement.classList.remove("overlay-document");
      document.body.classList.remove("overlay-document");
    };
  }, []);

  useEffect(() => {
    const onStorage = () => setState(loadState());
    window.addEventListener("storage", onStorage);
    window.addEventListener("caja-fantasma-state", onStorage as EventListener);
    const stateTimer = window.setInterval(onStorage, 2000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("caja-fantasma-state", onStorage as EventListener);
      window.clearInterval(stateTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    const overlayWindow = getCurrentWindow();
    const size = whale.visible ? WHALE_OVERLAY_SIZE : BASE_OVERLAY_SIZE;
    void overlayWindow.setSize(new LogicalSize(size.width, size.height));
  }, [whale.visible]);

  useEffect(() => {
    const overlayWindow = getCurrentWindow();
    const savedPosition = loadOverlayPosition();
    if (savedPosition) void overlayWindow.setPosition(new PhysicalPosition(savedPosition.x, savedPosition.y));
    let unlisten: (() => void) | undefined;
    let pendingSave: number | undefined;
    void overlayWindow.onMoved(({ payload }) => {
      if (pendingSave !== undefined) window.clearTimeout(pendingSave);
      pendingSave = window.setTimeout(() => saveOverlayPosition({ x: payload.x, y: payload.y }), 180);
    }).then((stop) => { unlisten = stop; });
    return () => {
      unlisten?.();
      if (pendingSave !== undefined) window.clearTimeout(pendingSave);
    };
  }, []);

  return (
    <div className={`floating-overlay ${cycle.phase} vision-${selectedVision?.id ?? "none"} ${whale.visible ? "with-whale" : ""}`} onMouseDown={(event) => { if ((event.target as HTMLElement).closest("button")) return; void getCurrentWindow().startDragging(); }}>
      <section className="overlay-main-shell" aria-label="Contador de Rueda Visional">
        <div className="overlay-event-scene" aria-hidden="true">
          {selectedVision?.id === "lunar" && <img className="overlay-scene-image lunar" src={LUNAR_EVENT_IMAGE} alt="" />}
          {selectedVision?.id === "symbiosis" && <img className="overlay-scene-image symbiosis" src={SYMBIOSIS_EVENT_IMAGE} alt="" />}
          {selectedVision?.id === "gravity" && <><img className="overlay-scene-image gravity scene-a" src={GRAVITY_EVENT_IMAGE_A} alt="" /><img className="overlay-scene-image gravity scene-b" src={GRAVITY_EVENT_IMAGE_B} alt="" /></>}
        </div>
        <span className="overlay-event-vignette" aria-hidden="true" />
        <div className="overlay-content">
          <div className="overlay-icon">{cycle.phase === "active" ? <Zap size={23} /> : <Box size={23} />}</div>
          <div className="overlay-copy"><span>{cycle.phase === "active" ? `${selectedVision?.name ?? "Rueda"} activa` : `Próxima ${selectedVision?.name ?? "Rueda"}`}</span><strong>{formatDuration(cycle.remainingMs)}</strong></div>
          <GripHorizontal className="overlay-grip" size={18} />
          <button type="button" aria-label="Ocultar contador" onClick={hideOverlay}><X size={15} /></button>
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
    </div>
  );
}
