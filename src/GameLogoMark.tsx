import { useId } from "react";
import chestEmblem from "./assets/chest-emblem.png";

function ModuleGlyph({ id }: { id: string }) {
  return <g className="module-glyph">
    <defs><linearGradient id={`${id}-module-gold`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0b7" /><stop offset=".38" stopColor="#b78950" /><stop offset=".72" stopColor="#70502e" /><stop offset="1" stopColor="#f7d391" /></linearGradient></defs>
    <path d="M17 4h31l12 12v31L47 60H16L4 48V17Z" fill={`url(#${id}-module-gold)`} stroke="#192831" strokeWidth="2" />
    <path d="M19 10h26l9 9v25L44 54H19l-9-10V20Z" fill="#0c2531" stroke="#f5d5a0" strokeWidth="1" />
    <path d="m32 15 12 13-12 14-12-14Z" fill="#66eaff" stroke="#daffff" strokeWidth="1.4" />
    <path d="m32 18 7 10-7 11-7-11Z" fill="#1da9c5" />
    <path d="M17 5v5m10-6v6m19-4v5M5 21h5m-6 11h6m-5 10h5M54 21h5m-5 11h6m-7 10h5" stroke="#efd4a5" strokeWidth="2" />
    <text x="32" y="50" textAnchor="middle" fill="#fff0b7" fontFamily="Segoe UI, sans-serif" fontWeight="900" fontSize="11">17</text>
    <path d="m51 2 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#efffff" />
  </g>;
}

/** Original Brillante chip, shared by the brand, reward reveal and mod cards. */
export function ShinyModuleMark() {
  const id = `chip-${useId().replace(/:/g, "")}`;
  return <svg viewBox="0 0 64 64" role="img" aria-label="Módulo Brillante 17"><ModuleGlyph id={id} /></svg>;
}

/** A separate spectral character; it can emerge without moving the key logo. */
export function GhostMark() {
  const id = `spirit-${useId().replace(/:/g, "")}`;
  return <svg className="spectral-courier" viewBox="0 0 80 100" role="img" aria-label="Fantasma custodio">
    <defs>
      <linearGradient id={`${id}-veil`} x1=".1" y1="0" x2=".8" y2="1"><stop stopColor="#ebffff" /><stop offset=".32" stopColor="#91f3e9" /><stop offset=".65" stopColor="#2b929f" /><stop offset="1" stopColor="#2877a4" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${id}-hood`} x1=".1" y1="0" x2=".9" y2="1"><stop stopColor="#defaf3" /><stop offset=".28" stopColor="#6ec4c6" /><stop offset=".6" stopColor="#25566c" /><stop offset="1" stopColor="#0d243f" /></linearGradient>
      <linearGradient id={`${id}-mask`} x1=".1" y1="0" x2=".9" y2="1"><stop stopColor="#e9e2bd" /><stop offset=".45" stopColor="#93aaa8" /><stop offset="1" stopColor="#346572" /></linearGradient>
    </defs>
    <g className="spirit-tail" fill="none" stroke="#80eedc" strokeLinecap="round">
      <path d="M24 68C8 82 27 93 16 98M50 68c19 10 1 23 12 28" strokeWidth="2.1" opacity=".5" />
      <path d="M34 73c-12 9 10 16-5 25M42 72c14 12-7 16 4 25" strokeWidth="1.2" opacity=".7" />
    </g>
    <path className="spirit-body" d="M39 8C23 11 17 23 19 38l-6 13 7 11-2 18c8-7 9-4 9 7 7-6 8-9 12-1 5-7 7-10 13-4l2-16 8-12-5-15C60 24 54 12 39 8Z" fill={`url(#${id}-veil)`} stroke="#94f2e5" strokeWidth=".8" />
    <g className="spirit-head"><path d="M19 38c-4-15 9-31 20-32 17 4 24 19 18 33l-10 7H30Z" fill={`url(#${id}-hood)`} stroke="#b5fae4" strokeWidth="1" />
    <path d="M23 33 39 16l15 16-6 13-18 1Z" fill="#0c2736" stroke="#1e5366" strokeWidth="1.5" />
    <path d="m29 27 10-5 11 6-2 13-9 7-10-7Z" fill={`url(#${id}-mask)`} stroke="#9bded8" strokeWidth=".7" />
    <path d="m39 23-2 11 3 5-2 7m-9-5 7-2m6 0 6 2" fill="none" stroke="#326071" strokeWidth="1.2" />
    <path className="spirit-eyes" d="m30 31 6 2-1 3-6-2Zm12 2 7-2 1 3-7 2Z" fill="#f5fff5" stroke="#75ffe4" strokeWidth="1.2" />
    <path d="M23 27c0-5 7-12 13-14m6 1c8 4 11 8 12 13M22 42l9 7 17-1 8-6" fill="none" stroke="#e7ffee" strokeWidth=".8" opacity=".65" /></g>
    <path d="m26 45 12 7 14-8-4 11-10 4-8-3Z" fill="#b4935d" stroke="#ebd5a0" strokeWidth=".9" />
    <path d="m38 49 4 4-4 5-4-5Z" fill="#b9ffff" stroke="#3a8697" />
    <path className="spirit-left-arm" d="M25 49 13 53l-8 13 7-2 8-7 9-1" fill={`url(#${id}-hood)`} stroke="#b6f6dc" strokeWidth="1" />
    <g className="spirit-carry-arm"><path d="m51 49 9 8 10-3 4 5-3 5-13 1-10-8" fill={`url(#${id}-hood)`} stroke="#b6f6dc" strokeWidth="1" /><path d="m67 56 6 2-1 4m-5-3 5 2m-7-5 5 1" fill="none" stroke="#efffe4" strokeWidth="1.3" strokeLinecap="round" /></g>
    <path d="M30 60c-5 11 2 14-3 23m18-24c8 8-3 15 6 19m-15-17 3 15" fill="none" stroke="#bcf5dd" strokeWidth="1.1" opacity=".65" />
    <path d="m9 36 1 3 3 1-3 1-1 3-1-3-3-1 3-1Zm57-18 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#ecffee" opacity=".8" />
  </svg>;
}

/** A cached still of CrateOpeningArt, not a second, flattened drawing.
 * Regenerate with pnpm icons after changing the model, materials or module. */
export default function GameLogoMark() {
  return <svg className="chest-emblem" viewBox="0 0 128 128" role="img" aria-label="Caja Fantasma">
    <image className="emblem-model" href={chestEmblem} x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid meet" />
  </svg>;
}
