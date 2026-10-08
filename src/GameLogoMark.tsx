import { useId } from "react";

/** Original spectral-vault emblem, not the game's logo. */
export default function GameLogoMark() {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 64 64" role="img" aria-label="Caja Fantasma">
    <defs>
      <linearGradient id={`${id}-metal`} x1="8" y1="6" x2="48" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#effff7" /><stop offset=".45" stopColor="#6eeddd" /><stop offset="1" stopColor="#21889a" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="16" y1="20" x2="44" y2="54" gradientUnits="userSpaceOnUse"><stop stopColor="#fff0bc" /><stop offset=".45" stopColor="#cda56a" /><stop offset="1" stopColor="#796043" /></linearGradient>
    </defs>
    <path className="emblem-outline" d="M32 3 57 17v29L32 61 7 46V17Z" fill="#09232f" stroke={`url(#${id}-metal)`} strokeWidth="1.5" />
    <path d="m12 21 20-10 20 10v23L32 55 12 44Z" fill={`url(#${id}-gold)`} stroke="#efce91" strokeWidth="1" />
    <path d="m12 21 20 10 20-10M32 31v24" fill="none" stroke="#1b2328" strokeWidth="2" />
    <path d="m16 26 12 6v15l-12-6Zm20 6 12-6v15l-12 6Z" fill="#183137" stroke="#63b9b2" strokeWidth=".7" />
    <path d="m20 17 20 10m-16-12 20 10M19 26v15m26-15v15" stroke="#ffe5a4" strokeWidth="2" opacity=".7" />
    <path className="emblem-spirit" d="M21 27v-7c0-8 4-12 11-12s11 4 11 12v7l-6-3-5 4-5-4Z" fill={`url(#${id}-metal)`} stroke="#d2fff1" strokeWidth=".8" />
    <path d="m25 18 4 2m6 0 4-2" fill="none" stroke="#092c37" strokeWidth="2.7" strokeLinecap="round" />
    <path d="M27 30h10v12l-5 3-5-3Z" fill={`url(#${id}-gold)`} stroke="#091f2a" strokeWidth="1.8" />
    <path d="M29 30v-2a3 3 0 0 1 6 0v2m-3 5v4" fill="none" stroke="#132f36" strokeWidth="2" strokeLinecap="round" />
    <path className="emblem-trace" d="M32 3 57 17v29L32 61 7 46V17Z" fill="none" stroke="#e0fff2" strokeWidth="1.7" strokeDasharray="14 150" />
    <path d="m51 5 1.4 4.6L57 11l-4.6 1.4L51 17l-1.4-4.6L45 11l4.6-1.4Z" fill="#ed77bd" />
  </svg>;
}
