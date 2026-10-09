import { useId } from "react";

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
  return <svg viewBox="0 0 80 100" role="img" aria-label="Fantasma">
    <defs><linearGradient id={id} x1="0" y1="0" x2=".6" y2="1"><stop stopColor="#efffff" /><stop offset=".48" stopColor="#a0faff" /><stop offset="1" stopColor="#159bb8" stopOpacity=".3" /></linearGradient></defs>
    <path className="spirit-body" d="M40 7c-17 0-27 12-27 31v15L5 70l13-5 1 23 11-9 10 13 11-13 10 9 1-23 13 5-8-17V38C67 19 57 7 40 7Z" fill={`url(#${id})`} stroke="#c4ffff" strokeWidth="1.3" />
    <path d="M23 37c5 0 8 2 11 5m12 0c3-3 6-5 11-5" stroke="#0a3548" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="40" cy="56" rx="4" ry="6" fill="#145670" />
    <path d="M19 52v15m42-15v15" stroke="#ecffff" opacity=".55" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

/** Original chest + Brillante module identity, not the game's logo. */
export default function GameLogoMark() {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="0 0 64 64" role="img" aria-label="Caja Fantasma">
    <defs>
      <linearGradient id={`${id}-metal`} x1="8" y1="6" x2="48" y2="58" gradientUnits="userSpaceOnUse"><stop stopColor="#effff7" /><stop offset=".45" stopColor="#6eeddd" /><stop offset="1" stopColor="#21889a" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="16" y1="20" x2="44" y2="54" gradientUnits="userSpaceOnUse"><stop stopColor="#fff0bc" /><stop offset=".45" stopColor="#cda56a" /><stop offset="1" stopColor="#796043" /></linearGradient>
    </defs>
    <path className="emblem-outline" d="M32 3 57 17v29L32 61 7 46V17Z" fill="#09232f" stroke={`url(#${id}-metal)`} strokeWidth="1.5" />
    <path className="emblem-spirit" d="M24 24v-9c0-6 3-9 8-9s8 3 8 9v9l-4-3-4 3-4-3Z" fill={`url(#${id}-metal)`} stroke="#d2fff1" strokeWidth=".8" />
    <path d="m27 13 3 2m4 0 3-2" fill="none" stroke="#092c37" strokeWidth="2" strokeLinecap="round" />
    <path d="m11 28 8-7 33 5v24l-8 7-33-5Z" fill="#182936" stroke={`url(#${id}-gold)`} strokeWidth="1.6" />
    <path d="m11 28 33 5 8-7M44 33v24" fill="none" stroke="#71dce9" strokeWidth="1.2" />
    <path d="M11 25c0-7 4-12 8-12l29 4c3 0 4 5 4 9l-8 7-33-5Z" fill="#3d4a54" stroke={`url(#${id}-gold)`} strokeWidth="1.6" />
    <path d="M19 16c-3 2-4 6-4 11m29-9c-3 3-4 7-4 12" stroke={`url(#${id}-gold)`} strokeWidth="4" fill="none" />
    <path d="m22 17 1 11m12-9-1 11M17 33v17m21-14v17" stroke="#63e4ef" strokeWidth="1.2" />
    <path d="m15 34 7 1v14l-7-1Zm19 3 7 1v14l-7-1Z" fill={`url(#${id}-gold)`} />
    <path d="m24 34 7 1v12l-3 3-4-4Z" fill="#60dbea" stroke="#d2ffff" strokeWidth=".6" />
    <g transform="translate(32 31) scale(.43)"><ModuleGlyph id={id} /></g>
    <path className="emblem-trace" d="M32 3 57 17v29L32 61 7 46V17Z" fill="none" stroke="#e0fff2" strokeWidth="1.7" strokeDasharray="14 150" />
    <path d="m51 5 1.4 4.6L57 11l-4.6 1.4L51 17l-1.4-4.6L45 11l4.6-1.4Z" fill="#ed77bd" />
  </svg>;
}
