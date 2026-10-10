export type ChestDetail = "full" | "light";

/** Small/coarse-pointer screens and modest devices do not need hundreds of
 * separate metal bevels. This affects artwork only, never progress or sync. */
export function chooseChestDetail({ mobile, coarse, width, cores, memory }: { mobile: boolean; coarse: boolean; width: number; cores?: number; memory?: number }): ChestDetail {
  return mobile || coarse || width <= 760 || (cores !== undefined && cores <= 4) || (memory !== undefined && memory <= 4) ? "light" : "full";
}

export function currentChestDetail(): ChestDetail {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "full";
  return chooseChestDetail({
    mobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    coarse: window.matchMedia("(pointer: coarse)").matches,
    width: window.innerWidth,
    cores: navigator.hardwareConcurrency || undefined,
    memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
  });
}
