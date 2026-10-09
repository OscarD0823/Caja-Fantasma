import type { BoxRecord } from "./model";

export default function CrateHistoryCard({ box, number, characterName, formattedDate, pointsText, tx }: {
  box: BoxRecord; number: number; characterName: string; formattedDate: string; pointsText: string; tx: (es: string, en: string) => string;
}) {
  return <article className="history-record panel">
    <div className="record-number">#{number}</div>
    <div className="record-main"><strong>{characterName}</strong><time dateTime={box.occurredAt}>{formattedDate}</time></div>
    <div className="record-result"><strong>{pointsText}</strong><small>{box.claims} {tx("recompensas", "rewards")}</small></div>
    {box.source === "platform-mail" && <p className="record-mail">{tx("Correo de Plataformas", "Platforms mail")} · {box.carriedPoints ?? 0} {tx("puntos al nuevo intento", "points carried to the next attempt")}</p>}
    <details><summary>{tx("Ver recompensas del intento", "View attempt rewards")}</summary>{box.breakdown.map((item) => <div key={item.name}><span>{item.name} <small>×{item.count}</small></span><strong>{item.points} pts</strong></div>)}</details>
  </article>;
}
