export type ConsoleSection = "progress" | "characters" | "vision" | "devices" | "history" | "shiny" | "changes" | "settings";

/** Original console symbols: readable at navigation size, without game-brand artwork. */
export default function ConsoleGlyph({ section, size = 24 }: { section: ConsoleSection; size?: number }) {
  return <svg className="console-glyph" width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {section === "progress" && <><path d="m5 11 11-6 11 6v15H5ZM5 11h22M11 11V6m10 5V6M10 17v5m12-5v5" /><path className="glyph-core" d="M13 14h6v7h-6Z" /><path d="M16 17v2" /></>}
    {section === "characters" && <><path d="m16 3 11 6v14l-11 6-11-6V9Z" /><circle className="glyph-core" cx="16" cy="13" r="4" /><path d="M10 24v-2a6 6 0 0 1 12 0v2M2 12v8m28-8v8" /></>}
    {section === "vision" && <><path d="M2 16s5-8 14-8 14 8 14 8-5 8-14 8S2 16 2 16Z" /><circle className="glyph-core" cx="16" cy="16" r="4" /><path d="M16 2v3m0 22v3M7 5l2 2m14 18 2 2M25 5l-2 2M9 25l-2 2" /></>}
    {section === "devices" && <><path d="M3 5h16v12H3Zm5 16h7m-4-4v4M23 12h6v15h-6Z" /><path className="glyph-core" d="m14 26 4 3 4-3M19 22v7M23 7a7 7 0 0 1 6 2" /></>}
    {section === "history" && <><path d="M6 9h21v19H6ZM10 4h14v5M10 14h7m-7 5h5m-5 5h11" /><circle className="glyph-core" cx="23" cy="14" r="5" /><path d="M23 11v3l2 1M2 13v9" /></>}
    {section === "shiny" && <><path d="m16 4 10 6 3 7-13 13L3 17l3-7Zm-10 6h20M3 17h26M10 10l6 20 6-20" /><path className="glyph-core" d="m16 4 6 6-6 7-6-7ZM27 2v5m-2-2h5" /></>}
    {section === "changes" && <><path d="M5 3h15l7 7v19H5Zm15 0v7h7M10 13h7m-7 5h5m-5 5h6" /><path className="glyph-core" d="m22 16-4 6h5l-3 5 7-7h-5Z" /></>}
    {section === "settings" && <><path d="M6 3v26M16 3v26M26 3v26" /><path className="glyph-core" d="M3 9h6v5H3ZM13 18h6v5h-6ZM23 7h6v5h-6Z" /></>}
  </svg>;
}
