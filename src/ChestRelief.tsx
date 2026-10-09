import { memo, useId, type CSSProperties, type ReactNode } from "react";
import { buildEdgeWear, ChestBolt, ChestMaterialDefs, ChestPlateDetails, type MetalDetailKind } from "./ChestMaterials";

type Point = readonly [number, number];
type Wall = { style: CSSProperties; points: string; light: number };
export type ReliefGeometry = {
  width: number; height: number; depth: number; outline: string; cap: string;
  wear: ReturnType<typeof buildEdgeWear>;
  walls: Wall[]; bevels: Wall[];
};

/** Real polygon extrusion. Each wall/bevel is a separate plane, not a thick SVG
 * outline. Fixed geometry is built once below, never in an animation loop. */
export function buildReliefGeometry(width: number, height: number, depth: number, bevel: number, points: readonly Point[]): ReliefGeometry {
  const scale = 1 - bevel * 2 / Math.min(width, height);
  const inner = points.map(([x, y]) => [width / 2 + (x - width / 2) * scale, height / 2 + (y - height / 2) * scale] as Point);
  const outline = points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + "Z";
  const cap = inner.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + "Z";
  const walls: Wall[] = [], bevels: Wall[] = [];
  const shoulder = depth - bevel;
  points.forEach(([ax, ay], i) => {
    const [bx, by] = points[(i + 1) % points.length];
    const length = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / length, ty = (by - ay) / length;
    const inwardX = -ty, inwardY = tx;
    const offsetX = inner[i][0] - ax, offsetY = inner[i][1] - ay;
    const along = offsetX * tx + offsetY * ty, inset = offsetX * inwardX + offsetY * inwardY;
    const bevelHeight = Math.hypot(inset, bevel);
    const vx = inwardX * inset / bevelHeight, vy = inwardY * inset / bevelHeight, vz = bevel / bevelHeight;
    const light = (nx: number, ny: number, nz: number) => Math.max(0, Math.min(1, .28 + (-.5 * nx - .58 * ny + .64 * nz) * .65));
    walls.push({
      points: `0,0 ${length},0 ${length},${shoulder} 0,${shoulder}`,
      light: light(ty, -tx, 0),
      style: { width: length, height: shoulder, transform: `matrix3d(${tx},${ty},0,0,0,0,1,0,${ty},${-tx},0,0,${ax},${ay},0,1)` },
    });
    bevels.push({
      points: `0,0 ${length},0 ${along + length * scale},${bevelHeight} ${along},${bevelHeight}`,
      light: light(ty * vz, -tx * vz, tx * vy - ty * vx),
      style: { width: length, height: bevelHeight, clipPath: `polygon(0% 0%,100% 0%,${(along / length + scale) * 100}% 100%,${along / length * 100}% 100%)`, transform: `matrix3d(${tx},${ty},0,0,${vx},${vy},${vz},0,${ty * vz},${-tx * vz},${tx * vy - ty * vx},0,${ax},${ay},${shoulder},1)` },
    });
  });
  return { width, height, depth, outline, cap, wear: buildEdgeWear(inner), walls, bevels };
}

