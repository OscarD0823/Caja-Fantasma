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

/** Original chest + Brillante module identity, not the game's logo. */
export default function GameLogoMark() {
  const id = useId().replace(/:/g, "");
  return <svg className="chest-emblem" viewBox="0 0 128 128" role="img" aria-label="Caja Fantasma">
    <defs>
      <linearGradient id={`${id}-metal`} x1="28" y1="22" x2="84" y2="115" gradientUnits="userSpaceOnUse"><stop stopColor="#506975" /><stop offset=".27" stopColor="#122d3b" /><stop offset=".56" stopColor="#38505a" /><stop offset="1" stopColor="#071822" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff2c6" /><stop offset=".24" stopColor="#c9a16a" /><stop offset=".5" stopColor="#68472d" /><stop offset=".73" stopColor="#e8c587" /><stop offset="1" stopColor="#85572e" /></linearGradient>
      <linearGradient id={`${id}-roof`} x1="0" y1="0" x2=".2" y2="1"><stop stopColor="#182b37" /><stop offset=".32" stopColor="#63717a" /><stop offset=".54" stopColor="#314652" /><stop offset="1" stopColor="#0a1b27" /></linearGradient>
      <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#49616b" /><stop offset="1" stopColor="#07151e" /></linearGradient>
      <linearGradient id={`${id}-energy`}><stop stopColor="#127d9c" /><stop offset=".5" stopColor="#b1ffff" /><stop offset="1" stopColor="#2baec9" /></linearGradient>
      <radialGradient id={`${id}-aura`}><stop stopColor="#57c9de" stopOpacity=".32" /><stop offset="1" stopColor="#57c9de" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="62" cy="60" rx="62" ry="58" fill={`url(#${id}-aura)`} />
    <ellipse cx="67" cy="114" rx="52" ry="9" fill="#030d17" opacity=".7" />
    <g className="emblem-spirit" fill={`url(#${id}-energy)`} opacity=".8"><path d="M43 29c-4-9 0-18 6-24-1 10 6 9 8 19l-6 12ZM65 27c1-8 10-13 11-20 4 12-5 16-1 25Z" /><path d="m26 24 2-7 3 8-3 4Zm75-7 1-5 2 5-1 3Z" /></g>
    <g className="emblem-chest">
      <path d="m14 62 85 8 21-15-1 48-23 17-81-12Z" fill={`url(#${id}-metal)`} stroke="#050f18" strokeWidth="3" strokeLinejoin="round" />
      <path d="m98 72 22-17-1 48-22 17Z" fill={`url(#${id}-side)`} stroke="#ab9062" strokeWidth="1.3" />
      <path d="m20 74 69 7v24l-69-7Z" fill="#102631" stroke="#57727b" strokeWidth=".9" />
      <path d="m25 79 58 6m-58 3 58 6m-58 3 58 6" stroke="#d3e6e8" strokeOpacity=".13" strokeWidth=".7" />
      <path d="m14 102 82 10 22-16v7l-23 17-80-11Z" fill={`url(#${id}-gold)`} stroke="#edcc90" strokeWidth=".7" />
      <path d="M14 61C12 35 23 22 45 23l53 9c18 3 25 17 22 28l-21 16-85-10Z" fill={`url(#${id}-roof)`} stroke={`url(#${id}-gold)`} strokeWidth="2.7" strokeLinejoin="round" />
      <path d="M99 75c1-22-4-35-15-45m15 45 21-15c3-12-4-25-22-28" fill={`url(#${id}-side)`} stroke="#bca175" strokeWidth="1.1" />
      <path d="M22 60c-2-17 5-29 17-33m1 36c-1-14 3-24 13-32m7 34c0-13 3-22 9-32m12 35c-1-12 0-20 4-32" fill="none" stroke="#0b1d29" strokeWidth="2" />
      <path d="M15 58c20-4 49 4 83 10m-78-23c19-4 45 2 72 10M29 31c16-4 35 0 57 7" fill="none" stroke="#cfdee4" strokeOpacity=".2" strokeWidth=".8" />
      <path d="M27 26c-9 8-11 20-9 39l8 1c-3-17 0-29 9-38Zm43 4c-7 8-10 23-8 39l8 1c-2-16 0-29 8-38Z" fill={`url(#${id}-gold)`} stroke="#eed09d" strokeWidth=".6" />
      <path d="M25 33c-5 9-6 18-5 27m49-23c-4 9-5 16-4 26" fill="none" stroke="#6e482c" strokeWidth="1.8" />
      <path d="m14 63 85 10 21-16v5l-21 17-85-10Z" fill="#050e18" stroke="#b79962" strokeWidth="1" />
      <path className="emblem-energy" d="m17 66 80 10 21-16" fill="none" stroke={`url(#${id}-energy)`} strokeWidth="2.1" />
      <path d="m18 72 9 1v32l-9-1Zm58 7 9 1v31l-9-1Z" fill={`url(#${id}-gold)`} stroke="#e5c78f" strokeWidth=".7" />
      <path d="m48 72 13 2v17l-6 8-7-9Z" fill={`url(#${id}-gold)`} stroke="#fff0c2" strokeWidth="1.2" />
      <path d="m51 77 7 1v12l-3 4-4-5Z" fill="#052737" stroke="#56d7e8" strokeWidth="1" />
      <path d="m54 80 2 1v8l-2 1Z" fill="#b5ffff" />
      <path d="m105 76 10-8v22l-10 8Z" fill="#071720" stroke="#d4b678" strokeWidth="1" />
      <path d="m108 78 5-4v12l-5 4Z" fill="#386573" />
      <path d="m13 71 8 1v8l-8-1Zm77 8 8 1v8l-8-1ZM14 99l8 1v8l-8-1Zm74 8 8 1v9l-8-1Z" fill={`url(#${id}-gold)`} />
      {[ [22, 38], [21, 53], [67, 41], [65, 56], [22, 77], [22, 100], [80, 84], [80, 105], [16, 75], [94, 83] ].map(([x, y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="1.5" fill="#332620" stroke="#e6c891" strokeWidth=".5" /><path d={`m${x - .7} ${y}h1.4`} stroke="#fff0c1" strokeWidth=".45" /></g>)}
      <path className="emblem-trace" d="m17 66 80 10 21-16" fill="none" stroke="#e4ffff" strokeWidth="1.5" strokeDasharray="12 110" />
    </g>
    <g className="emblem-module" transform="translate(79 81) scale(.68)"><ModuleGlyph id={id} /></g>
    <path d="m114 24 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#fff0bb" />
  </svg>;
}
