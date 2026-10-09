import { memo, useId, type CSSProperties, type ReactNode } from "react";
import { ChestBolt, ChestMaterialDefs } from "./ChestMaterials";
import ChestRelief, { LidLatchRelief, LockRelief } from "./ChestRelief";


/** Static vector metalwork; identical finishes are used by the app icon. */
const Metalwork = memo(function Metalwork({ side = false, lid = false }: { side?: boolean; lid?: boolean }) {
  const id = `vault-${useId().replace(/:/g, "")}`;
  const width = side ? 160 : 300;
  const height = lid ? 52 : 180;
  const cornerWidth = side ? 43 : 62;
  const paint = (name: string) => `url(#${id}-${name})`;
  const bodyOutline = lid
    ? "M0 50C0 22 29 0 80 0S160 22 160 50Z"
    : `M8 0H${width - 8}L${width} 8V172L${width - 8} 180H8L0 172V8Z`;
  return <svg className="vault-metalwork" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <ChestMaterialDefs id={id} />
      <clipPath id={`${id}-outline`}><path d={bodyOutline} /></clipPath>
    </defs>
    <g clipPath={paint("outline")}>
      <path d={bodyOutline} fill={paint("steel")} stroke="#111a21" strokeWidth="4" />
      {!lid && <>
        <path d={`M12 28H${width - 12}V148L${width - 29} 166H29L12 148Z`} fill="#080f17" stroke="#61696c" strokeWidth="1" />
        <path d={`M15 31H${width - 15}V145L${width - 30} 162H30L15 145Z`} fill={paint("panel")} stroke="#0a1119" strokeWidth="2" />
        <path d={`M19 28H${width - 19}M28 153H${width - 28}`} stroke="#030d15" strokeWidth="8" />
        <path className="vault-luminous-line" d={side ? "M45 28h70M48 154l10-5h44l10 5" : "M62 28h50l8-4h60l8 4h50M70 154l10-7h32l8 7m60 0 8-7h32l10 7"} stroke={paint("cyan")} strokeWidth="3.6" fill="none" />
        <path className="vault-luminous-line" d={`M${cornerWidth - 7} 53v75m${width - cornerWidth + 7} -75v75`} stroke="#06141d" strokeWidth="10" />
        <path className="vault-luminous-line" d={`M${cornerWidth - 7} 55v71m${width - cornerWidth + 7} -71v71`} stroke={paint("cyan")} strokeWidth="4.8" />
        <path d={side ? "M64 70l11-4m21 58 9-6" : "M80 77l14-5m-14 54 10-6m107-36 16-5m-9 56 12-7"} fill="none" stroke="#b7b2a0" strokeWidth="1.1" opacity=".25" />
      </>}
      {lid && <>
        <path d="M2 49C3 23 28 2 80 2s77 21 78 47h-17C136 26 119 15 80 15S24 27 19 49Z" fill={paint("bevel")} stroke="#e8c28c" strokeWidth="1" />
        <path d="M11 45C16 23 38 8 80 8s64 16 69 37" fill="none" stroke={paint("gold")} strokeWidth="7" />
        <path d="M26 42C32 26 50 20 80 20s48 6 54 22" fill="none" stroke="#a8afb0" strokeWidth=".9" />
        <path d="M24 42h35l9-7h25l10 7h33" stroke="#081721" strokeWidth="7" fill="none" />
        <path className="vault-luminous-line" d="M27 42h31l10-7h25l10 7h30" stroke={paint("cyan")} strokeWidth="3" fill="none" />
        <path d="M8 38h15l5 9-6 5H7l-5-5Zm130 0h15l5 9-6 5h-15l-5-5Z" fill={paint("gold")} stroke="#e9c793" strokeWidth="1" />
        <ChestBolt id={id} x={15} y={44} radius={3.5} /><ChestBolt id={id} x={145} y={44} radius={3.5} />
      </>}
      <path d={bodyOutline} fill={paint("grain")} />
    </g>
  </svg>;
});

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
    "--roof-light": ["#27323b", "#45545d", "#667780", "#3f505a", "#2e3d47", "#27333e", "#182630", "#24333e"][index],
  } as CSSProperties;
});

