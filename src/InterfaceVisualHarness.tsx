import { useState } from "react";
import DevicePresence from "./DevicePresenceStrip";
import GameLogoMark, { GhostMark, ShinyModuleMark } from "./GameLogoMark";
import { StartupIntro } from "./App";
import RewardProgressBar from "./RewardProgressBar";
import ObservedProbability from "./ObservedProbability";
import CrateHistoryCard from "./CrateHistoryCard";
import CounterChestArt from "./CounterChestArt";

/** DEV-only, isolated visual QA: does not mount App or touch personal storage/bridge. */
export default function InterfaceVisualHarness() {
  const [intro, setIntro] = useState(new URLSearchParams(location.search).has("intro-preview"));
  const [points, setPoints] = useState(187);
  const historyOnly = new URLSearchParams(location.search).has("history-preview");
  const counterPreviewMs = Number(new URLSearchParams(location.search).get("counter-preview"));
  const counterOnly = new URLSearchParams(location.search).has("counter-only");
  const tx = (es: string) => es;
  const counterCard = <article className="progress-hero panel"><div className="hero-copy"><span className="eyebrow">INTENTO · PERSONAJE DE PRUEBA</span><h2>{points}<small> / 1000 puntos</small></h2><p>Vista de prueba, sin modificar el progreso personal.</p><RewardProgressBar value={points} target={1000} label="Progreso de prueba" /><div className="hero-actions"><button className="primary" type="button" onClick={() => setPoints(current => Math.min(1000, current + 100))}>Sumar 100 de prueba</button><button className="secondary" type="button" onClick={() => setPoints(current => Math.max(0, current - 100))}>Restar 100 de prueba</button></div></div><CounterChestArt previewAtMs={counterPreviewMs} /></article>;
  const historyPreview = <section className="history-page">
    <ObservedProbability count={16} perPointPercent={.1046} currentChancePercent={17.77} tx={tx} />
    <ObservedProbability count={0} perPointPercent={0} currentChancePercent={0} tx={tx} />
    <div className="panel-title history-title"><h2>Historial con fecha y hora</h2><button className="secondary compact" type="button">Exportar</button></div>
    <CrateHistoryCard number={1} characterName="Personaje de prueba con un nombre largo" formattedDate="08 oct. 2026, 6:41 p. m." pointsText="1.017 puntos" tx={tx} box={{ id: "qa", occurredAt: "2026-10-08T23:41:00.000Z", points: 1017, claims: 354, source: "platform-mail", carriedPoints: 187, breakdown: [{ name: "Plataformas de Gravedad", count: 10, points: 40 }, { name: "Desamparado · dificultad Pro", count: 200, points: 200 }] }} />
  </section>;
  return <main className="interface-visual-harness" style={historyOnly ? { maxWidth: 1000, margin: "auto" } : undefined}>
    <h1>Laboratorio visual · sin datos personales</h1>
    {counterOnly ? counterCard : historyOnly ? historyPreview : <>
    <p>La presencia de esta página es simulada solo para comprobar el diseño.</p>
    <article><h2>PC, web y móvil conectados</h2><DevicePresence current="pc" online={["pc", "web", "mobile"]} /></article>
    <article><h2>Solo PC conectado</h2><DevicePresence current="pc" online={["pc"]} /></article>
    <article><h2>Sin emparejar</h2><DevicePresence current="web" online={[]} /></article>
    <article><h2>Emblema original · cofre metálico</h2><div className="logo-qa-scales"><GameLogoMark /><div className="brand-mark"><GameLogoMark /></div><span style={{ width: 24 }}><GameLogoMark /></span><span style={{ width: 85 }}><GhostMark /></span><span style={{ width: 60 }}><ShinyModuleMark /></span></div></article>
    {counterCard}
    {historyPreview}
    </>}
    <button type="button" className="primary" onClick={() => setIntro(true)}>Reproducir apertura</button>
    {intro && <StartupIntro language="es" onSkip={() => setIntro(false)} />}
  </main>;
}
