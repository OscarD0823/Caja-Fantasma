import { memo, type CSSProperties } from "react";
import CrateOpeningArt from "./CrateOpeningArt";
import { GhostMark, ShinyModuleMark } from "./GameLogoMark";

/** Shares the real lid/ghost choreography; no image wobble, timers or frame loop. */
const CounterChestArt = memo(function CounterChestArt({ previewAtMs = 0 }: { previewAtMs?: number }) {
  const preview = import.meta.env.DEV && previewAtMs > 0;
  return <div className={`ghost-orbit counter-chest${preview ? " counter-preview" : ""}`} style={preview ? { "--counter-preview-time": Math.min(13900, previewAtMs) } as CSSProperties : undefined} aria-hidden="true">
    <span className="counter-chest-scene"><CrateOpeningArt compact keyMark={<ShinyModuleMark />} ghostMark={<GhostMark />} /></span>
  </div>;
});

export default CounterChestArt;