const octagon = (w: number, h: number, cut: number): Point[] => [[cut, 0], [w - cut, 0], [w, cut], [w, h - cut], [w - cut, h], [cut, h], [0, h - cut], [0, cut]];
const CORNER = buildReliefGeometry(62, 56, 14, 4, octagon(62, 56, 11));
const SIDE_CORNER = buildReliefGeometry(43, 56, 12, 3.5, octagon(43, 56, 9));
const POST = buildReliefGeometry(28, 88, 9, 2.5, octagon(28, 88, 4));
const PANEL = buildReliefGeometry(73, 105, 6, 2.5, [[15, 0], [51, 0], [73, 24], [73, 75], [47, 105], [17, 105], [0, 86], [0, 16]]);
const RIGHT_PANEL = buildReliefGeometry(73, 105, 6, 2.5, [[15, 0], [51, 0], [73, 24], [73, 75], [47, 105], [17, 105], [0, 86], [0, 16]].map(([x, y]) => [73 - x, y] as Point).reverse());
const SIDE_PANEL = buildReliefGeometry(94, 104, 5, 2.5, octagon(94, 104, 15));
const RAIL = buildReliefGeometry(300, 20, 6, 1.5, octagon(300, 20, 6));
const SIDE_RAIL = buildReliefGeometry(160, 20, 5, 1.5, octagon(160, 20, 6));
export const LOCK_RELIEF = buildReliefGeometry(64, 140, 18, 5, [[13, 0], [51, 0], [64, 17], [64, 98], [52, 115], [32, 140], [12, 115], [0, 98], [0, 17]]);
export const LATCH_RELIEF = buildReliefGeometry(64, 51, 13, 4, octagon(64, 51, 11));

function wallColor(light: number, steel: boolean) {
  const low = steel ? [9, 17, 24] : [25, 27, 24];
  const high = steel ? [146, 158, 162] : [189, 174, 139];
  return `rgb(${low.map((channel, i) => Math.round(channel + (high[i] - channel) * light)).join(",")})`;
}

export function ReliefPlate({ geometry, id, x = 0, y = 0, className = "", steel = false, bolt = false, ambient = 1, finish = steel ? geometry.height < 25 ? "rail" : "panel" : bolt ? "corner" : "post", children }: { geometry: ReliefGeometry; id: string; x?: number; y?: number; className?: string; steel?: boolean; bolt?: boolean; ambient?: number; finish?: MetalDetailKind; children?: ReactNode }) {
  const g = geometry;
  const clipId = `machined-cap-${useId().replace(/:/g, "")}`;
  const paint = (name: string) => `url(#${id}-${name})`;
  return <span className={`vault-relief-piece ${className}`} style={{ left: x, top: y, width: g.width, height: g.height }}>
    <svg className="vault-relief-shadow" viewBox={`0 0 ${g.width} ${g.height}`} aria-hidden="true"><path d={g.outline} fill="#000" opacity=".54" stroke="#000" strokeWidth="7" strokeOpacity=".14" /></svg>
    {g.walls.map((wall, i) => <span key={`wall-${i}`} className="vault-relief-wall" style={{ ...wall.style, backgroundColor: wallColor(wall.light * ambient, steel) }} />)}
    {g.bevels.map((wall, i) => <span key={`bevel-${i}`} className="vault-relief-bevel" style={{ ...wall.style, backgroundColor: wallColor(wall.light * ambient, steel) }} />)}
    <svg className="vault-relief-cap" viewBox={`0 0 ${g.width} ${g.height}`} style={{ transform: `translateZ(${g.depth}px)` }} aria-hidden="true">
      <defs><clipPath id={clipId}><path d={g.cap} /></clipPath></defs>
      <path d={g.cap} fill={paint(steel ? "panel" : "gold")} stroke={steel ? "#69797e" : "#ac9c7f"} strokeWidth=".45" />
      <g clipPath={`url(#${clipId})`}><ChestPlateDetails id={id} width={g.width} height={g.height} kind={finish} /><path d={g.cap} fill={paint("grain")} opacity=".8" /></g>
      <path d={g.wear.dark} fill="none" stroke="#050e13" strokeWidth="1.15" opacity=".85" />
      <path className="chest-exposed-edge" d={g.wear.light} fill="none" stroke={steel ? "#c2cbc8" : "#dfd2b8"} strokeWidth=".65" opacity=".8" />
      {bolt && <ChestBolt id={id} x={g.width / 2} y={g.height / 2} radius={6} />}
      {children}
      {ambient < 1 && <path d={g.cap} fill="#06131d" opacity={1 - ambient} />}
    </svg>
  </span>;
}

