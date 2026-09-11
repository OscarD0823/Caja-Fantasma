import { useEffect, useMemo, useState } from "react";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Box, GripHorizontal, Sparkles, X, Zap } from "lucide-react";
import type { PersistedState } from "./model";
import { computeCycle, formatDuration } from "./model";
import { loadOverlayPosition, loadState, saveOverlayPosition, saveState } from "./storage";

export default function Overlay() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [now, setNow] = useState(Date.now());
  const cycle = computeCycle(state.settings, now);
  const selectedVision = useMemo(() => state.catalog.visions.find((vision) => vision.id === state.settings.selectedVisionId), [state.catalog.visions, state.settings.selectedVisionId]);

  const hideOverlay = () => {
    const next = { ...state, settings: { ...state.settings, overlayEnabled: false } };
    saveState(next);
    setState(next);
    void getCurrentWindow().hide();
  };

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
    <div className={`floating-overlay ${cycle.phase} vision-${selectedVision?.id ?? "none"}`} onMouseDown={(event) => { if ((event.target as HTMLElement).closest("button")) return; void getCurrentWindow().startDragging(); }}>
      <div className="overlay-icon">{cycle.phase === "active" ? <Zap size={23} /> : <Box size={23} />}</div>
      <div className="overlay-copy"><span>{cycle.phase === "active" ? `${selectedVision?.name ?? "Rueda"} activa` : `Próxima ${selectedVision?.name ?? "Rueda"}`}</span><strong>{formatDuration(cycle.remainingMs)}</strong></div>
      <Sparkles className="overlay-spark" size={15} />
      <GripHorizontal className="overlay-grip" size={18} />
      <button type="button" aria-label="Ocultar contador" onClick={hideOverlay}><X size={15} /></button>
    </div>
  );
}
