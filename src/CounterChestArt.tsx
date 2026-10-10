import { memo, useEffect, useRef, type CSSProperties } from "react";
import CrateOpeningArt from "./CrateOpeningArt";
import { GhostMark, ShinyModuleMark } from "./GameLogoMark";

// Point changes update the charge ring, not the static chest/ghost subtree.
const CounterChestScene = memo(function CounterChestScene() {
  return <span className="counter-chest-scene"><CrateOpeningArt compact keyMark={<ShinyModuleMark />} ghostMark={<GhostMark />} /></span>;
});

/** Shares the real lid/ghost choreography; no image wobble, timers or frame loop. */
const CounterChestArt = memo(function CounterChestArt({ previewAtMs = 0, value = 0, target = 1000 }: { previewAtMs?: number; value?: number; target?: number }) {
  const preview = import.meta.env.DEV && previewAtMs > 0;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || preview || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { element.dataset.motionPaused = String(!entry.isIntersecting); });
    observer.observe(element);
    return () => observer.disconnect();
  }, [preview]);
  const fraction = Number.isFinite(value) ? Math.max(0, Math.min(1, value / (Number.isFinite(target) ? Math.max(1, target) : 1000))) : 0;
  return <div ref={root} className={`ghost-orbit counter-chest ${fraction >= 1 ? "primed" : fraction > 0 ? "charging" : "dormant"}${preview ? " counter-preview" : ""}`} style={{ "--chest-charge": fraction, ...(preview ? { "--counter-preview-time": Math.min(13900, previewAtMs) } : {}) } as CSSProperties} aria-hidden="true">
    <svg className="chest-charge-ring" viewBox="0 0 176 176"><circle className="charge-rail" cx="88" cy="88" r="77" /><circle className="charge-value" cx="88" cy="88" r="77" pathLength="100" strokeDasharray={`${fraction * 100} 100`} /><path className="charge-circuit" d="M6 88h12l8 8h12m100 0h12l8-8h12M88 8v11m0 138v11" /></svg>
    <span key={value} className="chest-reward-response" />
    <CounterChestScene />
  </div>;
});

export default CounterChestArt;