const VaultedLid = memo(function VaultedLid() {
  const id = `lid-metal-${useId().replace(/:/g, "")}`;
  return <>
    <svg className="vault-relief-materials" aria-hidden="true"><defs><ChestMaterialDefs id={id} /></defs></svg>
    {ROOF_PLATES.map((style, index) => <span key={index} className="vault-roof-plate" style={style}>
      <svg className="vault-roof-machining" viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true">
        <rect width="300" height="30" fill={`url(#${id}-brushed)`} />
        <rect width="300" height="30" fill={`url(#${id}-grain)`} />
        <path d={index % 2 ? "M75 9h21m8 0h12m73 12 12-3M83 24l18-4m103-15 10-2" : "M77 4l17-2m9 9 13-3m71 15 22-5M85 27l10-2m109-12 6-2"} fill="none" stroke="#c3c9bc" strokeWidth=".35" opacity=".45" />
        <path d="M70 27h54m54 0h53M70 2h54m54 0h53" stroke="#030b12" strokeWidth=".8" />
        {(index === 2 || index === 6) && <><ChestBolt id={id} x={79} y={15} radius={1.8} /><ChestBolt id={id} x={219} y={15} radius={1.8} /></>}
      </svg>
      <span className="vault-roof-band band-left"><i className="vault-band-cap" /><i className="vault-band-wall wall-left" /><i className="vault-band-wall wall-right" /></span>
      <span className="vault-roof-band band-middle"><i className="vault-band-cap" /><i className="vault-band-wall wall-left" /><i className="vault-band-wall wall-right" /></span>
      <span className="vault-roof-band band-right"><i className="vault-band-cap" /><i className="vault-band-wall wall-left" /><i className="vault-band-wall wall-right" /></span>
      {(index === 1 || index === 5) && <span className="vault-roof-fasteners"><i /><i /><i /></span>}
      <span className="vault-roof-traces"><i /><i /><i /></span>
    </span>)}
    <span className="vault-lid-end end-left"><Metalwork side lid /></span>
    <span className="vault-lid-end end-right"><Metalwork side lid /></span>
    <span className="vault-lid-lip lip-front"><i /><i /><i /></span>
    <span className="vault-lid-lip lip-back" />
    <span className="vault-lid-underside">
      <svg className="vault-interior-machining" viewBox="0 0 300 160" aria-hidden="true">
        <rect width="300" height="160" fill={`url(#${id}-brushed)`} opacity=".6" />
        <rect width="300" height="160" fill={`url(#${id}-grain)`} opacity=".5" />
        <path d="M15 15h270v130H15Zm21 12v106m228-106v106" fill="none" stroke="#09131b" strokeWidth="4" />
        <path d="M15 14h270M35 27v106m228-106v106" fill="none" stroke="#a0aba6" strokeWidth=".6" />
        <path d="M47 19h206l8 8v105l-8 9H47l-8-9V27Z" fill="#0b1c22" stroke="#867a63" strokeWidth="1" />
        <path d="M54 29h192v95H54Z" fill={`url(#${id}-panel)`} stroke="#536569" strokeWidth=".7" />
        <path d="M58 118h184M57 34h185M63 47h15v55H63Zm159 0h15v55h-15Z" fill="none" stroke="#0a171e" strokeWidth="2" />
        <path d="M69 55h3m-3 5h3m-3 5h3m-3 5h3m-3 5h3m-3 5h3m-3 5h3m-3 5h3M227 55h4m-4 7h4m-4 7h4m-4 7h4m-4 7h4m-4 7h4" stroke="#84938f" strokeWidth=".55" opacity=".5" />
        <path d="M53 135h17l6-6h135l7 6h31" fill="none" stroke="#70b8ba" strokeWidth=".8" opacity=".5" />
        <path d="M109 57h81l12 13v28l-12 12h-81L97 98V70Z" fill="none" stroke="#769294" strokeWidth=".75" opacity=".6" />
        <text x="149" y="85" textAnchor="middle" fill="#93a9a6" fontFamily="Consolas,monospace" fontSize="8" letterSpacing="3" opacity=".45">CF · 017</text>
        <path d="m114 93 16-4m29 0 10-3m-6-19 12-2M23 40l6-3m240 70 7-2" stroke="#c0c8b9" strokeWidth=".5" opacity=".45" />
        {[24, 275].flatMap(x => [25, 79, 134].map(y => <ChestBolt key={`${x}-${y}`} id={id} x={x} y={y} radius={2.8} />))}
      </svg>
    </span>
    <span className="vault-lid-latch"><LidLatchRelief /></span>
  </>;
});

/** An assembled chest: the docking module stays in its lock after the ghost leaves. */
export default function CrateOpeningArt({ keyMark, ghostMark, compact = false }: { keyMark: ReactNode; ghostMark?: ReactNode; compact?: boolean }) {
  return <span className={`opening-vault${compact ? " counter-vault" : ""}`} aria-hidden="true">
    <span className="vault-anomaly-orbits"><i /><i /><i /></span>
    <span className="vault-ground-radar"><i /><i /><b>17</b></span>
    <span className="vault-camera">
      <span className="vault-floor-shadow" />
      <span className="vault-solid">
        <span className="vault-face vault-back"><Metalwork /></span>
        <span className="vault-face vault-side vault-left"><Metalwork side /><ChestRelief side /><span className="vault-handle" /></span>
        <span className="vault-face vault-side vault-right"><Metalwork side /><ChestRelief side /><span className="vault-handle" /></span>
        <span className="vault-face vault-bottom" />
        <span className="vault-inner-wall inner-back"><i /></span><span className="vault-inner-wall inner-front"><i /></span>
        <span className="vault-inner-wall inner-left"><i /></span><span className="vault-inner-wall inner-right"><i /></span>
        <span className="vault-cavity"><span className="vault-core" /><i /><i /><i /></span>
        <span className="vault-face vault-front">
          <Metalwork />
          <ChestRelief />
          <span className="vault-keystone"><LockRelief /></span>
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
    <span className="vault-spirit-aperture"><span className="vault-hologram"><span className="vault-holo-rings"><i /><i /></span><span className="vault-holo-emblem">{ghostMark ?? keyMark}</span><span className="vault-spirit-wake"><i /><i /><i /></span></span></span>
    <span className="vault-motes">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</span>
    <span className="vault-sequence"><i>01 · MODULE</i><i>02 · UNLOCK</i><i>03 · RELEASE</i></span>
  </span>;
}
