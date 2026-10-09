import { useId, type CSSProperties, type ReactNode } from "react";

/** Static vector metalwork, not a crop of the illustration or a per-frame renderer. */
function Metalwork({ side = false, lid = false }: { side?: boolean; lid?: boolean }) {
  const id = `vault-${useId().replace(/:/g, "")}`;
  const width = side ? 160 : 300;
  const height = lid ? 52 : 180;
  const paint = (name: string) => `url(#${id}-${name})`;
  const bodyOutline = lid
    ? "M0 50C0 22 29 0 80 0S160 22 160 50Z"
    : `M8 0H${width - 8}L${width} 8V172L${width - 8} 180H8L0 172V8Z`;
  const plateOutline = lid
    ? "M13 43C18 22 38 10 80 10S142 22 147 43Z"
    : `M15 30H${width - 15}V144L${width - 29} 160H29L15 144Z`;
  return <svg className="vault-metalwork" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2=".8" y2="1">
        <stop stopColor="#737c84" /><stop offset=".16" stopColor="#343e49" /><stop offset=".55" stopColor="#202831" /><stop offset=".82" stopColor="#434e57" /><stop offset="1" stopColor="#111920" />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2=".7">
        <stop stopColor="#725032" /><stop offset=".15" stopColor="#ebc38a" /><stop offset=".22" stopColor="#997047" /><stop offset=".47" stopColor="#d8ab66" /><stop offset=".72" stopColor="#72502d" /><stop offset=".93" stopColor="#e4b771" /><stop offset="1" stopColor="#50351f" />
      </linearGradient>
      <radialGradient id={`${id}-bolt`} cx=".35" cy=".25">
        <stop stopColor="#fff2c7" /><stop offset=".3" stopColor="#aa7948" /><stop offset=".65" stopColor="#3b291c" /><stop offset=".83" stopColor="#d4a05d" /><stop offset="1" stopColor="#261b15" />
      </radialGradient>
      <pattern id={`${id}-grain`} width="49" height="37" patternUnits="userSpaceOnUse">
        <path d="M2 5l9-2m12 15 5-2m9 15 7-2M5 31l3-2m32-24 5-1M16 22l6-4" stroke="#d7d4c7" strokeWidth=".6" opacity=".14" />
        <path d="M1 15l12-1m11 13 12-5M18 4l11-2" stroke="#050b10" strokeWidth=".8" opacity=".4" />
        <path d="M6 10h1m25 14h1m-17 9h1" stroke="#efe3c8" opacity=".2" />
      </pattern>
      <clipPath id={`${id}-outline`}><path d={bodyOutline} /></clipPath>
    </defs>
    <g clipPath={paint("outline")}>
      <path d={bodyOutline} fill={paint("steel")} stroke="#111a21" strokeWidth="4" />
      <path d={plateOutline} fill="#111b23" stroke="#a8a394" strokeWidth="1" />
      <path d={plateOutline} fill={paint("steel")} transform={lid ? "translate(0 2)" : "translate(0 4)"} stroke="#060e14" strokeWidth="3" />
      {!lid && <>
        <path d={`M5 5H${width - 5}L${width - 14} 23H14ZM12 164H${width - 12}L${width - 3} 178H3Z`} fill={paint("steel")} stroke="#a2a397" strokeWidth="1.4" />
        <path d={`M10 27H${width - 10}M25 162H${width - 25}`} stroke="#070e14" strokeWidth="5" />
        <path className="vault-luminous-line" d={`M14 27H${width - 14}M31 160H${width - 31}`} stroke="#45dfff" strokeWidth="3" />
        <path d={side ? "M26 45h108v78l-15 18H41l-15-18Z" : "M73 52h38l28 26v55l-29 22H73l-12-13V65ZM227 52h-38l-28 26v55l29 22h37l12-13V65Z"} fill="#18232c" stroke="#9b7247" strokeWidth="3" />
        <path d={side ? "M30 49h100v72l-14 16H44l-14-16Z" : "M76 57h33l23 23v50l-24 19H77l-9-10V70ZM224 57h-33l-23 23v50l24 19h31l9-10V70Z"} fill={paint("steel")} stroke="#030a10" strokeWidth="3" />
        <path d={`M29 23v130h19V23ZM${width - 48} 23v130h19V23Z`} fill={paint("gold")} stroke="#1a1511" strokeWidth="3" />
        <path className="vault-luminous-line" d={`M53 39v101M${width - 53} 39v101`} stroke="#39dfff" strokeWidth="4" />
        {[0, width - 47].map((x) => <g key={x} transform={`translate(${x})`}>
          <path d="M4 4h34l9 10v23l-10 10H9L1 37V13ZM8 145h29l10 10v18l-7 7H6l-5-7v-19Z" fill={paint("gold")} stroke="#24180f" strokeWidth="2" />
          <path d="M7 8h28l7 7v19l-7 8H11l-6-7V15ZM11 150h23l8 8v13l-5 5H9l-4-5v-15Z" fill="none" stroke="#f5d297" strokeWidth=".8" opacity=".8" />
          <circle cx="23" cy="24" r="6.5" fill={paint("bolt")} stroke="#120e0a" strokeWidth="2" /><circle cx="23" cy="162" r="6.5" fill={paint("bolt")} stroke="#120e0a" strokeWidth="2" />
        </g>)}
      </>}
      {lid && <>
        <path d="M2 49C3 23 28 2 80 2s77 21 78 47h-13C140 27 120 13 80 13S20 27 15 49Z" fill={paint("gold")} stroke="#e8c28c" strokeWidth=".7" />
        <path className="vault-luminous-line" d="M36 43h30l4-6h22l5 6h30" stroke="#39dfff" strokeWidth="3" fill="none" />
        <circle cx="12" cy="41" r="4" fill={paint("bolt")} /><circle cx="148" cy="41" r="4" fill={paint("bolt")} />
      </>}
      <path d={bodyOutline} fill={paint("grain")} />
    </g>
  </svg>;
}

