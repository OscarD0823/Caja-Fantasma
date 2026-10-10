import { useEffect, useRef, useState } from "react";
import opening from "./assets/chest-opening.mp4";
import poster from "./assets/chest-opening-poster.png";

/** The original opening is recorded at build time. Runtime only decodes a short
 * local, silent video; no mesh, canvas, particles or per-frame JavaScript. */
export default function StartupOpeningVideo({ previewAtMs = 0, onFinished }: { previewAtMs?: number; onFinished: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const finish = useRef(onFinished); finish.current = onFinished;
  const [failed, setFailed] = useState(false);
  const [reducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (failed || reducedMotion) {
      if (previewAtMs > 0) return;
      const timer = window.setTimeout(() => finish.current(), 1200);
      return () => window.clearTimeout(timer);
    }
    const player = video.current;
    if (!player) return;
    let disposed = false;
    const resume = () => {
      if (document.hidden || previewAtMs > 0) { player.pause(); return; }
      void player.play().catch((error: unknown) => {
        if (!disposed && !document.hidden && !(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    };
    const ready = () => {
      if (previewAtMs > 0 && Number.isFinite(player.duration)) player.currentTime = Math.min(player.duration - .05, Math.max(0, previewAtMs / 1000));
      resume();
    };
    const timeout = window.setTimeout(() => { if (!disposed && player.readyState < 2) setFailed(true); }, 2500);
    player.addEventListener("loadedmetadata", ready);
    document.addEventListener("visibilitychange", resume);
    if (player.readyState >= 1) ready(); else resume();
    return () => {
      disposed = true; window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", resume);
      player.removeEventListener("loadedmetadata", ready);
      player.pause();
    };
  }, [failed, reducedMotion, previewAtMs]);
  return <span className="intro-video-stage" aria-hidden="true">
    {failed || reducedMotion ? <img src={poster} alt="" width="640" height="640" /> : <video ref={video} src={opening} poster={poster} width="640" height="640" muted playsInline preload="auto" onEnded={() => finish.current()} onError={() => setFailed(true)} />}
  </span>;
}
