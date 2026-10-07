/** Separate mechanical pieces: the lid pivots on its hinge rather than splitting a picture. */
export default function CrateOpeningArt() {
  return <span className="opening-vault" aria-hidden="true">
    <svg className="vault-body" viewBox="0 0 360 280">
      <defs>
        <linearGradient id="vault-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9bc78" /><stop offset=".35" stopColor="#936546" /><stop offset="1" stopColor="#32241e" /></linearGradient>
        <linearGradient id="vault-front" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#745341" /><stop offset="1" stopColor="#231a18" /></linearGradient>
        <linearGradient id="vault-energy"><stop stopColor="#f1fffb" /><stop offset="1" stopColor="#55ded8" /></linearGradient>
      </defs>
      <ellipse cx="181" cy="258" rx="146" ry="13" fill="#000" opacity=".4" />
      <path d="m32 106 222-22 75 34-20 118-219 29-58-43Z" fill="url(#vault-metal)" stroke="#191615" strokeWidth="4" />
      <path d="m40 112 219-22 60 28-214 32Z" fill="#09191c" stroke="#bc915f" strokeWidth="4" />
      <path d="m96 153 214-30-14 106-205 26Z" fill="url(#vault-front)" stroke="#b88655" strokeWidth="3" />
      <path d="m42 124 44 31-5 88-40-25Z" fill="#352820" stroke="#986b49" strokeWidth="3" />
      <path d="m57 120 15 9-5 103-15-10Zm67 26 22-3-11 108-22 3Zm112-16 24-3-13 109-23 3Z" fill="url(#vault-metal)" stroke="#38291e" strokeWidth="3" />
      <path d="m102 170 199-28M98 229l196-26M54 146l22 15" stroke="#edc994" strokeWidth="2" opacity=".23" />
      <g fill="#cbac7d" stroke="#37281f" strokeWidth="2">{[116, 153, 190, 227, 273].map((x) => <g key={x}><circle cx={x} cy={166 - (x - 116) * .13} r="3" /><circle cx={x - 5} cy={232 - (x - 116) * .13} r="3" /></g>)}</g>
      <g className="vault-latches" fill="url(#vault-metal)" stroke="#1e1b17" strokeWidth="3"><path d="m122 141 23-3-2 43-23 3Z" /><path d="m237 126 23-3-4 40-22 4Z" /></g>
      <path d="m164 181 46-6-4 41-46 5Z" fill="#151f20" stroke="#a87a4e" strokeWidth="3" />
      <path d="m176 190 20-2-2 16-7-5-7 6Z" fill="url(#vault-energy)" className="vault-sigil" />
      <text x="276" y="221" fill="#dfc29c" fontSize="23" fontWeight="900" transform="rotate(-8 276 221)">17</text>
    </svg>
    <span className="vault-interior-light" />
    <span className="vault-lid"><svg viewBox="0 0 360 150">
      <path d="m31 72 222-27 74 35-221 37Z" fill="url(#vault-metal)" stroke="#231a16" strokeWidth="4" />
      <path d="m31 72 75 45-1 23-73-41Z" fill="#5b4030" stroke="#231a16" strokeWidth="3" />
      <path d="m106 117 221-37-3 22-219 38Z" fill="#a47b50" stroke="#33241c" strokeWidth="3" />
      <path d="m61 71 24-3 72 36-23 4Zm123-16 24-3 73 33-23 4Z" fill="#d1a971" stroke="#543b2a" strokeWidth="3" />
      <path d="m104 73 139-17 43 20-140 22Z" fill="#362920" stroke="#c49961" strokeWidth="2" />
      <path d="m148 75 14-2 31 13-14 3Z" fill="#6dcfc8" opacity=".7" />
    </svg></span>
    <span className="vault-energy-column" />
    <span className="vault-motes"><i /><i /><i /><i /><i /><i /><i /><i /></span>
  </span>;
}
