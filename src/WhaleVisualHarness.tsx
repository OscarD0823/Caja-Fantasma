import type { CSSProperties } from "react";
import type { OverlayCounterStyle, Vision } from "./model";
import OverlayVisual from "./OverlayVisual";
import { overlayDesignSize } from "./overlayGeometry";

const GRAVITY_VISION: Vision = {
  id: "gravity",
  name: "Abismo de Gravedad",
  englishName: "Gravity Abyss",
  enabled: true,
  description: "Vista visual de desarrollo",
  activities: [],
};

const CASES: Array<{ title: string; addonScale: number; counterScale: number; style: OverlayCounterStyle }> = [
  { title: "Ballena 100% · reloj 150%", addonScale: 1, counterScale: 1.5, style: "digital" },
  { title: "Ballena 20% · reloj 150%", addonScale: .2, counterScale: 1.5, style: "ring" },
  { title: "Ballena 20% · reloj 20%", addonScale: .2, counterScale: .2, style: "compact" },
];

export default function WhaleVisualHarness() {
  return <main className="whale-visual-harness">
    <h1>Prueba visual del contador Riftwalker</h1>
    <div>
      {CASES.map((item) => {
        const size = overlayDesignSize(true, "event", item.addonScale, item.counterScale, item.style);
        return <article key={item.title}>
          <span>{item.title}</span>
          <section style={{ width: size.width, height: size.height } as CSSProperties}>
            <OverlayVisual vision={GRAVITY_VISION} phase="active" remainingMs={12 * 60_000 + 34_000} progress={.58} whale={{ visible: true, departing: false, remainingMs: 12 * 60_000 + 34_000, progress: .37 }} addonScale={item.addonScale} whaleCounterScale={item.counterScale} whaleCounterStyle={item.style} shape="event" counterStyle="digital" nameMode="spanish" customName="" preview />
          </section>
        </article>;
      })}
    </div>
  </main>;
}
