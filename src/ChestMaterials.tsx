/** Shared metal finishes for the assembled chest and its small app emblem.
 * Scratches are static vector marks: no bitmap slices, noise filter or render loop. */
export function ChestMaterialDefs({ id, grainScale = 1 }: { id: string; grainScale?: number }) {
  return <>
    <linearGradient id={`${id}-steel`} x1=".08" y1="0" x2=".78" y2="1">
      <stop stopColor="#6d7b82" /><stop offset=".09" stopColor="#29343c" /><stop offset=".115" stopColor="#b2b9b6" /><stop offset=".14" stopColor="#48545c" /><stop offset=".31" stopColor="#242e37" /><stop offset=".63" stopColor="#131e28" /><stop offset=".84" stopColor="#3b474f" /><stop offset="1" stopColor="#101820" />
    </linearGradient>
    <linearGradient id={`${id}-gold`} x1=".08" y1=".05" x2=".85" y2="1">
      <stop stopColor="#998262" /><stop offset=".055" stopColor="#d9c49b" /><stop offset=".085" stopColor="#e9dac0" /><stop offset=".12" stopColor="#897252" /><stop offset=".29" stopColor="#594632" /><stop offset=".46" stopColor="#887052" /><stop offset=".58" stopColor="#a98b61" /><stop offset=".66" stopColor="#4a3c2d" /><stop offset=".86" stopColor="#756048" /><stop offset="1" stopColor="#b29a75" />
    </linearGradient>
    <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2=".8" y2="1">
      <stop stopColor="#e6d8bc" /><stop offset=".085" stopColor="#afa084" /><stop offset=".14" stopColor="#e5d4b0" /><stop offset=".22" stopColor="#74634c" /><stop offset=".51" stopColor="#40362b" /><stop offset=".78" stopColor="#8b795c" /><stop offset=".9" stopColor="#2d2923" /><stop offset="1" stopColor="#bea989" />
    </linearGradient>
    <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="1" y2=".9">
      <stop stopColor="#48555d" /><stop offset=".12" stopColor="#29343b" /><stop offset=".18" stopColor="#57616a" /><stop offset=".25" stopColor="#242e36" /><stop offset=".7" stopColor="#111c25" /><stop offset="1" stopColor="#36424a" />
    </linearGradient>
    <linearGradient id={`${id}-cyan`} x1="0" y1="0" x2="1" y2="0">
      <stop stopColor="#008ca9" /><stop offset=".28" stopColor="#40e7f6" /><stop offset=".5" stopColor="#baffff" /><stop offset=".75" stopColor="#1dd8ec" /><stop offset="1" stopColor="#037895" />
    </linearGradient>
    <radialGradient id={`${id}-bolt`} cx=".32" cy=".24">
      <stop stopColor="#d5c7ad" /><stop offset=".18" stopColor="#7e705c" /><stop offset=".42" stopColor="#3f3a33" /><stop offset=".66" stopColor="#161e23" /><stop offset=".76" stopColor="#aea38d" /><stop offset=".84" stopColor="#594e3d" /><stop offset="1" stopColor="#2c2a25" />
    </radialGradient>
    <radialGradient id={`${id}-oxidation`} cx=".14" cy=".85" r=".95">
      <stop stopColor="#101b1b" stopOpacity=".64" /><stop offset=".3" stopColor="#342a20" stopOpacity=".28" /><stop offset=".57" stopColor="#263032" stopOpacity=".08" /><stop offset="1" stopColor="#15222b" stopOpacity="0" />
    </radialGradient>
    <pattern id={`${id}-brushed`} width="97" height="13" patternUnits="userSpaceOnUse" patternTransform={`scale(${grainScale}) skewX(-12)`}>
      <path d="M0 1h21m15 0h61M7 5h57m17 0h16M0 9h47m10 0h27" stroke="#ced2c8" strokeWidth=".24" opacity=".28" />
      <path d="M0 2h69m12 0h16M0 7h31m17 0h49M11 11h55m14 0h17" stroke="#030b12" strokeWidth=".45" opacity=".34" />
    </pattern>
    <pattern id={`${id}-grain`} width="97" height="73" patternUnits="userSpaceOnUse" patternTransform={`scale(${grainScale})`}>
      <path d="m8 7 3-1 1 1-2 2Zm48 25 2-1 2 1-2 1ZM4 61l2-1 1 2-2 1Zm69-4 3-1 1 1-4 2Z" fill="#080d13" opacity=".35" />
      <path d="m11 8 2-1m37 4 4-1m29 47 2-1M18 66l2-1" fill="none" stroke="#b0b2a7" strokeWidth=".45" opacity=".3" />
      <path d="m4 18 9-2m13 1 5-1m37 32 13-3M18 61l4-2m51-48 12-3M28 46l7-3m19-31 8-2" stroke="#c3c7c3" strokeWidth=".35" opacity=".3" />
      <path d="M4 19l9-2m14 1 5-1m37 32 13-3M18 62l4-2M6 34l31-5m24 37 16-4M48 24l28-5" stroke="#02080c" strokeWidth=".75" opacity=".52" />
      <path d="M15 53h.6m26-9h.5m37-8h.6M66 62h.7M36 6h.5M92 25h.8M33 68h.7" stroke="#e8e0cc" strokeWidth=".65" opacity=".4" />
    </pattern>
  </>;
}

