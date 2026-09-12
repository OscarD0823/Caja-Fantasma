import { useEffect, useMemo, useState } from "react";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { PersistedState } from "./model";
import { clampNumber, computeCountdownTransition, computeCycle, computeGravityWhale } from "./model";
import OverlayVisual, { overlayDesignSize } from "./OverlayVisual";
import { loadOverlayPosition, loadState, saveOverlayPosition, saveState } from "./storage";

export default function Overlay() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [now, setNow] = useState(Date.now());
  const cycle = computeCycle(state.settings, now);
  const transition = computeCountdownTransition(state.settings, now);
  const whale = computeGravityWhale(state.settings, now);
  const displayedWhale = state.settings.overlayWhaleEnabled ? whale : { ...whale, visible: false };
  const selectedVision = useMemo(() => state.catalog.visions.find((vision) => vision.id === state.settings.selectedVisionId), [state.catalog.visions, state.settings.selectedVisionId]);
  const overlayScale = clampNumber(state.settings.overlayScale, .2, 1.5);
  const designSize = overlayDesignSize(displayedWhale.visible, state.settings.overlayShape, state.settings.overlayAddonScale);

  const hideOverlay = () => {
    const next = { ...state, settings: { ...state.settings, overlayEnabled: false } };
    saveState(next);
    setState(next);
    void emit("caja-fantasma-overlay-disabled");
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
    let stopped = false;
    let stateTimer = 0;
    let clockTimer = 0;
    const refreshState = () => {
      if (stopped) return;
      onStorage();
      stateTimer = window.setTimeout(refreshState, document.visibilityState === "visible" ? 15_000 : 60_000);
    };
    const refreshClock = () => {
      if (stopped) return;
      setNow(Date.now());
      clockTimer = window.setTimeout(refreshClock, document.visibilityState === "visible" ? 1_000 : 10_000);
    };
    stateTimer = window.setTimeout(refreshState, 15_000);
    clockTimer = window.setTimeout(refreshClock, 1_000);
    return () => {
      stopped = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("caja-fantasma-state", onStorage as EventListener);
      window.clearTimeout(stateTimer);
      window.clearTimeout(clockTimer);
    };
  }, []);

  useEffect(() => {
    const overlayWindow = getCurrentWindow();
    void overlayWindow.setSize(new LogicalSize(Math.round(designSize.width * overlayScale), Math.round(designSize.height * overlayScale)));
  }, [designSize.height, designSize.width, overlayScale]);

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
    <div className="floating-overlay" onMouseDown={(event) => { if ((event.target as HTMLElement).closest("button")) return; void getCurrentWindow().startDragging(); }}>
      <div className="overlay-scale-stage" style={{ width: designSize.width, height: designSize.height, transform: `scale(${overlayScale})` }}>
        <OverlayVisual vision={selectedVision} phase={cycle.phase} remainingMs={cycle.remainingMs} progress={cycle.progress} transitionRemainingMs={transition.active ? transition.remainingMs : 0} whale={displayedWhale} addonScale={state.settings.overlayAddonScale} shape={state.settings.overlayShape} counterStyle={state.settings.overlayCounterStyle} nameMode={state.settings.overlayNameMode} customName={state.settings.overlayCustomName} onClose={hideOverlay} />
      </div>
    </div>
  );
}