/** Bronze collars, posts and inset armor project different shadows on the shell. */
const ChestRelief = memo(function ChestRelief({ side = false }: { side?: boolean }) {
  const id = `relief-${useId().replace(/:/g, "")}`;
  const width = side ? 160 : 300;
  const ambient = side ? .72 : 1;
  const corner = side ? SIDE_CORNER : CORNER;
  return <>
    <svg className="vault-relief-materials" aria-hidden="true"><defs><ChestMaterialDefs id={id} /></defs></svg>
    <ReliefPlate geometry={side ? SIDE_RAIL : RAIL} id={id} ambient={ambient} y={3} steel className="vault-raised-rail" />
    <ReliefPlate geometry={side ? SIDE_RAIL : RAIL} id={id} ambient={ambient} y={157} steel className="vault-raised-rail" />
    {side ? <ReliefPlate geometry={SIDE_PANEL} id={id} ambient={ambient} x={33} y={50} steel className="vault-recessed-panel" /> : <>
      <ReliefPlate geometry={PANEL} id={id} ambient={ambient} x={54} y={52} steel className="vault-recessed-panel" />
      <ReliefPlate geometry={RIGHT_PANEL} id={id} ambient={ambient} x={173} y={52} steel className="vault-recessed-panel" />
    </>}
    <ReliefPlate geometry={POST} id={id} ambient={ambient} x={side ? 14 : 21} y={44} className="vault-raised-post" />
    <ReliefPlate geometry={POST} id={id} ambient={ambient} x={width - (side ? 42 : 49)} y={44} className="vault-raised-post" />
    {[0, width - corner.width].flatMap(x => [0, 124].map(y => <ReliefPlate key={`${x}-${y}`} geometry={corner} id={id} ambient={ambient} x={x} y={y} bolt className="vault-corner-armor" />))}
  </>;
});
export default ChestRelief;

export const LockRelief = memo(function LockRelief() {
  const id = `lock-relief-${useId().replace(/:/g, "")}`;
  return <>
    <svg className="vault-relief-materials" aria-hidden="true"><defs><ChestMaterialDefs id={id} /></defs></svg>
    <ReliefPlate geometry={LOCK_RELIEF} id={id} finish="lock" className="vault-lock-solid">
      <path className="vault-lock-bevel" d="M21 13h22l11 12v67l-10 12-12 16-12-16-10-12V25Z" fill={`url(#${id}-bevel)`} />
      <path className="vault-lock-groove" d="M23 19h18l8 10v61l-8 11-9 11-9-11-8-11V29Z" fill="#071723" />
      <path className="vault-lock-crystal" d="m32 40 14 14v39l-14 18-14-18V54Z" fill={`url(#${id}-cyan)`} stroke="#beffff" strokeWidth="1.2" />
      <path className="vault-lock-crystal" d="m32 47 9 10v34l-9 12-9-12V57Z" fill="#32dae9" stroke="#075e77" strokeWidth="1.3" />
      <path className="vault-lock-crystal" d="m32 47 9 10h-5v40l-4 6Z" fill="#006d8d" opacity=".75" />
      <path d="M17 31h30m-27 86 12 13 12-13" fill="none" stroke="#7e745f" strokeWidth="1.1" />
    </ReliefPlate>
  </>;
});

export const LidLatchRelief = memo(function LidLatchRelief() {
  const id = `latch-relief-${useId().replace(/:/g, "")}`;
  return <>
    <svg className="vault-relief-materials" aria-hidden="true"><defs><ChestMaterialDefs id={id} /></defs></svg>
    <ReliefPlate geometry={LATCH_RELIEF} id={id} finish="latch" className="vault-latch-solid">
      <path d="M19 13h26l5 6v18l-6 6H20l-6-6V19Z" fill="#36291f" stroke="#e3b677" strokeWidth="1.4" />
      <path d="M21 16h22l4 5v14l-5 5H22l-5-5V21Z" fill={`url(#${id}-gold)`} stroke="#251d16" strokeWidth="1" />
    </ReliefPlate>
  </>;
});