// Eight contiguous physical plates form a vaulted lid (a 160 × 48 ellipse),
// all sharing one rear hinge. Computed once; no timers, canvas or render loop.
const ROOF_PLATES = Array.from({ length: 8 }, (_, index) => {
  const start = -Math.PI / 2 + index * Math.PI / 8;
  const end = start + Math.PI / 8;
  const y1 = -48 * Math.cos(start), y2 = -48 * Math.cos(end);
  const z1 = 80 + 80 * Math.sin(start), z2 = 80 + 80 * Math.sin(end);
  return {
    height: Math.hypot(y2 - y1, z2 - z1) + .6,
    transform: `translate3d(0, ${(y1 + y2) / 2}px, ${(z1 + z2) / 2}px) rotateX(${Math.atan2(z2 - z1, y2 - y1) * 180 / Math.PI}deg) translateY(-50%)`,
    "--roof-light": ["#303a43", "#53616d", "#78828a", "#515d68", "#3c4651", "#303a44", "#222c35", "#303a42"][index],
  } as CSSProperties;
});

function VaultedLid() {
  return <>
    {ROOF_PLATES.map((style, index) => <span key={index} className="vault-roof-plate" style={style}>
      <span className="vault-roof-band band-left" /><span className="vault-roof-band band-middle" /><span className="vault-roof-band band-right" />
      <span className="vault-roof-traces"><i /><i /><i /></span>
    </span>)}
    <span className="vault-lid-end end-left"><Metalwork side lid /></span>
    <span className="vault-lid-end end-right"><Metalwork side lid /></span>
    <span className="vault-lid-lip lip-front"><i /><i /><i /></span>
    <span className="vault-lid-lip lip-back" />
    <span className="vault-lid-underside"><span /><i /><i /></span>
    <span className="vault-lid-latch"><i /></span>
  </>;
}

/** An assembled chest: independent faces, vaulted lid, hinges and a docking key. */
export default function CrateOpeningArt({ keyMark, ghostMark, moduleMark }: { keyMark: ReactNode; ghostMark?: ReactNode; moduleMark?: ReactNode }) {
  return <span className="opening-vault" aria-hidden="true">
    <span className="vault-anomaly-orbits"><i /><i /><i /></span>
    <span className="vault-ground-radar"><i /><i /><b>17</b></span>
    <span className="vault-camera">
      <span className="vault-floor-shadow" />
      <span className="vault-solid">
        <span className="vault-face vault-back"><Metalwork /></span>
        <span className="vault-face vault-side vault-left"><Metalwork side /><span className="vault-handle" /></span>
        <span className="vault-face vault-side vault-right"><Metalwork side /><span className="vault-handle" /></span>
        <span className="vault-face vault-bottom" />
        <span className="vault-cavity"><span className="vault-core" /><i /><i /><i /></span>
        <span className="vault-face vault-front">
          <Metalwork />
          <span className="vault-keystone"><i /><b /></span>
          <span className="vault-identity"><small>CF · PHANTOM</small><em>17</em></span>
          <span className="vault-serial"><i /><i /><i /><i /><i /><i /><i /><i /></span>
          <span className="vault-clasp clasp-left"><i /></span><span className="vault-clasp clasp-right"><i /></span>
          <span className="vault-key-port"><span className="vault-key-outline">{keyMark}</span><span className="vault-key">{keyMark}</span><span className="vault-key-ring" /></span>
          <span className="vault-lock-bolts"><i /><i /></span>
          <span className="vault-status-leds"><i /><i /><i /></span>
        </span>
        <span className="vault-rim" />
        <span className="vault-hinge hinge-left" /><span className="vault-hinge hinge-right" />
        <span className="vault-lid-hinge"><VaultedLid /></span>
      </span>
    </span>
    <span className="vault-energy-column" />
    <span className="vault-release-shock"><i /><i /></span>
    <span className="vault-hologram"><span className="vault-holo-rings"><i /><i /></span><span className="vault-holo-emblem">{ghostMark ?? keyMark}</span></span>
    {moduleMark && <span className="vault-reward-module"><span>{moduleMark}</span><b>BRILLANTE · 17</b><i /><i /></span>}
    <span className="vault-motes">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</span>
    <span className="vault-sequence"><i>01 · KEY</i><i>02 · UNLOCK</i><i>03 · OPEN</i></span>
  </span>;
}
