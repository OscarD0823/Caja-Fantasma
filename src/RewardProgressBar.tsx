import type { CSSProperties } from "react";

/** Decorative energy moves independently of the exact, accessible point total. */
export default function RewardProgressBar({ value, target, label }: { value: number; target: number; label: string }) {
  const fraction = Math.max(0, Math.min(1, value / Math.max(1, target)));
  return <div className={`progress-track reward-energy ${fraction > 0 ? "energized" : "empty"} ${fraction === 1 ? "charged" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.max(1, target)} aria-valuenow={Math.max(0, Math.min(value, Math.max(1, target)))}>
    <span className="reward-energy-fill" aria-hidden="true" style={{ "--reward-fraction": fraction } as CSSProperties}><i className="reward-energy-flow" /><i className="reward-energy-edge" /></span>
    {fraction > 0 && <i key={value} className="reward-energy-gain" aria-hidden="true" />}
  </div>;
}
