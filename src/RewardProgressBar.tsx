import type { CSSProperties } from "react";

/** Decorative energy moves independently of the exact, accessible point total. */
export default function RewardProgressBar({ value, target, label }: { value: number; target: number; label: string }) {
  const maximum = Number.isFinite(target) ? Math.max(1, target) : 1000;
  const amount = Number.isFinite(value) ? Math.max(0, Math.min(value, maximum)) : 0;
  const fraction = amount / maximum;
  return <div className={`progress-track reward-energy ${fraction > 0 ? "energized" : "empty"} ${fraction === 1 ? "charged" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={amount} style={{ "--reward-fraction": fraction, "--reward-width": `${fraction * 100}%` } as CSSProperties}>
    <span className="reward-energy-fill" aria-hidden="true"><i className="reward-energy-plasma" /><i className="reward-energy-flow" /><i className="reward-energy-edge" /></span>
    <span className="reward-energy-ticks" aria-hidden="true" />
    {fraction > 0 && <i key={value} className="reward-energy-gain" aria-hidden="true" />}
  </div>;
}
