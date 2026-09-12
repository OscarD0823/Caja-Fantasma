import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Activity as ActivityIcon,
  BarChart3,
  Bell,
  Box,
  Check,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileClock,
  Gem,
  Github,
  History,
  LockKeyhole,
  LogIn,
  Mail,
  Minus,
  MonitorUp,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Trash2,
  Undo2,
  Upload,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  Volume2,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import CatalogEditor from "./CatalogEditor";
import OverlayPreviewLab from "./OverlayPreviewLab";
import AppUpdater from "./Updater";
import { GRAVITY_EVENT_IMAGE_A, GRAVITY_EVENT_IMAGE_B, LUNAR_EVENT_IMAGE, PHANTOM_CRATE_IMAGE, SYMBIOSIS_EVENT_IMAGE } from "./assets";
import type { Activity, Catalog, CharacterProfile, OverlayCounterStyle, OverlayNameMode, OverlayShape, PersistedState, PointAction, Settings, ShinyModRecord, Vision } from "./model";
import {
  APP_VERSION,
  AUTHOR,
  BASELINE_BOX_POINTS,
  DEFAULT_CHARACTER_ID,
  REMOTE_CATALOG_URL,
  REPOSITORY_URL,
  actionCharacterIds,
  actionsForCharacter,
  actionsForTeamSession,
  boxStatistics,
  buildBreakdown,
  clampNumber,
  computeCountdownTransition,
  computeCycle,
  createId,
  detachCharacterFromActions,
  formatCompactDuration,
  formatDuration,
  overlayVisionName,
  parseManualBaseline,
  sharedVisionId,
  splitPlatformCarryover,
  validateCatalog,
} from "./model";
import { exportState, importState, loadState, saveState } from "./storage";
import type { ShinyModCatalogItem } from "./shinyModsCatalog";

type ShinyCatalogModule = typeof import("./shinyModsCatalog");
const EMPTY_SHINY_CATALOG: ShinyModCatalogItem[] = [];
const EMPTY_SHINY_GROUPS: ShinyCatalogModule["SHINY_MOD_GROUPS"] = [];

function catalogStatusLabel(item: Pick<ShinyModCatalogItem, "levelLabel">) {
  return item.levelLabel;
}

function catalogOriginLabel(item: Pick<ShinyModCatalogItem, "system">) {
  return item.system === "legacy" ? "Sistema anterior" : "Sistema 2.0";
}

function normalizeModSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function matchesModSearch(item: ShinyModCatalogItem, search: string) {
  if (!search) return true;
  const haystack = normalizeModSearch([item.name, item.englishName, item.baseName, item.baseEnglishName, item.variant, item.applyRange, item.modType, item.groupName, item.levelLabel, catalogOriginLabel(item), item.itemId].join(" "));
  return search.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

type TabId = "progress" | "characters" | "vision" | "history" | "shiny" | "changes" | "settings";
type CreatorAccess = "checking" | "locked" | "granted";

const TABS: Array<{ id: TabId; label: string; icon: typeof Box }> = [
  { id: "progress", label: "Caja", icon: Box },
  { id: "characters", label: "Personajes", icon: Users },
  { id: "vision", label: "Visión", icon: Eye },
  { id: "history", label: "Historial", icon: History },
  { id: "shiny", label: "Mods Brillantes", icon: Gem },
  { id: "changes", label: "Cambios", icon: FileClock },
  { id: "settings", label: "Configuración", icon: Settings2 },
];

const CHANGELOG = [
  {
    version: "1.12.0",
    date: "11 de septiembre de 2026",
    title: "Ballena sin marco y módulos desde nivel cero",
    items: [
      "Lunar vuelve a mostrarse como Lunar en español; el nombre inglés permanece como Lunar Revelry.",
      "Todos los módulos normales muestran Nivel 0–17 y el estado especial se presenta como Brillante.",
      "La Ballena nada desde que entra, continúa moviéndose mientras dispara y conserva el movimiento al retirarse.",
      "El área transparente de la Ballena cambia de tamaño de forma independiente al contador y ya no usa el marco oscuro anterior.",
      "Inicio incluye un botón que abre los controles de tamaño de la ventana y del área de la Ballena.",
    ],
  },
  {
    version: "1.11.0",
    date: "11 de septiembre de 2026",
    title: "Riftwalker animado y controles más ligeros",
    items: [
      "La Ballena usa un recorte transparente optimizado y mueve cola, cuerpo, cabeza, energía y rayo como capas independientes.",
      "El tamaño de la ventana baja hasta 20 % y la Ballena o futuros adicionales tienen un ajuste propio de 20 % a 100 %.",
      "Personajes tiene su propio menú y los apartados Cambios y Desarrollador solo se muestran al propietario verificado.",
      "Puede añadirse un retraso visual corto al terminar el evento sin alterar el ciclo real ni perder tiempo al apagar el PC.",
      "Los temporizadores, sondeos y sincronizaciones reducen su actividad cuando la interfaz está oculta.",
    ],
  },
  {
    version: "1.10.0",
    date: "11 de septiembre de 2026",
    title: "Contador flotante a tu estilo",
    items: [
      "La ventana flotante puede conservar la forma automática del evento o usar un diseño rectangular, cuadrado, vertical o redondo.",
      "El reloj ofrece estilos digital, compacto y circular con anillo de progreso.",
      "El nombre de la rueda puede mostrarse en español, inglés o con un texto personalizado guardado únicamente en este PC.",
      "El laboratorio visual del desarrollador usa la misma combinación elegida y permite comprobarla antes de abrir la ventana real.",
    ],
  },
  {
    version: "1.9.0",
    date: "11 de septiembre de 2026",
    title: "Rueda pública y laboratorio de interfaz",
    items: [
      "OscarD0823 selecciona la única rueda pública desde el editor protegido y el cambio se sincroniza con todos.",
      "Los demás usuarios ya no pueden cambiar la rueda ni ven las ruedas desactivadas.",
      "El modo desarrollador incluye un laboratorio para probar cada evento, fase, Ballena y tamaño sin modificar el contador público.",
      "La ventana flotante se ajusta entre 70 % y 150 %; su X la desactiva y el inicio incluye un botón para volver a agregarla.",
      "La apertura de la caja incorpora partículas, escaneo, órbitas, energía, chispas y una reacción más marcada de la cerradura.",
    ],
  },
  {
    version: "1.8.0",
    date: "11 de septiembre de 2026",
    title: "Ventana flotante viva para cada evento",
    items: [
      "La ventana flotante muestra la imagen del evento seleccionado y adopta una silueta propia para Lunar, Gravedad y Simbiosis.",
      "La Ballena ahora vive únicamente en la ventana flotante: llega desde la izquierda en el minuto 15 de Gravedad y se coloca debajo del contador.",
      "Su rayo funciona como barra y reloj independiente durante los 15 minutos restantes más 5 minutos adicionales; luego se apaga y la Ballena sale por la derecha.",
      "El instalador fue auditado para incluir solo Caja Fantasma, su desinstalador y la dependencia oficial WebView2 cuando haga falta.",
    ],
  },
  {
    version: "1.7.0",
    date: "11 de septiembre de 2026",
    title: "Conteo por personaje y modo Equipo",
    items: [
      "Cada personaje conserva por separado sus puntos, porcentaje estimado e historial de cajas.",
      "El modo Equipo comienza en cero y suma cada recompensa a todos los personajes seleccionados.",
      "Al tener dos o más personajes aparece una barra comparativa para revisar su progreso individual.",
    ],
  },
  {
    version: "1.6.4",
    date: "10 de septiembre de 2026",
    title: "La Ballena convierte su rayo en contador",
    items: [
      "Desde el minuto 15 de Gravedad, la Ballena cruza el contador principal y se coloca debajo.",
      "Al disparar, el rayo azul muestra el tiempo restante y se acorta hasta el cierre del evento.",
      "Cuando Gravedad termina, el rayo se apaga y la Ballena abandona el panel antes de desaparecer.",
    ],
  },
  {
    version: "1.6.3",
    date: "10 de septiembre de 2026",
    title: "Escenas propias para Gravedad",
    items: [
      "Las dos nuevas referencias de la ciudad y los objetos suspendidos alternan exclusivamente durante Gravedad activa.",
      "La transición entre escenas es suave y mantiene legible el contador de la barra.",
      "La Ballena continúa apareciendo encima desde el minuto 15 del evento hasta cinco minutos después de terminar.",
    ],
  },
  {
    version: "1.6.2",
    date: "10 de septiembre de 2026",
    title: "Ambiente propio para Simbiosis",
    items: [
      "La nueva referencia de criaturas transformadas se muestra exclusivamente durante la fase activa de Simbiosis.",
      "La barra y el contador flotante adoptan tonos violeta para distinguir este evento.",
      "Las imágenes de Lunar y Gravedad permanecen separadas de Simbiosis.",
    ],
  },
  {
    version: "1.6.1",
    date: "10 de septiembre de 2026",
    title: "Imagen propia para Lunar",
    items: [
      "La referencia de la luna roja, los jugadores con ojos rojos y la iglesia se usa exclusivamente cuando Lunar está activa.",
      "La imagen de la Ballena continúa reservada únicamente para Gravedad.",
      "Al terminar Lunar, la barra vuelve a su apariencia neutral.",
    ],
  },
  {
    version: "1.6.0",
    date: "10 de septiembre de 2026",
    title: "Módulos organizados por equipo y nivel",
    items: [
      "Las armas aparecen agrupadas por estilo y las armaduras por casco, máscara, parte superior, guantes, pantalones y zapatos.",
      "Cada grupo tiene su propio encabezado y el selector separa claramente ARMAS de ARMADURA.",
      "Los módulos normales muestran Nivel 0–17 y las versiones especiales se muestran como Brillante.",
      "El nivel antiguo de la fuente dejó de mostrarse como si fuera el nivel actual del módulo.",
      "El objetivo global cambió a 1.000 puntos y el Desafío de Manibus de Endless Dream ahora suma 1 punto.",
      "El propietario puede publicar el tiempo exacto de la rueda para que todos los equipos adopten el mismo ciclo absoluto, incluso tras apagar el PC.",
      "Se desactivaron por completo las notificaciones de escritorio; el aviso hablado de Gravedad permanece disponible.",
      "La ventana flotante recuerda su última posición y la barra cambia de ambiente para Lunar y Gravedad, incluida la aparición temporal de la Ballena.",
      "La actualización limpia una sola vez los registros personales anteriores y corrige la validación de GitHub para aceptar valores editados por el propietario.",
      "La apertura usa la caja completa: el emblema se desplaza hasta la ranura de una esquina antes de revelar el programa.",
    ],
  },
  {
    version: "1.5.0",
    date: "10 de septiembre de 2026",
    title: "Catálogo completo de módulos",
    items: [
      "El buscador ahora cubre los 1.825 registros exactos: 207 del sistema anterior, 809 normales 2.0 y 809 Brillantes 2.0.",
      "Cada combinación de nombre, variante, ranura, estilo e ID se puede buscar y añadir al seguimiento.",
      "Todos los registros se pueden controlar como objetivo Brillante, sin restricciones por su clasificación de origen.",
      "Nuevo buscador para localizar objetivos activos y módulos Brillantes ya conseguidos dentro del historial personal.",
    ],
  },
  {
    version: "1.4.0",
    date: "10 de septiembre de 2026",
    title: "Control de módulos Brillantes",
    items: [
      "Nuevo seguimiento de intentos fallidos con duplicados nivel 17 para cada módulo y variante.",
      "Colección separada para marcar los módulos que ya se convirtieron en Brillantes y conservar su fecha.",
      "Catálogo bilingüe con 100 módulos base actuales: 36 de arma y 64 de armadura.",
      "Hora punta · Estrella descendente está disponible como combinación del catálogo.",
    ],
  },
  {
    version: "1.3.0",
    date: "10 de septiembre de 2026",
    title: "Contador exacto e historial aproximado",
    items: [
      "Gravedad quedó sincronizada con el cierre indicado a las 4:52:30 p. m. de Colombia.",
      "La sección Visión permite escribir el tiempo exacto restante y elegir si falta para empezar o terminar.",
      "Se pueden cargar valores históricos aproximados manualmente para ampliar la base de estimación.",
      "Los valores aproximados permanecen separados de las cajas confirmadas y se guardan en el respaldo local.",
    ],
  },
  {
    version: "1.2.0",
    date: "10 de septiembre de 2026",
    title: "Editor protegido y apertura animada",
    items: [
      "Un único instalador sirve para todos los usuarios.",
      "El modo desarrollador se desbloquea únicamente al verificar la cuenta propietaria OscarD0823 mediante GitHub CLI.",
      "Nueva animación de inicio: el emblema actúa como cerradura y abre la caja.",
      "La cantidad mostrada en la imagen de referencia cambió de 1 a 17.",
    ],
  },
  {
    version: "1.1.1",
    date: "10 de septiembre de 2026",
    title: "Ciclo sincronizado",
    items: [
      "La imagen de la caja ya no muestra el símbolo azul de enlace.",
      "El ciclo se sincronizó cuando faltaban 27 minutos para comenzar y continuará alternando 30 minutos activo y 30 minutos en espera.",
    ],
  },
  {
    version: "1.1.0",
    date: "10 de septiembre de 2026",
    title: "Promedio real y alertas por voz",
    items: [
      "La columna A de la hoja aporta 16 salidas iniciales: promedio 955,5; mínima 320; máxima 1.447.",
      "Rangos observados: zona baja 704,875, centro 955,5 y zona alta 1.206,125.",
      "Las cajas recibidas por correo de Plataformas conservan en el intento nuevo lo reclamado durante la última hora.",
      "Invasión de Zona Onírica y los tres tipos de Soñador se añadieron con 1 punto cada uno.",
      "El ciclo inicial de la Rueda Visional ahora es de 30 minutos de espera y 30 minutos activa.",
      "Gravedad avisa por voz antes de comenzar, con anticipación configurable y botón de prueba.",
      "La caja de referencia ahora muestra la marca de Once Human en lugar de la tarjeta del arma.",
      "El catálogo del propietario se publica automáticamente y los demás equipos lo revisan cada minuto.",
      "El actualizador comprueba nuevas versiones también mientras la aplicación permanece abierta.",
    ],
  },
  {
    version: "1.0.0",
    date: "10 de septiembre de 2026",
    title: "Primera versión completa",
    items: [
      "Seguimiento ponderado de recompensas Pro y de la Rueda Visional.",
      "Lunar, Gravedad y Simbiosis incluidas; Ballena vale 1 y Plataformas vale 4.",
      "Simbiosis queda desactivada con Araña, Antena y Grandulón sin puntos.",
      "Historial automático de cajas con fecha, hora, mínimo, máximo, promedio y porcentajes.",
      "Temporizador cíclico, avisos, inicio con Windows y ventana flotante ajustable.",
      "Catálogo remoto público y publicación desde el equipo del propietario mediante GitHub CLI.",
      "Actualizaciones firmadas desde GitHub Releases siguiendo el patrón de Fortuna Real.",
    ],
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function pointsLabel(points: number) {
  return `${points} ${points === 1 ? "punto" : "puntos"}`;
}

function speakMessage(message: string) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "es-CO";
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

function normalizeCycleState(state: PersistedState, now: number): PersistedState {
  const cycle = computeCycle(state.settings, now);
  const durationMinutes = cycle.phase === "active" ? state.settings.activeMinutes : state.settings.waitMinutes;
  const phaseStartedAt = new Date(new Date(cycle.phaseEndsAt).getTime() - durationMinutes * 60_000).toISOString();
  if (state.settings.phase === cycle.phase && state.settings.phaseStartedAt === phaseStartedAt) return state;
  return { ...state, settings: { ...state.settings, phase: cycle.phase, phaseStartedAt } };
}

async function showOverlay(show: boolean) {
  if (!isTauri()) return;
  const overlay = await WebviewWindow.getByLabel("overlay");
  if (!overlay) return;
  if (show) await overlay.show();
  else await overlay.hide();
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [tab, setTab] = useState<TabId>("progress");
  const [now, setNow] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState("Catálogo local listo");
  const [toast, setToast] = useState("");
  const [introVisible, setIntroVisible] = useState(true);
  const [homeOverlayConfigOpen, setHomeOverlayConfigOpen] = useState(false);
  const [creatorAccess, setCreatorAccess] = useState<CreatorAccess>("checking");
  const [creatorMessage, setCreatorMessage] = useState("Comprobando la cuenta de GitHub…");
  const initialCycle = useRef(computeCycle(state.settings));
  const initialCycleSeconds = Math.ceil(initialCycle.current.remainingMs / 1000);
  const [counterPhase, setCounterPhase] = useState<"waiting" | "active">(initialCycle.current.phase);
  const [counterMinutes, setCounterMinutes] = useState(() => String(Math.floor(initialCycleSeconds / 60)));
  const [counterSeconds, setCounterSeconds] = useState(() => String(initialCycleSeconds % 60));
  const [manualHistoryText, setManualHistoryText] = useState("");
  const [newCharacterName, setNewCharacterName] = useState("");
  const [shinyCatalogModule, setShinyCatalogModule] = useState<ShinyCatalogModule>();
  const [shinyCatalogError, setShinyCatalogError] = useState("");
  const [shinyCatalogAttempt, setShinyCatalogAttempt] = useState(0);
  const [shinySearch, setShinySearch] = useState("");
  const [shinyGroupFilter, setShinyGroupFilter] = useState("all");
  const [shinySystemFilter, setShinySystemFilter] = useState("all");
  const [shinyRecordSearch, setShinyRecordSearch] = useState("");
  const [selectedShinyModId, setSelectedShinyModId] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const voiceAlertRef = useRef("");

  const SHINY_MOD_CATALOG = shinyCatalogModule?.SHINY_MOD_CATALOG ?? EMPTY_SHINY_CATALOG;
  const SHINY_MOD_GROUPS = shinyCatalogModule?.SHINY_MOD_GROUPS ?? EMPTY_SHINY_GROUPS;
  const SHINY_MOD_CATALOG_META = shinyCatalogModule?.SHINY_MOD_CATALOG_META ?? { sourceUrl: "", sourceCheckedAt: "", total: 0, legacy: 0, normal: 0, shiny: 0 };
  const defaultShinyMod = SHINY_MOD_CATALOG.find((item) => item.englishName === "Rush Hour <Downstar>" && !item.isCatalogShiny) ?? SHINY_MOD_CATALOG[0];

  const referencePoints = useMemo(() => [...BASELINE_BOX_POINTS, ...state.manualBaselinePoints], [state.manualBaselinePoints]);
  const target = clampNumber(state.catalog.boxTargetPoints, 1, 10_000);
  const activeCharacter = state.characters.find((character) => character.id === state.activeCharacterId) ?? state.characters[0];
  const isTeamMode = state.trackingMode === "team" && state.characters.length > 1;
  const activeCharacterActions = useMemo(() => actionsForCharacter(state.actions, activeCharacter.id), [state.actions, activeCharacter.id]);
  const activeTeamActions = useMemo(() => actionsForTeamSession(state.actions, state.activeTeamSessionId), [state.actions, state.activeTeamSessionId]);
  const currentActions = isTeamMode ? activeTeamActions : activeCharacterActions;
  const currentPoints = useMemo(() => currentActions.reduce((sum, action) => sum + action.points, 0), [currentActions]);
  const currentClaims = currentActions.length;
  const breakdown = useMemo(() => buildBreakdown(currentActions), [currentActions]);
  const activeCharacterBoxes = useMemo(() => state.boxes.filter((box) => (box.characterId ?? DEFAULT_CHARACTER_ID) === activeCharacter.id), [state.boxes, activeCharacter.id]);
  const activeCharacterPoints = useMemo(() => activeCharacterActions.reduce((sum, action) => sum + action.points, 0), [activeCharacterActions]);
  const stats = useMemo(() => boxStatistics(activeCharacterBoxes, activeCharacterPoints, referencePoints), [activeCharacterBoxes, activeCharacterPoints, referencePoints]);
  const characterSummaries = useMemo(() => state.characters.map((character) => {
    const actions = actionsForCharacter(state.actions, character.id);
    const points = actions.reduce((sum, action) => sum + action.points, 0);
    const boxes = state.boxes.filter((box) => (box.characterId ?? DEFAULT_CHARACTER_ID) === character.id);
    return { character, points, chance: boxStatistics(boxes, points, referencePoints).currentChancePercent };
  }), [state.characters, state.actions, state.boxes, referencePoints]);
  const selectedTeamSummaries = characterSummaries.filter((summary) => state.teamMemberIds.includes(summary.character.id));
  const displayedChance = isTeamMode && selectedTeamSummaries.length > 0
    ? selectedTeamSummaries.reduce((sum, summary) => sum + summary.chance, 0) / selectedTeamSummaries.length
    : stats.currentChancePercent;
  const teamReady = !isTeamMode || state.teamMemberIds.length >= 2;
  const baselineStats = useMemo(() => boxStatistics([], 0, referencePoints), [referencePoints]);
  const publicVisionId = sharedVisionId(state.catalog, state.settings.selectedVisionId);
  const selectedVision = state.catalog.visions.find((vision) => vision.id === publicVisionId) ?? state.catalog.visions.find((vision) => vision.enabled) ?? state.catalog.visions[0];
  const cycle = computeCycle(state.settings, now);
  const transition = computeCountdownTransition(state.settings, now);
  const overlayDisplayName = overlayVisionName(selectedVision, state.settings.overlayNameMode, state.settings.overlayCustomName);
  const overlayDisplayMs = transition.active ? transition.remainingMs : cycle.remainingMs;
  const overlayDisplayTimer = state.settings.overlayCounterStyle === "compact" ? formatCompactDuration(overlayDisplayMs) : formatDuration(overlayDisplayMs);
  const visibleTabs = TABS.filter((item) => item.id !== "changes" || creatorAccess === "granted");
  const targetProgress = Math.min(100, Math.round((currentPoints / target) * 100));
  const selectedShinyMod = SHINY_MOD_CATALOG.find((item) => item.id === selectedShinyModId) ?? defaultShinyMod;
  const normalizedShinySearch = normalizeModSearch(shinySearch);
  const filteredShinyCatalog = useMemo(() => SHINY_MOD_CATALOG.filter((item) => {
    if (shinyGroupFilter !== "all" && item.groupId !== shinyGroupFilter) return false;
    if (shinySystemFilter === "legacy" && item.system !== "legacy") return false;
    if (shinySystemFilter === "normal" && (item.system !== "new" || item.isCatalogShiny)) return false;
    if (shinySystemFilter === "shiny" && (item.system !== "new" || !item.isCatalogShiny)) return false;
    return matchesModSearch(item, normalizedShinySearch);
  }), [SHINY_MOD_CATALOG, normalizedShinySearch, shinyGroupFilter, shinySystemFilter]);
  const visibleItemsPerGroup = shinyGroupFilter !== "all" || normalizedShinySearch ? 150 : 12;
  const groupedVisibleShinyCatalog = useMemo(() => SHINY_MOD_GROUPS.map((group) => ({
    ...group,
    items: filteredShinyCatalog.filter((item) => item.groupId === group.id).slice(0, visibleItemsPerGroup),
  })).filter((group) => group.items.length > 0), [SHINY_MOD_GROUPS, filteredShinyCatalog, visibleItemsPerGroup]);
  const visibleShinyCatalogCount = groupedVisibleShinyCatalog.reduce((sum, group) => sum + group.items.length, 0);
  const normalizedRecordSearch = normalizeModSearch(shinyRecordSearch);
  const matchesRecordSearch = (item: ShinyModRecord) => !normalizedRecordSearch || normalizeModSearch(`${item.modName} ${item.englishName ?? ""} ${item.groupName} ${item.variant}`).includes(normalizedRecordSearch);
  const allActiveShinyGoals = state.shinyMods.filter((item) => !item.isShiny);
  const allObtainedShinyMods = state.shinyMods.filter((item) => item.isShiny);
  const activeShinyGoals = allActiveShinyGoals.filter(matchesRecordSearch);
  const obtainedShinyMods = allObtainedShinyMods.filter(matchesRecordSearch);
  const totalShinyAttempts = state.shinyMods.reduce((sum, item) => sum + item.attempts, 0);
  const catalogShinyOwned = new Set(allObtainedShinyMods.flatMap((item) => item.catalogId ? [item.catalogId] : [])).size;
  const shinyCollectionPercent = (catalogShinyOwned / SHINY_MOD_CATALOG.length) * 100;

  const commitState = useCallback((update: PersistedState | ((current: PersistedState) => PersistedState)) => {
    setState((current) => typeof update === "function" ? update(current) : update);
  }, []);

  const checkCreatorAccess = useCallback(async () => {
    if (!isTauri()) {
      if (import.meta.env.DEV) {
        setCreatorAccess("granted");
        setCreatorMessage("Laboratorio local de desarrollo; la publicación está deshabilitada en el navegador.");
        return;
      }
      setCreatorAccess("locked");
      setCreatorMessage("La verificación solo funciona en el instalador Creador de Windows.");
      return;
    }
    setCreatorAccess("checking");
    setCreatorMessage("Comprobando la cuenta de GitHub…");
    try {
      const login = await invoke<string>("verify_github_owner");
      setCreatorAccess("granted");
      setCreatorMessage(`Acceso verificado como ${login}.`);
    } catch (error) {
      setCreatorAccess("locked");
      setCreatorMessage(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const startCreatorLogin = async () => {
    try {
      const message = await invoke<string>("start_github_login");
      setCreatorAccess("locked");
      setCreatorMessage(message);
    } catch (error) {
      setCreatorAccess("locked");
      setCreatorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), 5600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void checkCreatorAccess();
  }, [checkCreatorAccess]);

  useEffect(() => {
    if (tab !== "shiny" || shinyCatalogModule) return;
    let cancelled = false;
    setShinyCatalogError("");
    void import("./shinyModsCatalog")
      .then((catalogModule) => {
        if (cancelled) return;
        setShinyCatalogModule(catalogModule);
        const initial = catalogModule.SHINY_MOD_CATALOG.find((item) => item.englishName === "Rush Hour <Downstar>" && !item.isCatalogShiny) ?? catalogModule.SHINY_MOD_CATALOG[0];
        if (initial) setSelectedShinyModId((current) => current || initial.id);
      })
      .catch(() => {
        if (!cancelled) setShinyCatalogError("No se pudo cargar el catálogo local de módulos.");
      });
    return () => { cancelled = true; };
  }, [shinyCatalogAttempt, shinyCatalogModule, tab]);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    const receiveOverlayChange = () => setState(loadState());
    window.addEventListener("storage", receiveOverlayChange);
    let stopListening: (() => void) | undefined;
    if (isTauri()) void listen("caja-fantasma-overlay-disabled", receiveOverlayChange).then((stop) => { stopListening = stop; });
    return () => {
      window.removeEventListener("storage", receiveOverlayChange);
      stopListening?.();
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const tick = () => {
      if (stopped) return;
      const timestamp = Date.now();
      setNow(timestamp);
      setState((current) => normalizeCycleState(current, timestamp));
      timer = window.setTimeout(tick, document.visibilityState === "visible" ? 1_000 : 5_000);
    };
    timer = window.setTimeout(tick, 1_000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (creatorAccess !== "granted" && tab === "changes") setTab("progress");
  }, [creatorAccess, tab]);

  useEffect(() => {
    void showOverlay(state.settings.overlayEnabled);
  }, [state.settings.overlayEnabled]);

  useEffect(() => {
    const leadMinutes = clampNumber(state.settings.voiceLeadMinutes, 1, 60);
    const phaseKey = state.settings.phaseStartedAt;
    if (cycle.phase !== "waiting" || selectedVision?.id !== "gravity" || !state.settings.voiceNotificationsEnabled) return;
    if (cycle.remainingMs > leadMinutes * 60_000 || state.settings.lastVoiceAlertPhaseStartedAt === phaseKey || voiceAlertRef.current === phaseKey) return;

    voiceAlertRef.current = phaseKey;
    const remainingMinutes = Math.max(1, Math.ceil(cycle.remainingMs / 60_000));
    const message = `Atención. La Rueda Visional de Gravedad comienza en ${remainingMinutes} ${remainingMinutes === 1 ? "minuto" : "minutos"}.`;
    speakMessage(message);
    commitState((current) => ({
      ...current,
      settings: { ...current.settings, lastVoiceAlertPhaseStartedAt: phaseKey },
    }));

  }, [commitState, cycle.phase, cycle.remainingMs, selectedVision?.id, state.settings.lastVoiceAlertPhaseStartedAt, state.settings.phaseStartedAt, state.settings.voiceLeadMinutes, state.settings.voiceNotificationsEnabled]);

  const syncCatalog = useCallback(async (silent = false) => {
    if (!silent) setSyncStatus("Buscando catálogo público…");
    try {
      const response = await fetch(`${REMOTE_CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = await response.json() as unknown;
      if (!validateCatalog(catalog)) throw new Error("formato no válido");
      setState((current) => {
        if (catalog.catalogVersion < current.catalog.catalogVersion) return current;
        const hasNewCatalog = catalog.catalogVersion > current.catalog.catalogVersion;
        const timing = catalog.eventTiming;
        const appliedTiming = Date.parse(current.settings.sharedTimingUpdatedAt ?? "");
        const remoteTiming = Date.parse(timing?.updatedAt ?? "");
        if (!timing) return hasNewCatalog ? { ...current, catalog } : current;
        const selectedVisionId = sharedVisionId(catalog, current.settings.selectedVisionId);
        const hasNewTiming = !Number.isFinite(appliedTiming) || remoteTiming > appliedTiming;
        if (!hasNewCatalog && !hasNewTiming && current.settings.selectedVisionId === selectedVisionId) return current;
        return {
          ...current,
          catalog: hasNewCatalog ? catalog : current.catalog,
          settings: {
            ...current.settings,
            selectedVisionId,
            ...(hasNewTiming ? {
              waitMinutes: timing.waitMinutes,
              activeMinutes: timing.activeMinutes,
              transitionDelaySeconds: clampNumber(timing.transitionDelaySeconds ?? current.settings.transitionDelaySeconds, 0, 300),
              phaseStartedAt: timing.phaseStartedAt,
              phase: timing.phase,
              lastNotificationPhaseStartedAt: undefined,
              lastVoiceAlertPhaseStartedAt: undefined,
              sharedTimingUpdatedAt: timing.updatedAt,
            } : {}),
          },
        };
      });
      setSyncStatus("Catálogo público comprobado");
    } catch (error) {
      setSyncStatus(`Sin conexión · usando catálogo local`);
      if (!silent) console.info("No se pudo sincronizar el catálogo", error);
    }
  }, []);

  useEffect(() => {
    void syncCatalog(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncCatalog(true);
    }, 60_000);
    const refresh = () => void syncCatalog(true);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [syncCatalog]);

  useEffect(() => {
    if (!isTauri()) return;
    void isEnabled().then((enabled) => {
      if (state.settings.autoStartEnabled && !enabled) void enable().catch(() => undefined);
      if (!state.settings.autoStartEnabled && enabled) void disable().catch(() => undefined);
    });
  }, [state.settings.autoStartEnabled]);

  const addActivity = (activity: Activity, vision?: Vision) => {
    if (!activity.enabled || activity.points <= 0 || (vision && !vision.enabled)) return;
    if (isTeamMode && !teamReady) {
      setToast("Selecciona al menos dos personajes para registrar en Equipo");
      window.setTimeout(() => setToast(""), 2600);
      return;
    }
    const action: PointAction = {
      id: createId("claim"),
      activityId: activity.id,
      activityName: activity.name,
      visionId: vision?.id,
      visionName: vision?.name,
      points: activity.points,
      occurredAt: new Date().toISOString(),
      characterIds: isTeamMode ? [...state.teamMemberIds] : [activeCharacter.id],
      trackingMode: isTeamMode ? "team" : "solo",
      teamSessionId: isTeamMode ? state.activeTeamSessionId : undefined,
    };
    commitState((current) => ({ ...current, actions: [...current.actions, action] }));
    setToast(isTeamMode ? `+${activity.points} para ${state.teamMemberIds.length} personajes · ${activity.name}` : `+${activity.points} · ${activity.name}`);
    window.setTimeout(() => setToast(""), 1800);
  };

  const removeActionFromCurrentTracking = (actionId: string) => {
    commitState((current) => {
      if (isTeamMode) return { ...current, actions: current.actions.filter((action) => action.id !== actionId) };
      return { ...current, actions: detachCharacterFromActions(current.actions, activeCharacter.id, new Set([actionId])) };
    });
  };

  const removeLastActivity = (activityId: string, visionId?: string) => {
    const action = [...currentActions].reverse().find((item) => `${item.visionId ?? "pro"}:${item.activityId}` === `${visionId ?? "pro"}:${activityId}`);
    if (action) removeActionFromCurrentTracking(action.id);
  };

  const undoLastAction = () => {
    const action = currentActions.at(-1);
    if (action) removeActionFromCurrentTracking(action.id);
  };

  const markBox = (source: "normal" | "platform-mail" = "normal") => {
    if (isTeamMode) {
      setToast("Cambia a Solitario para indicar a qué personaje le salió la caja");
      window.setTimeout(() => setToast(""), 2800);
      return;
    }
    if (activeCharacterActions.length === 0) return;
    const split = source === "platform-mail" ? splitPlatformCarryover(activeCharacterActions) : { completedAttempt: activeCharacterActions, carryOver: [] as PointAction[] };
    if (split.completedAttempt.length === 0) {
      setToast("Todavía no hay recompensas con una hora de antigüedad para cerrar esta caja");
      window.setTimeout(() => setToast(""), 3200);
      return;
    }
    const recordedPoints = split.completedAttempt.reduce((sum, action) => sum + action.points, 0);
    const carriedPoints = split.carryOver.reduce((sum, action) => sum + action.points, 0);
    const record = {
      id: createId("box"),
      occurredAt: new Date().toISOString(),
      points: recordedPoints,
      claims: split.completedAttempt.length,
      source,
      carriedPoints,
      characterId: activeCharacter.id,
      characterName: activeCharacter.name,
      breakdown: buildBreakdown(split.completedAttempt),
    };
    const completedIds = new Set(split.completedAttempt.map((action) => action.id));
    commitState((current) => ({ ...current, actions: detachCharacterFromActions(current.actions, activeCharacter.id, completedIds), boxes: [record, ...current.boxes] }));
    setToast(source === "platform-mail" ? `Caja de ${activeCharacter.name} registrada; ${carriedPoints} puntos pasan al nuevo intento` : `Caja de ${activeCharacter.name} registrada con ${recordedPoints} puntos`);
    window.setTimeout(() => setToast(""), 2400);
  };

  const resetAttempt = () => {
    if (currentActions.length === 0) return;
    if (isTeamMode) {
      commitState((current) => ({
        ...current,
        actions: current.actions.filter((action) => !(action.trackingMode === "team" && action.teamSessionId === current.activeTeamSessionId && actionCharacterIds(action).length === 0)),
        activeTeamSessionId: createId("team"),
      }));
      return;
    }
    commitState((current) => ({ ...current, actions: detachCharacterFromActions(current.actions, activeCharacter.id) }));
  };

  const setTrackingMode = (mode: "solo" | "team") => {
    if (mode === "team" && state.characters.length < 2) return;
    commitState((current) => ({ ...current, trackingMode: mode }));
  };

  const selectCharacter = (characterId: string) => {
    commitState((current) => ({ ...current, activeCharacterId: characterId, trackingMode: "solo" }));
  };

  const toggleTeamMember = (characterId: string) => {
    commitState((current) => ({
      ...current,
      teamMemberIds: current.teamMemberIds.includes(characterId)
        ? current.teamMemberIds.filter((id) => id !== characterId)
        : [...current.teamMemberIds, characterId],
    }));
  };

  const startNewTeamCount = () => {
    commitState((current) => ({
      ...current,
      actions: current.actions.filter((action) => !(action.trackingMode === "team" && action.teamSessionId === current.activeTeamSessionId && actionCharacterIds(action).length === 0)),
      activeTeamSessionId: createId("team"),
      trackingMode: "team",
    }));
    setToast("Nuevo conteo de Equipo iniciado en 0; los puntos personales se conservan");
    window.setTimeout(() => setToast(""), 3000);
  };

  const addCharacter = () => {
    const name = newCharacterName.trim().slice(0, 40);
    if (!name || state.characters.length >= 12) {
      setToast(state.characters.length >= 12 ? "Puedes registrar hasta 12 personajes" : "Escribe el nombre del personaje");
      window.setTimeout(() => setToast(""), 2400);
      return;
    }
    const character: CharacterProfile = { id: createId("character"), name, createdAt: new Date().toISOString() };
    commitState((current) => ({ ...current, characters: [...current.characters, character], teamMemberIds: [...current.teamMemberIds, character.id] }));
    setNewCharacterName("");
    setToast(`${name} agregado`);
    window.setTimeout(() => setToast(""), 1800);
  };

  const renameCharacter = (characterId: string, name: string) => {
    const cleanName = name.trim().slice(0, 40);
    if (!cleanName) return;
    commitState((current) => ({
      ...current,
      characters: current.characters.map((character) => character.id === characterId ? { ...character, name: cleanName } : character),
      boxes: current.boxes.map((box) => box.characterId === characterId ? { ...box, characterName: cleanName.trim() || box.characterName } : box),
    }));
  };

  const removeCharacter = (characterId: string) => {
    const character = state.characters.find((item) => item.id === characterId);
    if (!character || state.characters.length <= 1 || !window.confirm(`¿Eliminar a ${character.name}? Su historial de cajas se conservará, pero se quitará su intento actual.`)) return;
    commitState((current) => {
      const characters = current.characters.filter((item) => item.id !== characterId);
      return {
        ...current,
        characters,
        actions: detachCharacterFromActions(current.actions, characterId),
        activeCharacterId: current.activeCharacterId === characterId ? characters[0].id : current.activeCharacterId,
        teamMemberIds: current.teamMemberIds.filter((id) => id !== characterId),
        trackingMode: characters.length > 1 ? current.trackingMode : "solo",
      };
    });
  };

  const setCyclePhase = (phase: "waiting" | "active") => {
    commitState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        phase,
        phaseStartedAt: new Date().toISOString(),
        lastNotificationPhaseStartedAt: phase === "active" ? undefined : current.settings.lastNotificationPhaseStartedAt,
      },
    }));
    setNow(Date.now());
  };

  const synchronizeCountdown = () => {
    const minutes = Math.max(0, Math.floor(Number(counterMinutes) || 0));
    const seconds = clampNumber(Math.floor(Number(counterSeconds) || 0), 0, 59);
    const durationMinutes = counterPhase === "active" ? state.settings.activeMinutes : state.settings.waitMinutes;
    const durationMs = durationMinutes * 60_000;
    const requestedMs = (minutes * 60 + seconds) * 1000;
    if (requestedMs < 1000 || requestedMs > durationMs) {
      setToast(`El tiempo debe estar entre 00:01 y ${formatDuration(durationMs)}`);
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    const timestamp = Date.now();
    const phaseStartedAt = new Date(timestamp - (durationMs - requestedMs)).toISOString();
    commitState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        phase: counterPhase,
        phaseStartedAt,
        lastNotificationPhaseStartedAt: undefined,
        lastVoiceAlertPhaseStartedAt: undefined,
      },
    }));
    setCounterMinutes(String(minutes));
    setCounterSeconds(String(seconds));
    setNow(timestamp);
    setToast(counterPhase === "waiting" ? "Contador ajustado: falta para empezar" : "Contador ajustado: falta para terminar");
    window.setTimeout(() => setToast(""), 2400);
  };

  const loadCurrentCountdown = () => {
    const remainingSeconds = Math.ceil(cycle.remainingMs / 1000);
    setCounterPhase(cycle.phase);
    setCounterMinutes(String(Math.floor(remainingSeconds / 60)));
    setCounterSeconds(String(remainingSeconds % 60));
  };

  const addManualHistory = () => {
    const available = Math.max(0, 500 - state.manualBaselinePoints.length);
    const values = parseManualBaseline(manualHistoryText, available);
    if (values.length === 0) {
      setToast(available === 0 ? "Alcanzaste el máximo de 500 valores aproximados" : "Escribe al menos un valor válido entre 1 y 10.000");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    commitState((current) => ({ ...current, manualBaselinePoints: [...current.manualBaselinePoints, ...values] }));
    setManualHistoryText("");
    setToast(`${values.length} ${values.length === 1 ? "valor aproximado agregado" : "valores aproximados agregados"}`);
    window.setTimeout(() => setToast(""), 2400);
  };

  const chooseShinyMod = (item: ShinyModCatalogItem) => {
    setSelectedShinyModId(item.id);
  };

  const addShinyTracker = (customName?: string) => {
    if (!selectedShinyMod) {
      setToast("El catálogo de módulos todavía se está cargando");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    const custom = customName?.trim();
    const modName = custom || selectedShinyMod.baseName;
    const catalogId = custom ? undefined : selectedShinyMod.id;
    const groupName = custom ? "Módulo personalizado" : `${selectedShinyMod.groupName} · ${catalogStatusLabel(selectedShinyMod)}`;
    const englishName = custom ? undefined : selectedShinyMod.baseEnglishName;
    const variant = custom ? "Personalizado" : selectedShinyMod.variant;
    const duplicate = state.shinyMods.some((item) => (catalogId ? item.catalogId === catalogId : normalizeModSearch(item.modName) === normalizeModSearch(modName)) && normalizeModSearch(item.variant) === normalizeModSearch(variant));
    if (duplicate) {
      setToast("Ese módulo y variante ya están en tu seguimiento");
      window.setTimeout(() => setToast(""), 2600);
      return;
    }
    const record: ShinyModRecord = {
      id: createId("shiny"),
      catalogId,
      modName,
      englishName,
      groupName,
      variant,
      attempts: 0,
      isShiny: false,
      createdAt: new Date().toISOString(),
    };
    commitState((current) => ({ ...current, shinyMods: [record, ...current.shinyMods] }));
    setToast(`${modName} agregado con 0 intentos`);
    window.setTimeout(() => setToast(""), 2200);
  };

  const updateShinyRecord = (id: string, update: (record: ShinyModRecord) => ShinyModRecord) => {
    commitState((current) => ({ ...current, shinyMods: current.shinyMods.map((record) => record.id === id ? update(record) : record) }));
  };

  const adjustShinyAttempts = (id: string, amount: number) => {
    updateShinyRecord(id, (record) => ({ ...record, attempts: clampNumber(record.attempts + amount, 0, 100_000) }));
  };

  const setShinyObtained = (id: string, obtained: boolean) => {
    updateShinyRecord(id, (record) => ({ ...record, isShiny: obtained, obtainedAt: obtained ? new Date().toISOString() : undefined }));
    setToast(obtained ? "Módulo marcado como Brillante" : "Módulo devuelto a la lista de búsqueda");
    window.setTimeout(() => setToast(""), 2200);
  };

  const saveCatalog = useCallback((catalog: Catalog) => {
    commitState((current) => ({ ...current, catalog, settings: { ...current.settings, selectedVisionId: sharedVisionId(catalog, current.settings.selectedVisionId) } }));
    setSyncStatus(`Cambios locales v${catalog.catalogVersion} listos para publicar`);
  }, [commitState]);

  const publishCatalog = useCallback(async (catalog: Catalog) => {
    if (!isTauri()) throw new Error("La publicación solo está disponible en la aplicación de escritorio.");
    const message = await invoke<string>("publish_catalog", { catalogJson: JSON.stringify(catalog, null, 2) });
    setSyncStatus(message);
    return message;
  }, []);

  const buildCountdownSettings = (): { settings: Settings; timestamp: number } | undefined => {
    const minutes = Math.max(0, Math.floor(Number(counterMinutes) || 0));
    const seconds = clampNumber(Math.floor(Number(counterSeconds) || 0), 0, 59);
    const durationMinutes = counterPhase === "active" ? state.settings.activeMinutes : state.settings.waitMinutes;
    const durationMs = durationMinutes * 60_000;
    const requestedMs = (minutes * 60 + seconds) * 1000;
    if (requestedMs < 1000 || requestedMs > durationMs) {
      setToast(`El tiempo debe estar entre 00:01 y ${formatDuration(durationMs)}`);
      window.setTimeout(() => setToast(""), 3000);
      return undefined;
    }
    const timestamp = Date.now();
    return {
      timestamp,
      settings: {
        ...state.settings,
        phase: counterPhase,
        phaseStartedAt: new Date(timestamp - (durationMs - requestedMs)).toISOString(),
        lastNotificationPhaseStartedAt: undefined,
        lastVoiceAlertPhaseStartedAt: undefined,
      },
    };
  };

  const publishSharedCountdown = async () => {
    if (creatorAccess !== "granted") {
      setToast("Solo la cuenta propietaria puede sincronizar el contador para todos");
      window.setTimeout(() => setToast(""), 3000);
      return;
    }
    const synchronized = buildCountdownSettings();
    if (!synchronized) return;
    const updatedAt = new Date(synchronized.timestamp).toISOString();
    const sharedSettings = { ...synchronized.settings, sharedTimingUpdatedAt: updatedAt };
    const catalog: Catalog = {
      ...state.catalog,
      catalogVersion: state.catalog.catalogVersion + 1,
      updatedAt,
      updatedBy: AUTHOR,
      eventTiming: {
        selectedVisionId: sharedSettings.selectedVisionId,
        waitMinutes: sharedSettings.waitMinutes,
        activeMinutes: sharedSettings.activeMinutes,
        transitionDelaySeconds: sharedSettings.transitionDelaySeconds,
        phaseStartedAt: sharedSettings.phaseStartedAt,
        phase: sharedSettings.phase,
        updatedAt,
        updatedBy: AUTHOR,
      },
    };
    try {
      setToast("Publicando contador para todos…");
      const message = await publishCatalog(catalog);
      commitState((current) => ({ ...current, catalog, settings: sharedSettings }));
      setNow(synchronized.timestamp);
      setToast(message);
    } catch (error) {
      setToast(error instanceof Error ? error.message : String(error));
    }
    window.setTimeout(() => setToast(""), 3600);
  };

  const toggleAutostart = async (enabled: boolean) => {
    if (!isTauri()) return;
    if (enabled) await enable();
    else await disable();
  };

  const openRepository = () => {
    if (isTauri()) void openUrl(REPOSITORY_URL);
    else window.open(REPOSITORY_URL, "_blank", "noopener,noreferrer");
  };

  const onImport = async (file?: File) => {
    if (!file) return;
    try {
      commitState(importState(await file.text()));
      setToast("Respaldo importado correctamente");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "No se pudo importar el respaldo.");
    } finally {
      if (importRef.current) importRef.current.value = "";
      window.setTimeout(() => setToast(""), 3000);
    }
  };

  return (
    <div className="app-shell">
      <AppUpdater />
      {introVisible && <StartupIntro onSkip={() => setIntroVisible(false)} />}
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><GameLogoMark /></div>
          <div><strong>Caja Fantasma</strong><span>Once Human</span></div>
        </div>

        <nav aria-label="Navegación principal">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={19} /><span>{label}</span>{tab === id && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className={syncStatus.startsWith("Sin") ? "offline" : "online"}>
            {syncStatus.startsWith("Sin") ? <WifiOff size={14} /> : <Wifi size={14} />}
            {syncStatus}
          </span>
          <button type="button" onClick={() => void syncCatalog()}><RefreshCw size={14} /> Sincronizar</button>
        </div>

        <button type="button" className="author-card" onClick={openRepository}>
          <Github size={21} />
          <span><small>Creado por</small><strong>{AUTHOR}</strong></span>
          <ExternalLink size={14} />
        </button>
      </aside>

      <main>
        <header className={`topbar vision-${selectedVision?.id ?? "none"} ${cycle.phase}`}>
          <VisionAtmosphere visionId={selectedVision?.id} active={cycle.phase === "active"} />
          <div className="topbar-copy">
            <span className="eyebrow">{tab === "progress" ? "SEGUIMIENTO ACTUAL" : tab === "characters" ? "PERFILES DE JUEGO" : tab === "vision" ? "RUEDA VISIONAL" : tab === "history" ? "REGISTRO PERSONAL" : tab === "shiny" ? "COLECCIÓN DE MÓDULOS" : tab === "changes" ? "NOVEDADES" : "PREFERENCIAS"}</span>
            <h1>{TABS.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className={`phase-chip ${cycle.phase} ${transition.active ? "transitioning" : ""}`}>
            <span className="pulse" />
            <div><small>{transition.active ? "Preparando próximo contador" : cycle.phase === "active" ? `${selectedVision?.name ?? "Visión"} activa` : "Próxima activación"}</small><strong>{formatDuration(overlayDisplayMs)}</strong></div>
          </div>
        </header>

        {tab === "progress" && (
          <section className="page progress-page">
            {state.characters.length > 1 && <article className="character-dashboard panel">
              <div className="character-dashboard-top">
                <div><span className="eyebrow"><Users size={15} /> PERSONAJES</span><h2>{isTeamMode ? "Registro compartido del equipo" : `Jugando con ${activeCharacter.name}`}</h2></div>
                <div className="tracking-mode-switch" aria-label="Modo de registro">
                  <button type="button" className={!isTeamMode ? "selected" : ""} onClick={() => setTrackingMode("solo")}><UserRound size={16} /> Solitario</button>
                  <button type="button" className={isTeamMode ? "selected team" : ""} onClick={() => setTrackingMode("team")}><Users size={16} /> Equipo</button>
                </div>
              </div>
              <div className="character-progress-list">
                {characterSummaries.map((summary) => {
                  const selected = isTeamMode ? state.teamMemberIds.includes(summary.character.id) : summary.character.id === activeCharacter.id;
                  return <button type="button" key={summary.character.id} className={selected ? "selected" : ""} onClick={() => isTeamMode ? toggleTeamMember(summary.character.id) : selectCharacter(summary.character.id)}>
                    <span className="character-avatar"><UserRound size={17} /></span>
                    <span className="character-progress-copy"><strong>{summary.character.name}</strong><small>{summary.points} puntos · {summary.chance.toFixed(1)}% estimado</small><span className="character-progress-track"><i style={{ width: `${Math.min(100, Math.round((summary.points / target) * 100))}%` }} /></span></span>
                    {isTeamMode && <span className={`team-member-check ${selected ? "selected" : ""}`}>{selected ? <Check size={14} /> : <Plus size={14} />}</span>}
                  </button>;
                })}
              </div>
              {isTeamMode && <div className={`team-guidance ${teamReady ? "ready" : "warning"}`}><Users size={17} /><span><strong>{state.teamMemberIds.length} personajes en este equipo.</strong>{teamReady ? " Cada recompensa se suma una vez a todos los seleccionados." : " Selecciona al menos dos para comenzar."}</span><button type="button" className="secondary compact" onClick={startNewTeamCount}><RotateCcw size={15} /> Nuevo conteo en 0</button></div>}
            </article>}

            <div className="hero-grid">
              <article className="progress-hero panel">
                <div className="hero-copy">
                  <span className="eyebrow"><Sparkles size={14} /> {isTeamMode ? "CONTEO DE EQUIPO" : `INTENTO · ${activeCharacter.name}`}</span>
                  <h2>{currentPoints}<small> / {target} puntos</small></h2>
                  <p>{isTeamMode ? `${currentClaims} ${currentClaims === 1 ? "recompensa compartida" : "recompensas compartidas"}. Se suman al intento individual de cada integrante.` : `${currentClaims} ${currentClaims === 1 ? "recompensa reclamada" : "recompensas reclamadas"}. La caja puede salir antes: regístrala cuando aparezca.`}</p>
                  <div className="progress-track" role="progressbar" aria-label="Progreso del intento" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(currentPoints, target)}>
                    <span style={{ width: `${targetProgress}%` }} />
                  </div>
                  <div className="hero-actions">
                    {!isTeamMode && <button type="button" className="primary" disabled={currentActions.length === 0} onClick={() => markBox("normal")}><Box size={19} /> ¡Salió la caja!</button>}
                    {!isTeamMode && <button type="button" className="secondary platform-mail-button" disabled={currentActions.length === 0} onClick={() => markBox("platform-mail")}><Mail size={18} /> Llegó por Plataformas</button>}
                    {isTeamMode && <button type="button" className="primary" onClick={startNewTeamCount}><Users size={18} /> Nuevo conteo de Equipo</button>}
                    <button type="button" className="secondary" disabled={currentActions.length === 0} onClick={undoLastAction}><Undo2 size={18} /> Deshacer último</button>
                    <button type="button" className={`secondary overlay-home-button ${state.settings.overlayEnabled ? "enabled" : ""}`} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))}><Eye size={18} /> {state.settings.overlayEnabled ? "Quitar ventana flotante" : "Agregar ventana flotante"}</button>
                  </div>
                </div>
                <div className="ghost-orbit" aria-hidden="true"><div className="orbital-ring" /><img className="ghost-crate-image" src={PHANTOM_CRATE_IMAGE} alt="" /><div className="once-human-wordmark"><span>ONCE</span><strong>HUMAN</strong></div><Sparkles className="spark-one" /><Sparkles className="spark-two" /></div>
              </article>

              <article className="chance-card panel">
                <span className="eyebrow"><BarChart3 size={14} /> ESTIMACIÓN OBSERVADA</span>
                <strong className="chance-value">{displayedChance.toFixed(1)}%</strong>
                <p>{isTeamMode ? "Promedio del porcentaje individual de los personajes seleccionados. Cada uno conserva su propio intento." : "Probabilidad acumulada estimada con la hoja base, valores manuales y las cajas de este personaje."}</p>
                <div className="mini-stats"><span><small>Promedio</small><strong>{stats.count ? stats.average.toFixed(1) : "—"}</strong></span><span><small>Muestras</small><strong>{stats.count}</strong></span></div>
              </article>
            </div>

            <article className={`home-overlay-controls panel ${homeOverlayConfigOpen ? "expanded" : ""}`}>
              <div><span className="eyebrow"><MonitorUp size={15} /> VENTANA FLOTANTE</span><h2>Tamaño rápido</h2><p>Abre los controles para ajustar por separado el contador y el espacio transparente de la Ballena.</p></div>
              <div className="home-overlay-actions">
                <button type="button" className="secondary" aria-expanded={homeOverlayConfigOpen} aria-controls="home-overlay-size-panel" onClick={() => setHomeOverlayConfigOpen((current) => !current)}><Settings2 size={17} /> {homeOverlayConfigOpen ? "Ocultar tamaños" : "Configurar tamaños"}</button>
                <button type="button" className={`secondary overlay-home-button ${state.settings.overlayEnabled ? "enabled" : ""}`} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))}><Eye size={18} /> {state.settings.overlayEnabled ? "Quitar ventana" : "Agregar ventana"}</button>
              </div>
              {homeOverlayConfigOpen && <div id="home-overlay-size-panel" className="home-overlay-size-panel">
                <label className="overlay-size-control"><span>Ventana <strong>{Math.round(state.settings.overlayScale * 100)}%</strong></span><input type="range" min={20} max={150} step={5} value={Math.round(state.settings.overlayScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayScale: clampNumber(Number(event.target.value) / 100, .2, 1.5) } }))} /></label>
                <label className="overlay-size-control"><span>Área de Ballena <strong>{Math.round(state.settings.overlayAddonScale * 100)}%</strong></span><input type="range" min={20} max={100} step={5} value={Math.round(state.settings.overlayAddonScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayAddonScale: clampNumber(Number(event.target.value) / 100, .2, 1) } }))} /></label>
              </div>}
            </article>

            <div className="section-heading"><div><span className="eyebrow">RECOMPENSAS PRO</span><h2>Suma lo que reclames</h2></div><span>Solo las recompensas completadas cuentan</span></div>
            <div className="activity-grid">
              {state.catalog.proActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} disabled={!teamReady} count={currentActions.filter((action) => !action.visionId && action.activityId === activity.id).length} onAdd={() => addActivity(activity)} onRemove={() => removeLastActivity(activity.id)} />
              ))}
            </div>

            <div className="section-heading"><div><span className="eyebrow">VISIÓN SELECCIONADA POR EL ADMINISTRADOR</span><h2>{selectedVision?.name ?? "Sin visión"}</h2></div><button type="button" className="link-button" onClick={() => setTab("vision")}>Ver contador <ChevronRight size={15} /></button></div>
            <div className="activity-grid">
              {selectedVision?.activities.length ? selectedVision.activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} disabled={!selectedVision.enabled || !teamReady} count={currentActions.filter((action) => action.visionId === selectedVision.id && action.activityId === activity.id).length} onAdd={() => addActivity(activity, selectedVision)} onRemove={() => removeLastActivity(activity.id, selectedVision.id)} />
              )) : <div className="empty-card"><Sparkles size={28} /><strong>Aún no hay recompensas para {selectedVision?.name}</strong><span>Puedes añadirlas en Configuración y publicarlas para todos.</span></div>}
            </div>

            {breakdown.length > 0 && <article className="attempt-log panel">
              <div className="panel-title"><div><span className="eyebrow">DESGLOSE</span><h3>{isTeamMode ? "Conteo actual del equipo" : `Intento de ${activeCharacter.name}`}</h3></div><button type="button" className="danger-quiet" onClick={resetAttempt}><RotateCcw size={16} /> {isTeamMode ? "Nuevo conteo" : "Reiniciar"}</button></div>
              {breakdown.map((item) => <div className="log-row" key={item.name}><span>{item.name}<small>{item.count}× reclamado</small></span><strong>{pointsLabel(item.points)}</strong></div>)}
            </article>}
          </section>
        )}

        {tab === "vision" && (
          <section className="page vision-page">
            <div className="vision-layout">
              <article className={`timer-panel panel ${cycle.phase}`}>
                <div className="timer-top"><span className="eyebrow"><Clock3 size={15} /> CICLO AUTOMÁTICO</span><span className="live-dot">{transition.active ? "TRANSICIÓN" : cycle.phase === "active" ? "EN CURSO" : "EN ESPERA"}</span></div>
                <h2>{transition.active ? "Preparando el próximo contador" : cycle.phase === "active" ? "La Rueda está activa" : "La Rueda comenzará en"}</h2>
                <strong className="timer-value">{formatDuration(overlayDisplayMs)}</strong>
                <div className="cycle-track"><span style={{ width: `${Math.round(cycle.progress * 100)}%` }} /></div>
                <p>{cycle.phase === "active" ? `Termina el ${formatDate(cycle.phaseEndsAt)}.` : `Comienza el ${formatDate(cycle.phaseEndsAt)}.`}</p>
                <div className="hero-actions">
                  <button type="button" className="primary" onClick={() => setCyclePhase(cycle.phase === "active" ? "waiting" : "active")}>
                    {cycle.phase === "active" ? <X size={18} /> : <Zap size={18} />}{cycle.phase === "active" ? "Terminar ahora" : "Activar ahora"}
                  </button>
                  <button type="button" className="secondary" onClick={() => setCyclePhase(cycle.phase)}><RotateCcw size={17} /> Reiniciar contador</button>
                </div>
              </article>

              <article className="overlay-preview panel">
                <div className="panel-title"><div><span className="eyebrow">VENTANA FLOTANTE</span><h3>Siempre visible</h3></div><button type="button" className={`switch ${state.settings.overlayEnabled ? "on" : ""}`} aria-pressed={state.settings.overlayEnabled} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))}><span /></button></div>
                <div className={`mock-overlay ${cycle.phase} vision-${selectedVision?.id ?? "none"} shape-${state.settings.overlayShape} counter-${state.settings.overlayCounterStyle}`}><span>{transition.active ? "Preparando próximo contador" : cycle.phase === "active" ? `${overlayDisplayName} activa` : `Próxima ${overlayDisplayName}`}</span><strong>{overlayDisplayTimer}</strong></div>
                <div className="overlay-style-config">
                  <label>Forma<select value={state.settings.overlayShape} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayShape: event.target.value as OverlayShape } }))}><option value="event">Automática por evento</option><option value="rectangle">Rectangular</option><option value="square">Cuadrada</option><option value="vertical">Vertical</option><option value="round">Redonda</option></select></label>
                  <label>Estilo del contador<select value={state.settings.overlayCounterStyle} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayCounterStyle: event.target.value as OverlayCounterStyle } }))}><option value="digital">Digital</option><option value="compact">Compacto</option><option value="ring">Anillo de progreso</option></select></label>
                  <label>Nombre del evento<select value={state.settings.overlayNameMode} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayNameMode: event.target.value as OverlayNameMode } }))}><option value="spanish">Español</option><option value="english">Inglés</option><option value="custom">Personalizado</option></select></label>
                  {state.settings.overlayNameMode === "custom" && <label>Tu nombre<input maxLength={40} value={state.settings.overlayCustomName} placeholder="Ej. Gravedad azul" onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayCustomName: event.target.value.slice(0, 40) } }))} /></label>}
                </div>
                <label className="overlay-size-control"><span>Tamaño de ventana <strong>{Math.round(state.settings.overlayScale * 100)}%</strong></span><input type="range" min={20} max={150} step={5} value={Math.round(state.settings.overlayScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayScale: clampNumber(Number(event.target.value) / 100, .2, 1.5) } }))} /></label>
                <label className="overlay-size-control"><span>Área de Ballena <strong>{Math.round(state.settings.overlayAddonScale * 100)}%</strong></span><input type="range" min={20} max={100} step={5} value={Math.round(state.settings.overlayAddonScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayAddonScale: clampNumber(Number(event.target.value) / 100, .2, 1) } }))} /></label>
                <p>Arrástrala a cualquier zona de la pantalla. El tamaño del contador y el espacio transparente de la Ballena se configuran por separado.</p>
              </article>
            </div>

            <article className="counter-editor panel">
              <div className="panel-title">
                <div><span className="eyebrow"><Clock3 size={15} /> AJUSTE DIRECTO</span><h2>Modificar el contador</h2></div>
                <button type="button" className="secondary compact" onClick={loadCurrentCountdown}><RefreshCw size={15} /> Copiar tiempo actual</button>
              </div>
              <p>Corrige el contador con el tiempo exacto que muestra el juego. El ciclo seguirá alternando automáticamente desde ese punto.</p>
              <div className="counter-editor-controls">
                <div className="counter-phase-buttons" aria-label="Fase que se está contando">
                  <button type="button" className={counterPhase === "waiting" ? "selected" : ""} aria-pressed={counterPhase === "waiting"} onClick={() => setCounterPhase("waiting")}>Falta para empezar</button>
                  <button type="button" className={counterPhase === "active" ? "selected active" : ""} aria-pressed={counterPhase === "active"} onClick={() => setCounterPhase("active")}>Falta para terminar</button>
                </div>
                <div className="counter-time-fields">
                  <label>Minutos<input type="number" min={0} max={counterPhase === "active" ? state.settings.activeMinutes : state.settings.waitMinutes} value={counterMinutes} onChange={(event) => setCounterMinutes(event.target.value)} /></label>
                  <span>:</span>
                  <label>Segundos<input type="number" min={0} max={59} value={counterSeconds} onChange={(event) => setCounterSeconds(event.target.value)} /></label>
                </div>
                <button type="button" className="primary" onClick={synchronizeCountdown}><Save size={17} /> Aplicar en este PC</button>
                <button type="button" className="secondary shared-counter-button" disabled={creatorAccess !== "granted"} onClick={() => void publishSharedCountdown()}><Upload size={17} /> Sincronizar con todos</button>
              </div>
              <small className="counter-anchor-note">Sincronización inicial: Gravedad terminó a las 4:52:30 p. m. de Colombia el 10 de septiembre de 2026.</small>
            </article>

            <article className="public-vision-card panel">
              <span className="vision-icon">{selectedVision?.id === "gravity" ? <Zap /> : selectedVision?.id === "lunar" ? <Sparkles /> : <ActivityIcon />}</span>
              <div><span className="eyebrow">RUEDA PÚBLICA</span><h2>{selectedVision?.name ?? "Sin rueda activa"}</h2><p>{selectedVision?.description}</p><small>La selecciona OscarD0823 y se sincroniza automáticamente en todos los equipos.</small></div>
              <UserCheck size={22} />
            </article>
          </section>
        )}

        {tab === "characters" && (
          <section className="page characters-page">
            <article className="character-manager panel">
              <div className="panel-title"><div><span className="eyebrow"><Users size={15} /> PERSONAJES</span><h2>Perfiles de juego</h2></div><span className="character-limit">{state.characters.length} / 12</span></div>
              <p>La aplicación siempre abre en Solitario. Cada personaje conserva sus puntos, porcentaje e historial; en Equipo, una recompensa se suma a todos los integrantes seleccionados.</p>
              <form className="character-add" onSubmit={(event) => { event.preventDefault(); addCharacter(); }}>
                <label>Nuevo personaje<input value={newCharacterName} maxLength={40} placeholder="Nombre dentro del juego" onChange={(event) => setNewCharacterName(event.target.value)} /></label>
                <button type="submit" className="primary" disabled={state.characters.length >= 12}><UserPlus size={17} /> Agregar personaje</button>
              </form>
              <div className="character-manager-list">
                {state.characters.map((character, index) => {
                  const summary = characterSummaries.find((item) => item.character.id === character.id);
                  return <div className="character-manager-row" key={character.id}>
                    <span className="character-avatar"><UserRound size={18} /></span>
                    <label>Nombre<input defaultValue={character.name} maxLength={40} onBlur={(event) => renameCharacter(character.id, event.target.value.trim() || character.name)} /></label>
                    <span className="character-manager-stats"><strong>{summary?.points ?? 0} puntos</strong><small>{(summary?.chance ?? 0).toFixed(1)}% estimado</small></span>
                    {index === 0 && <span className="main-character-badge">PRINCIPAL</span>}
                    <button type="button" className="character-delete" disabled={state.characters.length <= 1} aria-label={`Eliminar ${character.name}`} onClick={() => removeCharacter(character.id)}><Trash2 size={16} /></button>
                  </div>;
                })}
              </div>
            </article>

            {state.characters.length > 1 && <article className="character-dashboard panel">
              <div className="character-dashboard-top"><div><span className="eyebrow"><Users size={15} /> REGISTRO ACTUAL</span><h2>{isTeamMode ? "Equipo" : `Solitario · ${activeCharacter.name}`}</h2></div><div className="tracking-mode-switch"><button type="button" className={!isTeamMode ? "selected" : ""} onClick={() => setTrackingMode("solo")}><UserRound size={16} /> Solitario</button><button type="button" className={isTeamMode ? "selected team" : ""} onClick={() => setTrackingMode("team")}><Users size={16} /> Equipo</button></div></div>
              <div className="character-progress-list">{characterSummaries.map((summary) => { const selected = isTeamMode ? state.teamMemberIds.includes(summary.character.id) : summary.character.id === activeCharacter.id; return <button type="button" key={summary.character.id} className={selected ? "selected" : ""} onClick={() => isTeamMode ? toggleTeamMember(summary.character.id) : selectCharacter(summary.character.id)}><span className="character-avatar"><UserRound size={17} /></span><span className="character-progress-copy"><strong>{summary.character.name}</strong><small>{summary.points} puntos · {summary.chance.toFixed(1)}% estimado</small><span className="character-progress-track"><i style={{ width: `${Math.min(100, Math.round((summary.points / target) * 100))}%` }} /></span></span>{isTeamMode && <span className={`team-member-check ${selected ? "selected" : ""}`}>{selected ? <Check size={14} /> : <Plus size={14} />}</span>}</button>; })}</div>
              {isTeamMode && <div className={`team-guidance ${teamReady ? "ready" : "warning"}`}><Users size={17} /><span><strong>{state.teamMemberIds.length} personajes seleccionados.</strong>{teamReady ? " Cada recompensa se suma a todos." : " Elige al menos dos."}</span><button type="button" className="secondary compact" onClick={startNewTeamCount}><RotateCcw size={15} /> Nuevo conteo en 0</button></div>}
            </article>}
          </section>
        )}

        {tab === "history" && (
          <section className="page history-page">
            <div className="stats-grid">
              <StatCard icon={Box} label={`Muestras · ${activeCharacter.name}`} value={String(stats.count)} />
              <StatCard icon={Minus} label="Más baja" value={stats.count ? pointsLabel(stats.minimum) : "—"} />
              <StatCard icon={MonitorUp} label="Más alta" value={stats.count ? pointsLabel(stats.maximum) : "—"} />
              <StatCard icon={BarChart3} label="Promedio" value={stats.count ? pointsLabel(Number(stats.average.toFixed(1))) : "—"} />
            </div>
            <article className="probability-explainer panel">
              <div><span className="eyebrow">PROBABILIDAD OBSERVADA</span><strong>{stats.perPointPercent.toFixed(3)}%</strong><p>Una caja por cada {stats.perPointPercent ? (100 / stats.perPointPercent).toFixed(1) : "—"} puntos, usando la hoja base, el historial manual aproximado y tus cajas confirmadas. No es una tasa oficial del juego.</p></div>
              <div className="probability-ring" style={{ "--value": `${Math.min(100, stats.currentChancePercent) * 3.6}deg` } as React.CSSProperties}><span>{stats.currentChancePercent.toFixed(0)}%</span></div>
            </article>

            <article className="baseline-panel panel">
              <div><span className="eyebrow">BASE DE ESTIMACIÓN</span><h2>{baselineStats.count} salidas de referencia</h2><p>La columna A aporta 16 valores: 1209, 762, 966, 1143, 320, 797, 1180, 909, 1028, 1098, 408, 889, 1447, 1211, 1333 y 588. Has añadido {state.manualBaselinePoints.length} aproximados.</p></div>
              <div className="baseline-ranges"><span><small>Zona baja</small><strong>{baselineStats.lowerAverage.toFixed(3)}</strong></span><span><small>Centro</small><strong>{baselineStats.average.toFixed(1)}</strong></span><span><small>Zona alta</small><strong>{baselineStats.upperAverage.toFixed(3)}</strong></span></div>
              <p className="baseline-note">La hoja mostraba 935,0769 como promedio, pero 15.288 ÷ 16 da 955,5. Los valores manuales amplían la referencia y las cajas registradas se suman como muestras confirmadas.</p>
            </article>

            <article className="manual-history-panel panel">
              <div className="panel-title"><div><span className="eyebrow"><Plus size={15} /> HISTORIAL APROXIMADO</span><h2>Cargar valores manualmente</h2></div>{state.manualBaselinePoints.length > 0 && <button type="button" className="danger-quiet compact" onClick={() => commitState((current) => ({ ...current, manualBaselinePoints: [] }))}><Trash2 size={15} /> Borrar manuales</button>}</div>
              <p>Pega puntos separados por espacios, comas o líneas. Se usarán solo como referencia estadística; no aparecerán como cajas confirmadas ni tendrán fecha inventada.</p>
              <div className="manual-history-entry">
                <textarea value={manualHistoryText} onChange={(event) => setManualHistoryText(event.target.value)} placeholder={"Ejemplo:\n762, 966, 1143, 909"} aria-label="Valores históricos aproximados" />
                <button type="button" className="primary" onClick={addManualHistory}><Plus size={17} /> Agregar a la estimación</button>
              </div>
              {state.manualBaselinePoints.length > 0 && <div className="manual-values" aria-label="Valores aproximados guardados">{state.manualBaselinePoints.map((value, index) => <button type="button" key={`${value}-${index}`} title="Quitar este valor" onClick={() => commitState((current) => ({ ...current, manualBaselinePoints: current.manualBaselinePoints.filter((_, itemIndex) => itemIndex !== index) }))}><span>{value}</span><X size={12} /></button>)}</div>}
              <small>{state.manualBaselinePoints.length} de 500 valores manuales guardados en este equipo.</small>
            </article>

            <div className="panel-title history-title"><div><span className="eyebrow">CAJAS SACADAS</span><h2>Historial con fecha y hora</h2></div><button type="button" className="secondary compact" onClick={() => exportState(state)}><Download size={16} /> Exportar</button></div>
            {state.boxes.length === 0 ? <div className="empty-card history-empty"><History size={32} /><strong>Todavía no hay cajas registradas</strong><span>Cuando pulses “¡Salió la caja!”, aparecerá aquí con todos los datos del intento.</span></div> : (
              <div className="history-list">
                {state.boxes.map((box, index) => (
                  <article className="history-record panel" key={box.id}>
                    <div className="record-number">#{state.boxes.length - index}</div>
                    <div className="record-main"><span>{box.characterName ?? state.characters.find((character) => character.id === (box.characterId ?? DEFAULT_CHARACTER_ID))?.name ?? "Personaje principal"} · {formatDate(box.occurredAt)}</span><strong>{pointsLabel(box.points)}</strong><small>{box.claims} recompensas reclamadas{box.source === "platform-mail" ? ` · correo de Plataformas · ${box.carriedPoints ?? 0} pts transferidos` : ""}</small></div>
                    <details><summary>Ver desglose</summary>{box.breakdown.map((item) => <div key={item.name}><span>{item.name} · {item.count}×</span><strong>{item.points}</strong></div>)}</details>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "shiny" && (!shinyCatalogModule || !selectedShinyMod ? (
          <section className="page shiny-page"><div className="empty-card shiny-catalog-loading"><RefreshCw size={28} /><strong>{shinyCatalogError || "Cargando los 1.825 módulos…"}</strong><span>El catálogo se abre solo al entrar aquí para que el inicio use menos memoria.</span>{shinyCatalogError && <button type="button" className="secondary compact" onClick={() => { setShinyCatalogError(""); setShinyCatalogAttempt((current) => current + 1); }}>Reintentar</button>}</div></section>
        ) : (
          <section className="page shiny-page">
            <div className="stats-grid shiny-stats">
              <StatCard icon={Search} label="Buscando convertir" value={String(allActiveShinyGoals.length)} />
              <StatCard icon={Gem} label="Brillantes conseguidos" value={String(allObtainedShinyMods.length)} />
              <StatCard icon={RotateCcw} label="Duplicados +17 fallidos" value={String(totalShinyAttempts)} />
              <StatCard icon={Trophy} label="Colección del catálogo" value={`${shinyCollectionPercent.toFixed(1)}%`} />
            </div>

            <article className="shiny-rule panel">
              <div className="shiny-rule-icon"><Gem /></div>
              <div><span className="eyebrow">CÓMO FUNCIONA</span><h2>Del nivel 0 al 17, después Brillante</h2><p>Todos los módulos progresan del nivel 0 al 17. Cuando ya tienes uno en nivel 17, otro igual puede convertirse en Brillante. Pulsa “Otro +17 no se convirtió” después de cada fallo; cuando salga, márcalo como conseguido.</p></div>
            </article>

            <article className="shiny-catalog-panel panel">
              <div className="panel-title"><div><span className="eyebrow"><Search size={15} /> CATÁLOGO DE MÓDULOS</span><h2>Buscar y agregar un objetivo exacto</h2></div><span className="catalog-count">{SHINY_MOD_CATALOG.length.toLocaleString("es-CO")} registros</span></div>
              <div className="shiny-search-controls">
                <label className="shiny-search-field">Buscar nombre, variante, estilo o ID<div><Search size={16} /><input value={shinySearch} onChange={(event) => setShinySearch(event.target.value)} placeholder="Ejemplo: Hora punta, Downstar o 19500542" /></div></label>
                <label>Estilo o pieza<select value={shinyGroupFilter} onChange={(event) => setShinyGroupFilter(event.target.value)}><option value="all">Todas las armas y armaduras</option><optgroup label="ARMAS">{SHINY_MOD_GROUPS.filter((entry) => entry.category === "weapon").map((entry) => <option key={entry.id} value={entry.id}>{entry.name.replace("Arma · ", "")} ({entry.count})</option>)}</optgroup><optgroup label="ARMADURA">{SHINY_MOD_GROUPS.filter((entry) => entry.category === "armor").map((entry) => <option key={entry.id} value={entry.id}>{entry.name.replace("Armadura · ", "")} ({entry.count})</option>)}</optgroup></select></label>
                <label>Nivel y sistema<select value={shinySystemFilter} onChange={(event) => setShinySystemFilter(event.target.value)}><option value="all">Todos ({SHINY_MOD_CATALOG_META.total.toLocaleString("es-CO")})</option><option value="legacy">Nivel 0–17 · anterior ({SHINY_MOD_CATALOG_META.legacy})</option><option value="normal">Nivel 0–17 · sistema 2.0 ({SHINY_MOD_CATALOG_META.normal})</option><option value="shiny">Brillante ({SHINY_MOD_CATALOG_META.shiny})</option></select></label>
              </div>
              <div className="shiny-result-summary"><span>{filteredShinyCatalog.length.toLocaleString("es-CO")} coincidencias en {groupedVisibleShinyCatalog.length} grupos</span>{filteredShinyCatalog.length > visibleShinyCatalogCount && <small>Se muestran {visibleShinyCatalogCount}. Elige una pieza, estilo o escribe una búsqueda para ver más.</small>}</div>
              <div className="shiny-catalog-results">
                {groupedVisibleShinyCatalog.map((group) => <section className="shiny-result-group" key={group.id}><header><strong>{group.name}</strong><small>{group.items.length} mostrados de {filteredShinyCatalog.filter((item) => item.groupId === group.id).length}</small></header><div className="shiny-result-group-grid">{group.items.map((item) => <button type="button" key={item.id} className={selectedShinyMod.id === item.id ? "selected" : ""} onClick={() => chooseShinyMod(item)}><span>{catalogStatusLabel(item)}</span><strong>{item.name}</strong><small>{catalogOriginLabel(item)} · ID {item.itemId}</small>{selectedShinyMod.id === item.id && <Check size={16} />}</button>)}</div></section>)}
                {filteredShinyCatalog.length === 0 && <div className="shiny-no-results"><Search size={23} /><span>No aparece en el catálogo. Puedes agregar el nombre escrito como personalizado.</span></div>}
              </div>
              <div className="shiny-selection">
                <div><span>MÓDULO SELECCIONADO</span><strong>{selectedShinyMod.name}</strong><small>{selectedShinyMod.groupName} · {catalogOriginLabel(selectedShinyMod)} · ID {selectedShinyMod.itemId}</small></div>
                <div className={`shiny-selected-variant ${selectedShinyMod.isCatalogShiny ? "bright" : ""}`}><span>{catalogStatusLabel(selectedShinyMod)}</span><strong>{selectedShinyMod.variant}</strong><small>{selectedShinyMod.englishName}</small></div>
                <button type="button" className="primary" onClick={() => addShinyTracker()}><Plus size={17} /> Empezar en 0</button>
                <button type="button" className="secondary" disabled={!shinySearch.trim()} onClick={() => addShinyTracker(shinySearch)}><Plus size={17} /> Agregar nombre escrito</button>
              </div>
              <p className="catalog-source-note">Los {SHINY_MOD_CATALOG_META.total.toLocaleString("es-CO")} registros están ordenados por tipo de arma o pieza de armadura. Todos progresan de nivel 0 a 17; los {SHINY_MOD_CATALOG_META.shiny} registros especiales representan el estado Brillante.</p>
            </article>

            <label className="shiny-search-field shiny-record-search">Buscar en mi registro<div><Search size={16} /><input value={shinyRecordSearch} onChange={(event) => setShinyRecordSearch(event.target.value)} placeholder="Buscar entre objetivos e historial Brillante" /></div></label>

            <div className="section-heading shiny-heading"><div><span className="eyebrow">EN PROCESO</span><h2>Intentos de conversión</h2></div><span>{activeShinyGoals.length}{normalizedRecordSearch ? ` de ${allActiveShinyGoals.length}` : ""} activos</span></div>
            {activeShinyGoals.length === 0 ? <div className="empty-card shiny-empty"><Gem size={30} /><strong>{normalizedRecordSearch ? "No hay coincidencias en los objetivos" : "No estás siguiendo ningún módulo"}</strong><span>{normalizedRecordSearch ? "Prueba con otro nombre, variante o estilo." : "Busca uno arriba, elige el registro exacto y pulsa “Empezar en 0”."}</span></div> : <div className="shiny-tracker-grid">{activeShinyGoals.map((record) => <ShinyTrackerCard key={record.id} record={record} onDecrease={() => adjustShinyAttempts(record.id, -1)} onIncrease={() => adjustShinyAttempts(record.id, 1)} onToggle={() => setShinyObtained(record.id, true)} onDelete={() => commitState((current) => ({ ...current, shinyMods: current.shinyMods.filter((item) => item.id !== record.id) }))} />)}</div>}

            <div className="section-heading shiny-heading"><div><span className="eyebrow">COLECCIÓN BRILLANTE</span><h2>Módulos conseguidos</h2></div><span>{obtainedShinyMods.length}{normalizedRecordSearch ? ` de ${allObtainedShinyMods.length}` : ""} marcados</span></div>
            {obtainedShinyMods.length === 0 ? <div className="empty-card shiny-empty obtained"><Trophy size={30} /><strong>{normalizedRecordSearch ? "No hay coincidencias en los conseguidos" : "Aún no has marcado ningún Brillante"}</strong><span>{normalizedRecordSearch ? "La búsqueda también revisa nombre, variante y estilo." : "También puedes agregar un módulo y marcarlo directamente si ya lo tenías."}</span></div> : <div className="shiny-tracker-grid">{obtainedShinyMods.map((record) => <ShinyTrackerCard key={record.id} record={record} onDecrease={() => adjustShinyAttempts(record.id, -1)} onIncrease={() => adjustShinyAttempts(record.id, 1)} onToggle={() => setShinyObtained(record.id, false)} onDelete={() => commitState((current) => ({ ...current, shinyMods: current.shinyMods.filter((item) => item.id !== record.id) }))} />)}</div>}
          </section>
        ))}

        {tab === "changes" && creatorAccess === "granted" && (
          <section className="page changes-page">
            <article className="release-hero panel"><div><span className="eyebrow"><ShieldCheck size={15} /> VERSIÓN INSTALADA</span><h2>Versión {APP_VERSION}</h2><p>Las actualizaciones se comprueban al abrir y llegan firmadas desde GitHub Releases.</p></div><button type="button" className="secondary" onClick={openRepository}><Github size={18} /> Ver repositorio</button></article>
            <div className="timeline">
              {CHANGELOG.map((release) => <article key={release.version} className="release-entry"><span className="timeline-dot" /><div className="panel"><div className="release-heading"><div><span>v{release.version}</span><h3>{release.title}</h3></div><time>{release.date}</time></div><ul>{release.items.map((item) => <li key={item}>{item}</li>)}</ul></div></article>)}
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="page settings-page">
            <div className="settings-grid">
              <article className="settings-card panel">
                <div className="settings-icon"><Clock3 /></div><div><h3>Duración del ciclo</h3><p>Define cuánto espera la rueda, cuánto permanece activa y el retraso visual antes de mostrar el próximo conteo.</p><div className="field-row"><label>Espera (minutos)<input type="number" min={1} max={525600} value={state.settings.waitMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, waitMinutes: clampNumber(Number(event.target.value), 1, 525600), phaseStartedAt: new Date().toISOString() } }))} /></label><label>Activa (minutos)<input type="number" min={1} max={525600} value={state.settings.activeMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, activeMinutes: clampNumber(Number(event.target.value), 1, 525600), phaseStartedAt: new Date().toISOString() } }))} /></label><label>Retraso visual (segundos)<input type="number" min={0} max={300} value={state.settings.transitionDelaySeconds} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, transitionDelaySeconds: clampNumber(Math.round(Number(event.target.value)), 0, 300) } }))} /></label></div><small>Este retraso no cambia la hora real del siguiente evento.</small></div>
              </article>
              <article className="settings-card panel setting-disabled"><div className="settings-icon"><Bell /></div><div><h3>Notificaciones de escritorio</h3><p>Desactivadas en esta versión. Gravedad puede seguir avisando mediante voz.</p><span className="disabled-setting-badge">DESACTIVADAS</span></div></article>
              <article className="settings-card voice-settings panel">
                <div className="settings-icon"><Volume2 /></div><div><h3>Aviso por voz · Gravedad</h3><p>Habla antes de que empiece el evento aunque la aplicación esté minimizada.</p><div className="voice-controls"><label>Anticipación (minutos)<input type="number" min={1} max={60} value={state.settings.voiceLeadMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, voiceLeadMinutes: clampNumber(Number(event.target.value), 1, 60), lastVoiceAlertPhaseStartedAt: undefined } }))} /></label><button type="button" className="secondary compact" onClick={() => { speakMessage("Prueba de voz. El aviso de Gravedad está funcionando."); setToast("Prueba de voz reproducida"); window.setTimeout(() => setToast(""), 1800); }}><Volume2 size={15} /> Probar voz</button></div></div><button type="button" className={`switch ${state.settings.voiceNotificationsEnabled ? "on" : ""}`} aria-pressed={state.settings.voiceNotificationsEnabled} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, voiceNotificationsEnabled: !current.settings.voiceNotificationsEnabled } }))}><span /></button>
              </article>
              <SettingToggle icon={MonitorUp} title="Iniciar con Windows" description="Arranca en segundo plano; la ventana principal no interrumpe al encender el PC." enabled={state.settings.autoStartEnabled} onToggle={(enabled) => { commitState((current) => ({ ...current, settings: { ...current.settings, autoStartEnabled: enabled } })); void toggleAutostart(enabled); }} />
              <SettingToggle icon={Eye} title="Ventana flotante" description="Contador pequeño, movible y siempre encima del juego." enabled={state.settings.overlayEnabled} onToggle={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))} />
            </div>

            <article className="backup-panel panel"><div><span className="eyebrow">DATOS PERSONALES</span><h2>Respaldo local</h2><p>El historial permanece en este equipo y no se sube al repositorio público.</p></div><div><button type="button" className="secondary" onClick={() => exportState(state)}><Download size={17} /> Exportar</button><button type="button" className="secondary" onClick={() => importRef.current?.click()}><Upload size={17} /> Importar</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void onImport(event.target.files?.[0])} /></div></article>

            <article className="owner-panel panel">
              <div className="panel-title"><div><span className="eyebrow">{creatorAccess === "granted" ? "MODO DESARROLLADOR" : "CUENTA PROPIETARIA"}</span><h2>{creatorAccess === "granted" ? "Editor de OscarD0823" : "Acceso privado"}</h2></div><span className={`creator-access-badge ${creatorAccess}`}>{creatorAccess === "granted" ? <UserCheck size={15} /> : <LockKeyhole size={15} />}{creatorAccess === "granted" ? "Propietario verificado" : creatorAccess === "checking" ? "Comprobando" : "Bloqueado"}</span></div>
              {creatorAccess === "granted" ? <><p>Las herramientas privadas y el historial de cambios solo aparecen al propietario verificado. Publicar sigue siendo una acción separada; esta compilación permanece local.</p><OverlayPreviewLab catalog={state.catalog} scale={state.settings.overlayScale} addonScale={state.settings.overlayAddonScale} shape={state.settings.overlayShape} counterStyle={state.settings.overlayCounterStyle} nameMode={state.settings.overlayNameMode} customName={state.settings.overlayCustomName} onScaleChange={(scale) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayScale: clampNumber(scale, .2, 1.5) } }))} onAddonScaleChange={(scale) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayAddonScale: clampNumber(scale, .2, 1) } }))} onAppearanceChange={(patch) => commitState((current) => ({ ...current, settings: { ...current.settings, ...(patch.shape ? { overlayShape: patch.shape } : {}), ...(patch.counterStyle ? { overlayCounterStyle: patch.counterStyle } : {}), ...(patch.nameMode ? { overlayNameMode: patch.nameMode } : {}), ...(patch.customName !== undefined ? { overlayCustomName: patch.customName.slice(0, 40) } : {}) } }))} onOpenRealOverlay={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: true } }))} /><CatalogEditor catalog={state.catalog} onSave={saveCatalog} onPublish={publishCatalog} /></> : <div className="creator-login-card"><div className="creator-lock"><LockKeyhole size={25} /></div><div><strong>Acceso privado del propietario</strong><span>{creatorMessage}</span><div className="creator-login-actions"><button type="button" className="primary compact" onClick={() => void startCreatorLogin()}><LogIn size={15} /> Iniciar sesión con GitHub</button><button type="button" className="secondary compact" disabled={creatorAccess === "checking"} onClick={() => void checkCreatorAccess()}><RefreshCw size={15} /> Comprobar cuenta</button></div></div></div>}
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

function ShinyTrackerCard({ record, onDecrease, onIncrease, onToggle, onDelete }: { record: ShinyModRecord; onDecrease: () => void; onIncrease: () => void; onToggle: () => void; onDelete: () => void }) {
  return <article className={`shiny-tracker-card panel ${record.isShiny ? "obtained" : ""}`}>
    <div className="shiny-tracker-top">
      <span className="shiny-mod-icon">{record.isShiny ? <Trophy size={20} /> : <Gem size={20} />}</span>
      <div><small>{record.groupName}</small><h3>{record.modName}</h3>{record.englishName && <em>{record.englishName}</em>}</div>
      <button type="button" className="shiny-delete" aria-label={`Eliminar ${record.modName}`} onClick={onDelete}><Trash2 size={15} /></button>
    </div>
    <div className="shiny-variant"><span>VARIANTE</span><strong>{record.variant}</strong></div>
    <div className="shiny-attempt-count"><span>Duplicados +17 que no se convirtieron</span><strong>{record.attempts}</strong></div>
    {!record.isShiny && <div className="shiny-attempt-actions"><button type="button" aria-label="Restar un intento" disabled={record.attempts === 0} onClick={onDecrease}><Minus size={17} /></button><button type="button" className="primary" onClick={onIncrease}><Plus size={17} /> Otro +17 no se convirtió</button></div>}
    <button type="button" className={`shiny-obtained-button ${record.isShiny ? "active" : ""}`} onClick={onToggle}>{record.isShiny ? <><Check size={17} /> Brillante conseguido · {record.obtainedAt ? formatDate(record.obtainedAt) : "sin fecha"}</> : <><Sparkles size={17} /> Marcar como Brillante</>}</button>
  </article>;
}

function StartupIntro({ onSkip }: { onSkip: () => void }) {
  return <button type="button" className="startup-intro" onClick={onSkip} aria-label="Omitir animación de apertura">
    <span className="intro-world" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
    <span className="intro-scan" aria-hidden="true" />
    <span className="intro-aura" aria-hidden="true"><i /><i /></span>
    <span className="intro-crate-arrival" aria-hidden="true">
      <span className="intro-crate">
        <img className="intro-crate-image" src={PHANTOM_CRATE_IMAGE} alt="" />
        <span className="intro-corner-slot" />
        <span className="intro-lock-ring" />
        <span className="intro-key-logo"><GameLogoMark /></span>
        <span className="intro-light" />
        <span className="intro-sparks"><i /><i /><i /><i /><i /><i /></span>
      </span>
    </span>
    <span className="intro-title"><strong>CAJA FANTASMA</strong><small>ONCE HUMAN</small></span>
    <span className="intro-progress" aria-hidden="true"><i /></span>
    <span className="intro-hint">Pulsa para continuar</span>
  </button>;
}

function VisionAtmosphere({ visionId, active }: { visionId?: string; active: boolean }) {
  return <div className="vision-atmosphere" aria-hidden="true">
    <span className="vision-moon" />
    {visionId === "lunar" && active && <img className="lunar-scene-image" src={LUNAR_EVENT_IMAGE} alt="" />}
    {visionId === "symbiosis" && active && <img className="symbiosis-scene-image" src={SYMBIOSIS_EVENT_IMAGE} alt="" />}
    {visionId === "gravity" && active && <span className="gravity-scenes"><img className="gravity-scene-image scene-a" src={GRAVITY_EVENT_IMAGE_A} alt="" /><img className="gravity-scene-image scene-b" src={GRAVITY_EVENT_IMAGE_B} alt="" /></span>}
    {visionId === "gravity" && active && <span className="gravity-floaters"><i /><i /><i /><i /></span>}
  </div>;
}

function ActivityCard({ activity, count, disabled = false, onAdd, onRemove }: { activity: Activity; count: number; disabled?: boolean; onAdd: () => void; onRemove: () => void }) {
  const inactive = disabled || !activity.enabled || activity.points <= 0;
  return (
    <article className={`activity-card ${inactive ? "disabled" : ""}`}>
      <div className="activity-points"><strong>{activity.points}</strong><small>PTS</small></div>
      <div className="activity-copy"><strong>{activity.name}</strong><span>{activity.note ?? "Recompensa reclamada"}</span></div>
      <div className="activity-counter">
        {count > 0 && <button type="button" aria-label={`Quitar una de ${activity.name}`} onClick={onRemove}><Minus size={15} /></button>}
        {count > 0 && <span>{count}</span>}
        <button type="button" aria-label={`Sumar ${activity.name}`} disabled={inactive} onClick={onAdd}><Plus size={19} /></button>
      </div>
    </article>
  );
}

function GameLogoMark() {
  return <svg viewBox="0 0 48 48" role="img" aria-label="Logo de Once Human"><path d="M13 11h9l5 6-5 6h-9l-5-6 5-6Zm13 14h9l5 6-5 6h-9l-5-6 5-6Z" /><path d="m19 25 10-10M18 31l12-12" /></svg>;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Box; label: string; value: string }) {
  return <article className="stat-card panel"><Icon size={21} /><span><small>{label}</small><strong>{value}</strong></span></article>;
}

function SettingToggle({ icon: Icon, title, description, enabled, onToggle }: { icon: typeof Box; title: string; description: string; enabled: boolean; onToggle: (enabled: boolean) => void }) {
  const [actual, setActual] = useState(enabled);
  useEffect(() => setActual(enabled), [enabled]);
  return <article className="settings-card panel"><div className="settings-icon"><Icon /></div><div><h3>{title}</h3><p>{description}</p></div><button type="button" className={`switch ${actual ? "on" : ""}`} aria-pressed={actual} onClick={() => { const next = !actual; setActual(next); onToggle(next); }}><span /></button></article>;
}
