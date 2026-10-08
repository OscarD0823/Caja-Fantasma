import { useState } from "react";
import DevicePresence from "./DevicePresenceStrip";
import GameLogoMark from "./GameLogoMark";
import { StartupIntro } from "./App";

/** DEV-only, isolated visual QA: does not mount App or touch personal storage/bridge. */
export default function InterfaceVisualHarness() {
  const [intro, setIntro] = useState(new URLSearchParams(location.search).has("intro-preview"));
  return <main className="interface-visual-harness">
    <h1>Laboratorio visual · sin datos personales</h1>
    <p>La presencia de esta página es simulada solo para comprobar el diseño.</p>
    <article><h2>PC, web y móvil conectados</h2><DevicePresence current="pc" online={["pc", "web", "mobile"]} /></article>
    <article><h2>Solo PC conectado</h2><DevicePresence current="pc" online={["pc"]} /></article>
    <article><h2>Sin emparejar</h2><DevicePresence current="web" online={[]} /></article>
    <article><h2>Emblema original</h2><div className="brand-mark"><GameLogoMark /></div></article>
    <button type="button" className="primary" onClick={() => setIntro(true)}>Reproducir apertura</button>
    {intro && <StartupIntro language="es" onSkip={() => setIntro(false)} />}
  </main>;
}
