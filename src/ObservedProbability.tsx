import type { CSSProperties } from "react";

export default function ObservedProbability({ count, perPointPercent, currentChancePercent, tx }: {
  count: number; perPointPercent: number; currentChancePercent: number; tx: (es: string, en: string) => string;
}) {
  const hasSamples = count > 0 && perPointPercent > 0;
  const chance = Math.max(0, Math.min(100, currentChancePercent));
  return <article className="probability-explainer panel">
    <header><span className="eyebrow">{tx("PROBABILIDAD OBSERVADA", "OBSERVED PROBABILITY")}</span><small>{count} {tx("muestras", "samples")}</small></header>
    <div className="probability-body">
      <div className="probability-rate"><small>{tx("Frecuencia por punto", "Frequency per point")}</small><strong>{hasSamples ? `${perPointPercent.toFixed(3)}%` : "—"}</strong><p>{hasSamples ? tx(`Una caja cada ${(100 / perPointPercent).toFixed(1)} puntos de media.`, `One crate every ${(100 / perPointPercent).toFixed(1)} points on average.`) : tx("Registra una caja o añade una referencia para comenzar.", "Record a crate or add a reference to get started.")}</p></div>
      <div className="probability-attempt"><div className="probability-ring" style={{ "--value": `${(hasSamples ? chance : 0) * 3.6}deg` } as CSSProperties}><span>{hasSamples ? `${chance.toFixed(0)}%` : "—"}</span></div><small>{tx("Estimación del intento actual", "Current attempt estimate")}</small></div>
    </div>
    <details className="probability-method"><summary>{tx("Cómo se calcula", "How it is calculated")}</summary><p>{tx("Se basa en tus cajas confirmadas y referencias manuales aproximadas. La frecuencia por punto y la estimación acumulada del intento son medidas distintas; no son tasas oficiales ni garantizan una caja.", "Based on your confirmed crates and approximate manual references. Frequency per point and the cumulative attempt estimate are different measures; they are not official rates and do not guarantee a crate.")}</p></details>
  </article>;
}
