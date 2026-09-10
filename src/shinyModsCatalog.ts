export type ShinyModCatalogItem = {
  id: string;
  name: string;
  englishName: string;
  category: "weapon" | "armor";
  groupId: string;
  groupName: string;
  variants: string[];
};

export type ShinyModCatalogGroup = {
  id: string;
  name: string;
  category: "weapon" | "armor";
  mods: ShinyModCatalogItem[];
};

type ModSeed = readonly [name: string, englishName: string, variants?: readonly string[]];

const BASIC_VARIANTS = ["General", "Precisión", "Supervivencia", "Violento", "Energía de aberración"] as const;
const variants = (...extra: string[]) => [...new Set([...BASIC_VARIANTS, ...extra])];

const HELMET_VARIANTS = variants("Creciente", "Energía de aberración creciente", "Lunar", "Energía de aberración lunar");
const GLOVES_VARIANTS = variants("Aero", "Energía de aberración Aero", "Creciente", "Energía de aberración creciente", "Resonancia", "Energía de aberración resonante");
const BOTTOMS_VARIANTS = variants("Aero", "Energía de aberración Aero", "Estrella descendente", "Energía de aberración de estrella descendente", "Resonancia", "Energía de aberración resonante");
const TOP_VARIANTS = variants("Batalla", "Espejo", "Energía de aberración espejo", "Fantasmal", "Energía de aberración fantasmal", "Lunar", "Energía de aberración lunar", "Salvaje", "Energía de aberración salvaje");
const SHOES_VARIANTS = variants("Batalla", "Espejo", "Energía de aberración espejo", "Estrella descendente", "Energía de aberración de estrella descendente", "Fantasmal", "Energía de aberración fantasmal", "Salvaje", "Energía de aberración salvaje");

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function group(id: string, name: string, category: "weapon" | "armor", seeds: readonly ModSeed[], defaultVariants: readonly string[]): ShinyModCatalogGroup {
  return {
    id,
    name,
    category,
    mods: seeds.map(([modName, englishName, customVariants]) => ({
      id: `${id}-${slugify(englishName || modName)}`,
      name: modName,
      englishName,
      category,
      groupId: id,
      groupName: name,
      variants: [...(customVariants ?? defaultVariants)],
    })),
  };
}

const weaponGroup = (id: string, name: string, shinyVariant: string, seeds: readonly ModSeed[]) =>
  group(`weapon-${id}`, `Arma · ${name}`, "weapon", seeds, variants(shinyVariant));

