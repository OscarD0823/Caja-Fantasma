import phantomCrateImage from "./assets/phantom-crate-once-human.png";
import lunarEventImage from "./assets/lunar-event.png";
import symbiosisEventImage from "./assets/symbiosis-event.png";
import gravityEventImageA from "./assets/gravity-event-a.png";
import gravityEventImageB from "./assets/gravity-event-b.png";
import gravityWhaleBossImage from "./assets/gravity-whale-boss-v2.webp";
import type { Vision } from "./model";

// Edición de la referencia aportada por OscarD0823: sin enlace, con la marca del juego y cantidad 17.
export const PHANTOM_CRATE_IMAGE = phantomCrateImage;
export const LUNAR_EVENT_IMAGE = lunarEventImage;
export const SYMBIOSIS_EVENT_IMAGE = symbiosisEventImage;
export const GRAVITY_EVENT_IMAGE_A = gravityEventImageA;
export const GRAVITY_EVENT_IMAGE_B = gravityEventImageB;
export const GRAVITY_WHALE_BOSS_IMAGE = gravityWhaleBossImage;

export function visionVisualTheme(vision?: Pick<Vision, "id" | "visualTheme">) {
  if (vision?.visualTheme) return vision.visualTheme;
  if (vision?.id === "gravity" || vision?.id === "lunar" || vision?.id === "symbiosis") return vision.id;
  return "neutral";
}

export function visionVisualImage(vision?: Pick<Vision, "id" | "visualTheme">) {
  const theme = visionVisualTheme(vision);
  if (theme === "gravity") return GRAVITY_EVENT_IMAGE_A;
  if (theme === "lunar") return LUNAR_EVENT_IMAGE;
  if (theme === "symbiosis") return SYMBIOSIS_EVENT_IMAGE;
  return PHANTOM_CRATE_IMAGE;
}