/** Countersunk circular hardware stays readable at both launch and icon sizes. */
export function ChestBolt({ x, y, radius = 6, id }: { x: number; y: number; radius?: number; id: string }) {
  const socket = Array.from({ length: 6 }, (_, i) => `${x + Math.cos(i * Math.PI / 3) * radius * .42},${y + Math.sin(i * Math.PI / 3) * radius * .42}`).join(" ");
  return <g className="chest-countersunk-bolt">
    <circle cx={x} cy={y} r={radius + 1.7} fill="#151b1c" stroke="#9e8f72" strokeWidth=".6" />
    <circle cx={x} cy={y + .7} r={radius + .4} fill="#030b11" />
    <circle cx={x} cy={y} r={radius} fill={`url(#${id}-bolt)`} stroke="#262a27" strokeWidth=".7" />
    <circle cx={x} cy={y} r={radius * .73} fill="none" stroke="#a59d8b" strokeWidth=".35" opacity=".7" />
    <polygon className="chest-hex-socket" points={socket} fill="#060d13" stroke="#9c9582" strokeWidth=".5" />
    <path d={`M${x - radius * .24} ${y + radius * .28}h${radius * .4}m${-radius * .92} ${-radius * .77}l${radius * .2} ${-radius * .13}m${radius * 1.3} ${radius * .86}l${radius * .16} ${-radius * .1}`} stroke="#d2c8ad" strokeWidth=".5" opacity=".8" />
  </g>;
}

export type MetalDetailKind = "corner" | "post" | "panel" | "rail" | "lock" | "latch";

/** Fixed machining marks and edge chips; no random values or animated noise. */
export function buildEdgeWear(points: readonly (readonly [number, number])[]) {
  let light = "", dark = "";
  const line = (x: number, y: number, dx: number, dy: number) => `M${x.toFixed(2)} ${y.toFixed(2)}l${dx.toFixed(2)} ${dy.toFixed(2)}`;
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    const dx = nx - x, dy = ny - y, length = Math.hypot(dx, dy);
    const insetX = -dy / length, insetY = dx / length;
    for (const fraction of [.13 + (i % 3) * .045, .64 - (i % 4) * .04]) {
      light += line(x + dx * fraction + insetX * .6, y + dy * fraction + insetY * .6, dx * .15, dy * .15);
      dark += line(x + dx * fraction + insetX * 1.2, y + dy * fraction + insetY * 1.2, dx * .15, dy * .15);
    }
  });
  return { light, dark };
}

/** Manufacturing detail is distinct from wear: seams, vent recesses, tool marks,
 * inspection stamps and captive screws, clipped to each physical cap by callers. */