export const SHINY_MOD_GROUPS: ShinyModCatalogGroup[] = [
  weaponGroup("burn", "Quemadura", "Quemadura", [
    ["Bendición ígnea", "Blaze Blessing"],
    ["Brasas", "Embers"],
    ["Ira ardiente", "Burning Wrath"],
    ["Quemadura continua", "Flame Resonance"],
  ]),
  weaponGroup("power-surge", "Sobretensión", "Sobretensión", [
    ["Amplificador de repunte", "Surge Amplifier"],
    ["Descarga devastadora", "Shock Rampage"],
    ["Descarga estática", "Static Shock"],
    ["Dispersión eléctrica", "Shock Diffusion"],
  ]),
  weaponGroup("frost-vortex", "Vórtice de escarcha", "Vórtice de escarcha", [
    ["Bendición gélida", "Frosty Blessing"],
    ["Catalizador criogénico", "Cryo Catalyst"],
    ["Crioexplosión", "Cryo Blast"],
    ["Hielo devastador", "Shattering Ice"],
  ]),
  weaponGroup("bulls-eye", "Diana", "Diana", [
    ["Amplificador de vulnerabilidad", "Vulnerability Amplifier"],
    ["Beneficio del cazador", "Hunter's Perk"],
    ["Marca de recuperación", "Recover Mark"],
    ["Marcas expansivas", "Spreading Marks"],
  ]),
  weaponGroup("fortress-warfare", "Guerra de fortalezas", "Guerra de fortalezas", [
    ["Resistencia unida", "United We Stand"],
    ["Territorio duradero", "Durable Territory"],
    ["Territorio final", "Final Territory"],
    ["Territorio portátil", "Portable Territory"],
  ]),
  weaponGroup("unstable-bomber", "Bombardero inestable", "Bombardero inestable", [
    ["Bombardero temerario", "Reckless Bomber"],
    ["Explosivos potentes", "Heavy Explosives"],
    ["Recuerdo de Bombardero", "Bombardier Souvenir"],
    ["Supercarga", "Super Charged"],
  ]),
  weaponGroup("fast-gunner", "Disparo rápido", "Disparo rápido", [
    ["Aceleración de precisión", "Precision Rush"],
    ["Arsenal", "Shoot Out"],
    ["Lluvia de disparos", "Shooting Blitz"],
    ["Vaquero", "Cowboy"],
  ]),
  weaponGroup("bounce", "Rebote", "Rebote", [
    ["Balas bumerán", "Boomerang Bullet"],
    ["Rebote devastador", "Bounce Rampage"],
    ["Rebote múltiple", "Multi-Bounce"],
    ["Superbala", "Super Bullet"],
  ]),
  weaponGroup("shrapnel", "Metralla", "Metralla", [
    ["Antiescudos", "Shield Breaker"],
    ["Destrózalos a todos", "Shatter Them All"],
    ["Recuerdo de Metralla", "Shrapnel Souvenir"],
    ["Rotura de Metralla", "Shrapnel Smash"],
  ]),
  group("armor-helmet", "Armadura · Casco", "armor", [
    ["Aumento de ímpetu", "Momentum Up"],
    ["Caos elemental", "Elemental Havoc"],
    ["Especialista en anomalías", "Deviation Expert"],
    ["Expansión de cargador", "Overflow"],
    ["Golpe preciso", "Precise Strike"],
    ["Impacto ominoso", "Fortune's Favor"],
    ["Lanzamiento rápido", "Quick Toss"],
    ["Sinfonía de armas", "Weapon Symphony"],
    ["Trabajo excelso", "Work of Proficiency"],
    ["Ventaja de primera acción", "First-Move Advantage"],
  ], HELMET_VARIANTS),
  group("armor-mask", "Armadura · Máscara", "armor", [
    ["Amplificador ígneo", "Blaze Amplifier", variants("Quemadura")],
    ["Explosión con retroceso", "Retrusion Explosion", variants("Quemadura")],
    ["Primera electrocución", "First Electrocution", variants("Sobretensión")],
    ["Tronido", "Thunderclap", variants("Sobretensión")],
    ["Creación de escarcha", "Frost Construct", variants("Vórtice de escarcha")],
    ["Ola gélida marchita", "Frostwave Wither", variants("Vórtice de escarcha")],
    ["Golpe apuntado", "Targeted Strike", variants("Diana")],
    ["Más buscado", "Most Wanted", variants("Diana")],
    ["Cañón ligero", "Light Cannon", variants("Guerra de fortalezas")],
    ["Indestructible", "Unbreakable", variants("Guerra de fortalezas")],
    ["Estallido diferido", "Delayed Blast", variants("Bombardero inestable")],
    ["Golpe certero", "Pinpoint Strike", variants("Bombardero inestable")],
    ["Ráfaga explosiva", "Explosive Barrage", variants("Disparo rápido")],
    ["Relámpago", "Blitzkrieg", variants("Disparo rápido")],
    ["Interrumpir Rebote", "Break Bounce", variants("Rebote")],
    ["Rebotes precisos", "Precision Bounce", variants("Rebote")],
    ["Masacre de Metralla", "Shrapnel Carnage", variants("Metralla")],
    ["Metralla explosiva", "Explosive Shrapnel", variants("Metralla")],
  ], BASIC_VARIANTS),
  group("armor-top", "Armadura · Parte superior", "armor", [
    ["Conflicto frontal", "Head-on Conflict"],
    ["Escudo ardiente", "Ardent Shield"],
    ["Escudo duradero", "Enduring Shield"],
    ["Fortificación de curación", "Healing Fortification"],
    ["Inmune a estado", "Status Immune"],
    ["Líder de guardia", "Head Guard"],
    ["Regreso rápido", "Quick Comeback"],
    ["Rejuvenecimiento", "Rejuvenating"],
    ["Rescate crítico", "Critical Rescue"],
    ["Ventaja de resistencia", "Resist Advantage"],
  ], TOP_VARIANTS),
  group("armor-gloves", "Armadura · Guantes", "armor", [
    ["Amplificador cuerpo a cuerpo", "Melee Amplifier"],
    ["Amplificador de crítico", "Crit Amplifier"],
    ["Amplificador de municiones", "Weapon Amplifier"],
    ["Aumento de crítico", "Crit Boost"],
    ["Aumento de daño en punto débil", "Weakspot DMG Boost"],
    ["Aumento de fuerza vital", "Lifeforce Boost"],
    ["Quemadura continua", "Status Enhancement"],
    ["Sobrecarga elemental", "Elemental Overload"],
  ], GLOVES_VARIANTS),
  group("armor-bottoms", "Armadura · Pantalones", "armor", [
    ["Aumento anómalo", "Abnormal Increase"],
    ["Carga de precisión", "Precision Charge"],
    ["Desvío de proyectiles", "Bullet Siphon"],
    ["Imparable", "Distant Strike"],
    ["Impulso cuerpo a cuerpo", "Melee Momentum"],
    ["Infalible", "Deadshot"],
    ["Oleada crítica", "Critical Surge"],
    ["Recarga devastadora", "Reload Rampage"],
    ["Resonancia elemental", "Elemental Resonance"],
    ["Tres golpes", "Three Strikes"],
  ], BOTTOMS_VARIANTS),
  group("armor-shoes", "Armadura · Zapatos", "armor", [
    ["Avance cubierto", "Covered Advance"],
    ["Carga feroz", "Ferocious Charge"],
    ["Contra todo pronóstico", "Against All Odds"],
    ["Energía de la perseverancia", "Power of Striving"],
    ["Golpe aislado", "Secluded Strike"],
    ["Hora punta", "Rush Hour"],
    ["Lento pero seguro", "Slow and Steady"],
    ["Recolector cruel", "Ruthless Reaper"],
  ], SHOES_VARIANTS),
];

export const SHINY_MOD_CATALOG = SHINY_MOD_GROUPS.flatMap((entry) => entry.mods);

export function normalizeModSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}
