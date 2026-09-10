import catalogData from "../catalog/shiny-mods.json" with { type: "json" };

export type ShinyModSystem = "legacy" | "new";

export type ShinyModCatalogItem = {
  id: string;
  itemId: string;
  name: string;
  englishName: string;
  baseName: string;
  baseEnglishName: string;
  variant: string;
  applyRange: string;
  modType: string;
  system: ShinyModSystem;
  isCatalogShiny: boolean;
  tier: number;
  category: "weapon" | "armor";
  groupId: string;
  groupName: string;
};

export type ShinyModCatalogGroup = {
  id: string;
  name: string;
  category: "weapon" | "armor";
  count: number;
};

type ShinyCatalogDocument = {
  schemaVersion: number;
  sourceUrl: string;
  sourceCheckedAt: string;
  counts: {
    total: number;
    legacy: number;
    normal: number;
    shiny: number;
  };
  records: ShinyModCatalogItem[];
};

const document = catalogData as ShinyCatalogDocument;

export const SHINY_MOD_CATALOG = document.records;
export const SHINY_MOD_CATALOG_META = {
  sourceUrl: document.sourceUrl,
  sourceCheckedAt: document.sourceCheckedAt,
  ...document.counts,
};

const groups = new Map<string, ShinyModCatalogGroup>();
for (const item of SHINY_MOD_CATALOG) {
  const current = groups.get(item.groupId);
  if (current) current.count += 1;
  else groups.set(item.groupId, { id: item.groupId, name: item.groupName, category: item.category, count: 1 });
}

export const SHINY_MOD_GROUPS = [...groups.values()].sort((left, right) => {
  if (left.category !== right.category) return left.category === "weapon" ? -1 : 1;
  return left.name.localeCompare(right.name, "es");
});

export function catalogStatusLabel(item: Pick<ShinyModCatalogItem, "system" | "isCatalogShiny">) {
  if (item.system === "legacy") return "Sistema anterior";
  return item.isCatalogShiny ? "Shiny 2.0" : "Normal 2.0";
}

export function normalizeModSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function matchesModSearch(item: ShinyModCatalogItem, search: string) {
  if (!search) return true;
  const haystack = normalizeModSearch([
    item.name,
    item.englishName,
    item.baseName,
    item.baseEnglishName,
    item.variant,
    item.applyRange,
    item.modType,
    item.groupName,
    catalogStatusLabel(item),
    item.itemId,
  ].join(" "));
  return search.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}