export function ChestPlateDetails({ id, width: w, height: h, kind }: { id: string; width: number; height: number; kind: MetalDetailKind }) {
  const paint = (name: string) => `url(#${id}-${name})`;
  return <g className={`chest-machining machining-${kind}`}>
    <rect width={w} height={h} fill={paint("brushed")} />
    <rect width={w} height={h} fill={paint("oxidation")} opacity={kind === "panel" ? .5 : .8} />
    {kind === "corner" && <>
      <path d={`M13 8H${w - 13}L${w - 8} 13V${h - 13}L${w - 13} ${h - 8}H13L8 ${h - 13}V13Z`} fill="none" stroke="#2a2924" strokeWidth="1.8" />
      <path d={`M13 7.5H${w - 13}L${w - 8} 12.5M8 ${h - 15}V13`} fill="none" stroke="#c5b79b" strokeWidth=".5" />
      <path d={`M12 ${h - 13}h7m2 0h3m${w - 40} ${-h + 27}h5m-1 3h3`} fill="none" stroke="#0e1a1d" strokeWidth=".8" opacity=".7" />
      <path d={`M12 17l4-3m-3 22 7-3M${w - 14} ${h - 16}l-4 3`} fill="none" stroke="#d6c7aa" strokeWidth=".45" opacity=".6" />
    </>}
    {kind === "post" && <>
      <path d={`M8 7V${h - 7}m${w - 16} ${-h + 14}V${h - 7}`} stroke="#2a2822" strokeWidth="2" />
      <path d={`M9 9V${h - 9}m${w - 17} ${-h + 18}V${h - 9}`} stroke="#c5b699" strokeWidth=".4" />
      <path d={`M11 27h${w - 22}m${22 - w} 3h${w - 22}m${22 - w} ${h - 58}h${w - 22}`} stroke="#161e1e" strokeWidth="1.8" />
      <ChestBolt id={id} x={w / 2} y={15} radius={2.2} /><ChestBolt id={id} x={w / 2} y={h - 15} radius={2.2} />
    </>}
    {kind === "panel" && <>
      <path d={`M17 10H${w - 21}L${w - 10} 22V${h - 25}L${w - 27} ${h - 10}H20L10 ${h - 21}V22Z`} fill="none" stroke="#080f15" strokeWidth="2.2" />
      <path d={`M17 9H${w - 21}L${w - 10} 21M10 23V${h - 23}`} fill="none" stroke="#818a8b" strokeWidth=".5" opacity=".65" />
      <path d={`M24 29h${w - 48}m${48 - w} 5h${w - 48}m${48 - w} 5h${w - 48}`} stroke="#080f15" strokeWidth="2.3" />
      <path d={`M24 30h${w - 48}m${48 - w} 5h${w - 48}m${48 - w} 5h${w - 48}`} stroke="#66787e" strokeWidth=".45" />
      <path d={`M21 ${h - 29}h9m4 0h11m4 0h${Math.max(0, w - 71)}M21 ${h - 25}h${w - 44}`} stroke="#80918f" strokeWidth=".5" opacity=".4" />
      <ChestBolt id={id} x={22} y={18} radius={1.5} /><ChestBolt id={id} x={w - 22} y={h - 17} radius={1.5} />
      <text x="21" y={h - 35} fill="#9aa29b" opacity=".4" fontFamily="Consolas,monospace" fontSize="4">CF / ALLOY-07</text>
    </>}
    {kind === "rail" && <>
      <path d={`M9 8H${w - 9}m${18 - w} 3H${w - 9}`} fill="none" stroke="#0d1419" strokeWidth=".7" />
      <path d={`M22 5v10m12-10v10M${w - 34} 5v10m12-10v10`} stroke="#8a9290" strokeWidth=".55" opacity=".45" />
      <path d={`M${w * .27} 5h7m3 0h12M${w * .61} 14h14`} stroke="#c7c9ba" strokeWidth=".55" opacity=".55" />
    </>}
    {(kind === "lock" || kind === "latch") && <>
      <path d={`M13 13h7m${w - 40} 0h7M13 ${h - 19}l4 3m${w - 34} -3-4 3`} stroke="#d3c4a5" strokeWidth=".6" opacity=".55" fill="none" />
      <ChestBolt id={id} x={w / 2} y={kind === "lock" ? 25 : 10} radius={1.8} />
    </>}
  </g>;
}
