import type { ReactNode } from "react";

function Rivets() {
  return <span className="vault-rivets">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</span>;
}

/** An assembled chest: independent faces, hinges, clasps and a physical docking key. */
export default function CrateOpeningArt({ keyMark }: { keyMark: ReactNode }) {
  return <span className="opening-vault" aria-hidden="true">
    <span className="vault-anomaly-orbits"><i /><i /><i /></span>
    <span className="vault-ground-radar"><i /><i /><b>17</b></span>
    <span className="vault-camera">
      <span className="vault-floor-shadow" />
      <span className="vault-solid">
        <span className="vault-face vault-back"><Rivets /></span>
        <span className="vault-face vault-side vault-left"><span className="vault-handle" /><Rivets /></span>
        <span className="vault-face vault-side vault-right"><span className="vault-handle" /><Rivets /></span>
        <span className="vault-face vault-bottom" />
        <span className="vault-cavity"><span className="vault-core" /><i /><i /><i /></span>
        <span className="vault-face vault-front">
          <span className="vault-recess" /><span className="vault-strap strap-left" /><span className="vault-strap strap-right" />
          <span className="vault-serial"><i /><i /><i /><i /><i /><i /><i /><i /></span>
          <span className="vault-corner corner-left" /><span className="vault-corner corner-right" />
          <Rivets />
          <span className="vault-identity"><small>CF · ARCHIVE</small><b>PHANTOM</b><em>17</em></span>
          <span className="vault-conduit"><i /><i /></span>
          <span className="vault-clasp clasp-left"><i /></span><span className="vault-clasp clasp-right"><i /></span>
          <span className="vault-key-port"><span className="vault-key-outline">{keyMark}</span><span className="vault-key">{keyMark}</span><span className="vault-key-ring" /></span>
          <span className="vault-lock-bolts"><i /><i /></span>
          <span className="vault-status-leds"><i /><i /><i /></span>
        </span>
        <span className="vault-rim" />
        <span className="vault-hinge hinge-left" /><span className="vault-hinge hinge-right" />
        <span className="vault-lid-hinge">
          <span className="vault-lid-top"><span className="vault-lid-panel" /><span className="vault-strap strap-left" /><span className="vault-strap strap-right" /><Rivets /><b>CF — 17</b></span>
          <span className="vault-lid-underside"><span /><i /><i /></span>
          <span className="vault-lid-lip lip-front" /><span className="vault-lid-lip lip-back" /><span className="vault-lid-lip lip-left" /><span className="vault-lid-lip lip-right" />
        </span>
      </span>
    </span>
    <span className="vault-energy-column" />
    <span className="vault-release-shock"><i /><i /></span>
    <span className="vault-hologram"><span className="vault-holo-rings"><i /><i /></span><span className="vault-holo-emblem">{keyMark}</span></span>
    <span className="vault-motes">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</span>
    <span className="vault-sequence"><i>01 · KEY</i><i>02 · UNLOCK</i><i>03 · OPEN</i></span>
  </span>;
}
