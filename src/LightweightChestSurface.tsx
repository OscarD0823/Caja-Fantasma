import { memo, type CSSProperties } from "react";
import atlas from "./assets/chest-surfaces.png";

export type ChestSurfaceKind = "front" | "side" | "end" | "underside" | "latch";
const POSITIONS: Record<ChestSurfaceKind, string> = { front: "0 0", side: "-300px 0", end: "-300px -180px", underside: "0 -340px", latch: "-300px -232px" };

/** Static metalwork is baked from our own model once at build time. The real
 * box faces and hinged lid still move independently; no animation sprite sheet. */
export const LightweightChestSurface = memo(function LightweightChestSurface({ kind }: { kind: ChestSurfaceKind }) {
  return <span className={`vault-texture texture-${kind}`} style={{ backgroundImage: `url(${atlas})`, backgroundPosition: POSITIONS[kind] }} />;
});

export function roofTexture(index: number, height: number): CSSProperties {
  const scaleY = height / 20;
  return { backgroundImage: `url(${atlas})`, backgroundSize: `512px ${512 * scaleY}px`, backgroundPosition: `0 -${(180 + index * 20) * scaleY}px` };
}
