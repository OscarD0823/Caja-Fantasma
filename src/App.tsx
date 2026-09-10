import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
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
  Volume2,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import CatalogEditor from "./CatalogEditor";
import AppUpdater from "./Updater";
import { PHANTOM_CRATE_IMAGE } from "./assets";
import type { Activity, Catalog, PersistedState, PointAction, ShinyModRecord, Vision } from "./model";
import {
  APP_VERSION,
  AUTHOR,
  BASELINE_BOX_POINTS,
  REMOTE_CATALOG_URL,
  REPOSITORY_URL,
  boxStatistics,
  buildBreakdown,
  clampNumber,
  computeCycle,
  createId,
  formatDuration,
  parseManualBaseline,
  splitPlatformCarryover,
  validateCatalog,
} from "./model";
import { exportState, importState, loadState, saveState } from "./storage";
import { SHINY_MOD_CATALOG, SHINY_MOD_GROUPS, normalizeModSearch, type ShinyModCatalogItem } from "./shinyModsCatalog";

type TabId = "progress" | "vision" | "history" | "shiny" | "changes" | "settings";
type CreatorAccess = "checking" | "locked" | "granted";

const TABS: Array<{ id: TabId; label: string; icon: typeof Box }> = [
  { id: "progress", label: "Caja", icon: Box },
  { id: "vision", label: "Visión", icon: Eye },
  { id: "history", label: "Historial", icon: History },
  { id: "shiny", label: "Mods Shiny", icon: Gem },
  { id: "changes", label: "Cambios", icon: FileClock },
  { id: "settings", label: "Configuración", icon: Settings2 },
];

const CHANGELOG = [
  {
    version: "1.4.0",
    date: "10 de septiembre de 2026",
    title: "Control de módulos Shiny",
    items: [
      "Nuevo seguimiento de intentos fallidos con duplicados nivel 17 para cada módulo y variante.",
      "Colección separada para marcar los módulos que ya se convirtieron en Shiny y conservar su fecha.",
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
  const [creatorAccess, setCreatorAccess] = useState<CreatorAccess>("checking");
  const [creatorMessage, setCreatorMessage] = useState("Comprobando la cuenta de GitHub…");
  const initialCycle = useRef(computeCycle(state.settings));
  const initialCycleSeconds = Math.ceil(initialCycle.current.remainingMs / 1000);
  const [counterPhase, setCounterPhase] = useState<"waiting" | "active">(initialCycle.current.phase);
  const [counterMinutes, setCounterMinutes] = useState(() => String(Math.floor(initialCycleSeconds / 60)));
  const [counterSeconds, setCounterSeconds] = useState(() => String(initialCycleSeconds % 60));
  const [manualHistoryText, setManualHistoryText] = useState("");
  const defaultShinyMod = SHINY_MOD_CATALOG.find((item) => item.englishName === "Rush Hour") ?? SHINY_MOD_CATALOG[0];
  const [shinySearch, setShinySearch] = useState("");
  const [shinyGroupFilter, setShinyGroupFilter] = useState("all");
  const [selectedShinyModId, setSelectedShinyModId] = useState(defaultShinyMod.id);
  const [selectedShinyVariant, setSelectedShinyVariant] = useState("Estrella descendente");
  const importRef = useRef<HTMLInputElement>(null);
  const voiceAlertRef = useRef("");

  const currentPoints = useMemo(() => state.actions.reduce((sum, action) => sum + action.points, 0), [state.actions]);
  const currentClaims = state.actions.length;
  const breakdown = useMemo(() => buildBreakdown(state.actions), [state.actions]);
  const referencePoints = useMemo(() => [...BASELINE_BOX_POINTS, ...state.manualBaselinePoints], [state.manualBaselinePoints]);
  const stats = useMemo(() => boxStatistics(state.boxes, currentPoints, referencePoints), [state.boxes, currentPoints, referencePoints]);
  const baselineStats = useMemo(() => boxStatistics([], 0, referencePoints), [referencePoints]);
  const selectedVision = state.catalog.visions.find((vision) => vision.id === state.settings.selectedVisionId) ?? state.catalog.visions[0];
  const cycle = computeCycle(state.settings, now);
  const target = clampNumber(state.catalog.boxTargetPoints, 1, 10_000);
  const targetProgress = Math.min(100, Math.round((currentPoints / target) * 100));
  const selectedShinyMod = SHINY_MOD_CATALOG.find((item) => item.id === selectedShinyModId) ?? defaultShinyMod;
  const normalizedShinySearch = normalizeModSearch(shinySearch);
  const filteredShinyCatalog = useMemo(() => SHINY_MOD_CATALOG.filter((item) => {
    if (shinyGroupFilter !== "all" && item.groupId !== shinyGroupFilter) return false;
    if (!normalizedShinySearch) return true;
    return normalizeModSearch(`${item.name} ${item.englishName} ${item.groupName} ${item.variants.join(" ")}`).includes(normalizedShinySearch);
  }), [normalizedShinySearch, shinyGroupFilter]);
  const activeShinyGoals = state.shinyMods.filter((item) => !item.isShiny);
  const obtainedShinyMods = state.shinyMods.filter((item) => item.isShiny);
  const totalShinyAttempts = state.shinyMods.reduce((sum, item) => sum + item.attempts, 0);
  const catalogShinyOwned = new Set(obtainedShinyMods.flatMap((item) => item.catalogId ? [item.catalogId] : [])).size;
  const shinyCollectionPercent = (catalogShinyOwned / SHINY_MOD_CATALOG.length) * 100;

  const commitState = useCallback((update: PersistedState | ((current: PersistedState) => PersistedState)) => {
    setState((current) => typeof update === "function" ? update(current) : update);
  }, []);

  const checkCreatorAccess = useCallback(async () => {
    if (!isTauri()) {
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
    const timer = window.setTimeout(() => setIntroVisible(false), 4200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    void checkCreatorAccess();
  }, [checkCreatorAccess]);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      setState((current) => normalizeCycleState(current, timestamp));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void showOverlay(state.settings.overlayEnabled);
  }, [state.settings.overlayEnabled]);

  useEffect(() => {
    if (cycle.phase !== "active" || !state.settings.notificationsEnabled) return;
    if (state.settings.lastNotificationPhaseStartedAt === state.settings.phaseStartedAt) return;

    const notify = async () => {
      if (!isTauri()) return;
      let permitted = await isPermissionGranted();
      if (!permitted) permitted = (await requestPermission()) === "granted";
      if (!permitted) return;
      sendNotification({
        title: `Rueda Visional activa · ${selectedVision?.name ?? "Visión"}`,
        body: `El evento acaba de comenzar. Termina en ${formatDuration(cycle.remainingMs)}.`,
      });
      commitState((current) => ({
        ...current,
        settings: { ...current.settings, lastNotificationPhaseStartedAt: current.settings.phaseStartedAt },
      }));
    };
    void notify();
  }, [commitState, cycle.phase, cycle.remainingMs, selectedVision?.name, state.settings.lastNotificationPhaseStartedAt, state.settings.notificationsEnabled, state.settings.phaseStartedAt]);

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

    if (isTauri() && state.settings.notificationsEnabled) {
      void (async () => {
        let permitted = await isPermissionGranted();
        if (!permitted) permitted = (await requestPermission()) === "granted";
        if (permitted) sendNotification({ title: "Gravedad comenzará pronto", body: message });
      })();
    }
  }, [commitState, cycle.phase, cycle.remainingMs, selectedVision?.id, state.settings.lastVoiceAlertPhaseStartedAt, state.settings.notificationsEnabled, state.settings.phaseStartedAt, state.settings.voiceLeadMinutes, state.settings.voiceNotificationsEnabled]);

  const syncCatalog = useCallback(async (silent = false) => {
    if (!silent) setSyncStatus("Buscando catálogo público…");
    try {
      const response = await fetch(`${REMOTE_CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const catalog = await response.json() as unknown;
      if (!validateCatalog(catalog)) throw new Error("formato no válido");
      setState((current) => {
        if (catalog.catalogVersion <= current.catalog.catalogVersion) return current;
        return { ...current, catalog };
      });
      setSyncStatus(`Catálogo público v${catalog.catalogVersion} comprobado`);
    } catch (error) {
      setSyncStatus(`Sin conexión · usando catálogo local`);
      if (!silent) console.info("No se pudo sincronizar el catálogo", error);
    }
  }, []);

  useEffect(() => {
    void syncCatalog(true);
    const timer = window.setInterval(() => void syncCatalog(true), 60_000);
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
    const action: PointAction = {
      id: createId("claim"),
      activityId: activity.id,
      activityName: activity.name,
      visionId: vision?.id,
      visionName: vision?.name,
      points: activity.points,
      occurredAt: new Date().toISOString(),
    };
    commitState((current) => ({ ...current, actions: [...current.actions, action] }));
    setToast(`+${activity.points} · ${activity.name}`);
    window.setTimeout(() => setToast(""), 1800);
  };

  const removeLastActivity = (activityId: string, visionId?: string) => {
    commitState((current) => {
      const index = current.actions.map((action) => `${action.visionId ?? "pro"}:${action.activityId}`).lastIndexOf(`${visionId ?? "pro"}:${activityId}`);
      if (index < 0) return current;
      return { ...current, actions: current.actions.filter((_, actionIndex) => actionIndex !== index) };
    });
  };

  const markBox = (source: "normal" | "platform-mail" = "normal") => {
    if (state.actions.length === 0) return;
    const split = source === "platform-mail" ? splitPlatformCarryover(state.actions) : { completedAttempt: state.actions, carryOver: [] as PointAction[] };
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
      breakdown: buildBreakdown(split.completedAttempt),
    };
    commitState((current) => ({ ...current, actions: split.carryOver, boxes: [record, ...current.boxes] }));
    setToast(source === "platform-mail" ? `Caja de Plataformas registrada; ${carriedPoints} puntos pasan al nuevo intento` : `Caja registrada con ${recordedPoints} puntos`);
    window.setTimeout(() => setToast(""), 2400);
  };

  const resetAttempt = () => {
    if (state.actions.length === 0) return;
    commitState((current) => ({ ...current, actions: [] }));
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
    if (!item.variants.includes(selectedShinyVariant)) setSelectedShinyVariant(item.variants[0]);
  };

  const addShinyTracker = (customName?: string) => {
    const custom = customName?.trim();
    const modName = custom || selectedShinyMod.name;
    const catalogId = custom ? undefined : selectedShinyMod.id;
    const groupName = custom ? "Módulo personalizado" : selectedShinyMod.groupName;
    const englishName = custom ? undefined : selectedShinyMod.englishName;
    const variant = selectedShinyVariant.trim() || "Sin variante";
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
    setToast(obtained ? "Módulo marcado como Shiny" : "Módulo devuelto a la lista de búsqueda");
    window.setTimeout(() => setToast(""), 2200);
  };

  const saveCatalog = useCallback((catalog: Catalog) => {
    commitState((current) => ({ ...current, catalog }));
    setSyncStatus(`Cambios locales v${catalog.catalogVersion} listos para publicar`);
  }, [commitState]);

  const publishCatalog = useCallback(async (catalog: Catalog) => {
    if (!isTauri()) throw new Error("La publicación solo está disponible en la aplicación de escritorio.");
    const message = await invoke<string>("publish_catalog", { catalogJson: JSON.stringify(catalog, null, 2) });
    setSyncStatus(message);
    return message;
  }, []);

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
          {TABS.map(({ id, label, icon: Icon }) => (
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
        <header className="topbar">
          <div>
            <span className="eyebrow">{tab === "progress" ? "SEGUIMIENTO ACTUAL" : tab === "vision" ? "RUEDA VISIONAL" : tab === "history" ? "REGISTRO PERSONAL" : tab === "shiny" ? "COLECCIÓN DE MÓDULOS" : tab === "changes" ? "NOVEDADES" : "PREFERENCIAS"}</span>
            <h1>{TABS.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className={`phase-chip ${cycle.phase}`}>
            <span className="pulse" />
            <div><small>{cycle.phase === "active" ? `${selectedVision?.name ?? "Visión"} activa` : "Próxima activación"}</small><strong>{formatDuration(cycle.remainingMs)}</strong></div>
          </div>
        </header>

        {tab === "progress" && (
          <section className="page progress-page">
            <div className="hero-grid">
              <article className="progress-hero panel">
                <div className="hero-copy">
                  <span className="eyebrow"><Sparkles size={14} /> INTENTO EN CURSO</span>
                  <h2>{currentPoints}<small> / {target} puntos</small></h2>
                  <p>{currentClaims} {currentClaims === 1 ? "recompensa reclamada" : "recompensas reclamadas"}. La caja puede salir antes: regístrala cuando aparezca.</p>
                  <div className="progress-track" role="progressbar" aria-label="Progreso del intento" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(currentPoints, target)}>
                    <span style={{ width: `${targetProgress}%` }} />
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="primary" disabled={state.actions.length === 0} onClick={() => markBox("normal")}><Box size={19} /> ¡Salió la caja!</button>
                    <button type="button" className="secondary platform-mail-button" disabled={state.actions.length === 0} onClick={() => markBox("platform-mail")}><Mail size={18} /> Llegó por Plataformas</button>
                    <button type="button" className="secondary" disabled={state.actions.length === 0} onClick={() => commitState((current) => ({ ...current, actions: current.actions.slice(0, -1) }))}><Undo2 size={18} /> Deshacer último</button>
                  </div>
                </div>
                <div className="ghost-orbit" aria-hidden="true"><div className="orbital-ring" /><img className="ghost-crate-image" src={PHANTOM_CRATE_IMAGE} alt="" /><div className="once-human-wordmark"><span>ONCE</span><strong>HUMAN</strong></div><Sparkles className="spark-one" /><Sparkles className="spark-two" /></div>
              </article>

              <article className="chance-card panel">
                <span className="eyebrow"><BarChart3 size={14} /> ESTIMACIÓN OBSERVADA</span>
                <strong className="chance-value">{stats.currentChancePercent.toFixed(1)}%</strong>
                <p>Probabilidad acumulada estimada con la hoja base, valores manuales y tus cajas confirmadas.</p>
                <div className="mini-stats"><span><small>Promedio</small><strong>{stats.count ? stats.average.toFixed(1) : "—"}</strong></span><span><small>Muestras</small><strong>{stats.count}</strong></span></div>
              </article>
            </div>

            <div className="section-heading"><div><span className="eyebrow">RECOMPENSAS PRO</span><h2>Suma lo que reclames</h2></div><span>Solo las recompensas completadas cuentan</span></div>
            <div className="activity-grid">
              {state.catalog.proActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} count={state.actions.filter((action) => !action.visionId && action.activityId === activity.id).length} onAdd={() => addActivity(activity)} onRemove={() => removeLastActivity(activity.id)} />
              ))}
            </div>

            <div className="section-heading"><div><span className="eyebrow">VISIÓN SELECCIONADA</span><h2>{selectedVision?.name ?? "Sin visión"}</h2></div><button type="button" className="link-button" onClick={() => setTab("vision")}>Configurar rueda <ChevronRight size={15} /></button></div>
            {!selectedVision?.enabled && <div className="notice warning"><ActivityIcon size={18} /><span><strong>Evento desactivado.</strong> Sus opciones se muestran como referencia y no suman puntos.</span></div>}
            <div className="activity-grid">
              {selectedVision?.activities.length ? selectedVision.activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} disabled={!selectedVision.enabled} count={state.actions.filter((action) => action.visionId === selectedVision.id && action.activityId === activity.id).length} onAdd={() => addActivity(activity, selectedVision)} onRemove={() => removeLastActivity(activity.id, selectedVision.id)} />
              )) : <div className="empty-card"><Sparkles size={28} /><strong>Aún no hay recompensas para {selectedVision?.name}</strong><span>Puedes añadirlas en Configuración y publicarlas para todos.</span></div>}
            </div>

            {breakdown.length > 0 && <article className="attempt-log panel">
              <div className="panel-title"><div><span className="eyebrow">DESGLOSE</span><h3>Intento actual</h3></div><button type="button" className="danger-quiet" onClick={resetAttempt}><RotateCcw size={16} /> Reiniciar</button></div>
              {breakdown.map((item) => <div className="log-row" key={item.name}><span>{item.name}<small>{item.count}× reclamado</small></span><strong>{pointsLabel(item.points)}</strong></div>)}
            </article>}
          </section>
        )}

        {tab === "vision" && (
          <section className="page vision-page">
            <div className="vision-layout">
              <article className={`timer-panel panel ${cycle.phase}`}>
                <div className="timer-top"><span className="eyebrow"><Clock3 size={15} /> CICLO AUTOMÁTICO</span><span className="live-dot">{cycle.phase === "active" ? "EN CURSO" : "EN ESPERA"}</span></div>
                <h2>{cycle.phase === "active" ? "La Rueda está activa" : "La Rueda comenzará en"}</h2>
                <strong className="timer-value">{formatDuration(cycle.remainingMs)}</strong>
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
                <div className={`mock-overlay ${cycle.phase}`}><span>{cycle.phase === "active" ? `${selectedVision?.name} activa` : `Próxima ${selectedVision?.name}`}</span><strong>{formatDuration(cycle.remainingMs)}</strong></div>
                <p>Arrástrala a cualquier zona de la pantalla. Se mantiene encima en juegos con pantalla completa sin bordes.</p>
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
                <button type="button" className="primary" onClick={synchronizeCountdown}><Save size={17} /> Aplicar tiempo</button>
              </div>
              <small className="counter-anchor-note">Sincronización inicial: Gravedad terminó a las 4:52:30 p. m. de Colombia el 10 de septiembre de 2026.</small>
            </article>

            <div className="section-heading"><div><span className="eyebrow">RUEDA ACTUAL</span><h2>Elige la visión</h2></div><span>La selección se conserva al reiniciar</span></div>
            <div className="vision-cards">
              {state.catalog.visions.map((vision) => (
                <button key={vision.id} type="button" className={`${state.settings.selectedVisionId === vision.id ? "selected" : ""} ${!vision.enabled ? "disabled" : ""}`} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, selectedVisionId: vision.id } }))}>
                  <span className="vision-icon">{vision.id === "gravity" ? <Zap /> : vision.id === "lunar" ? <Sparkles /> : <ActivityIcon />}</span>
                  <span><small>{vision.enabled ? "DISPONIBLE" : "DESACTIVADA"}</small><strong>{vision.name}</strong><em>{vision.description}</em></span>
                  {state.settings.selectedVisionId === vision.id && <Check size={20} />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="page history-page">
            <div className="stats-grid">
              <StatCard icon={Box} label="Muestras totales" value={String(stats.count)} />
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
                    <div className="record-main"><span>{formatDate(box.occurredAt)}</span><strong>{pointsLabel(box.points)}</strong><small>{box.claims} recompensas reclamadas{box.source === "platform-mail" ? ` · correo de Plataformas · ${box.carriedPoints ?? 0} pts transferidos` : ""}</small></div>
                    <details><summary>Ver desglose</summary>{box.breakdown.map((item) => <div key={item.name}><span>{item.name} · {item.count}×</span><strong>{item.points}</strong></div>)}</details>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "shiny" && (
          <section className="page shiny-page">
            <div className="stats-grid shiny-stats">
              <StatCard icon={Search} label="Buscando convertir" value={String(activeShinyGoals.length)} />
              <StatCard icon={Gem} label="Shiny conseguidos" value={String(obtainedShinyMods.length)} />
              <StatCard icon={RotateCcw} label="Duplicados +17 fallidos" value={String(totalShinyAttempts)} />
              <StatCard icon={Trophy} label="Colección del catálogo" value={`${shinyCollectionPercent.toFixed(1)}%`} />
            </div>

            <article className="shiny-rule panel">
              <div className="shiny-rule-icon"><Gem /></div>
              <div><span className="eyebrow">CÓMO FUNCIONA</span><h2>Cada fallo suma un intento</h2><p>Cuando ya tienes un módulo nivel 17, obtener otro nivel 17 del mismo módulo puede convertirlo aleatoriamente en Shiny. Pulsa “Otro +17 no se convirtió” después de cada fallo; cuando salga, márcalo como conseguido.</p></div>
            </article>

            <article className="shiny-catalog-panel panel">
              <div className="panel-title"><div><span className="eyebrow"><Search size={15} /> CATÁLOGO DE MÓDULOS</span><h2>Buscar y agregar un objetivo</h2></div><span className="catalog-count">{SHINY_MOD_CATALOG.length} módulos base</span></div>
              <div className="shiny-search-controls">
                <label className="shiny-search-field">Buscar por nombre en español o inglés<div><Search size={16} /><input value={shinySearch} onChange={(event) => setShinySearch(event.target.value)} placeholder="Ejemplo: Hora punta o Rush Hour" /></div></label>
                <label>Estilo o pieza<select value={shinyGroupFilter} onChange={(event) => setShinyGroupFilter(event.target.value)}><option value="all">Todos los estilos y piezas</option>{SHINY_MOD_GROUPS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
              </div>
              <div className="shiny-catalog-results">
                {filteredShinyCatalog.map((item) => <button type="button" key={item.id} className={selectedShinyMod.id === item.id ? "selected" : ""} onClick={() => chooseShinyMod(item)}><span>{item.groupName}</span><strong>{item.name}</strong><small>{item.englishName}</small>{selectedShinyMod.id === item.id && <Check size={16} />}</button>)}
                {filteredShinyCatalog.length === 0 && <div className="shiny-no-results"><Search size={23} /><span>No aparece en el catálogo. Puedes agregar el nombre escrito como personalizado.</span></div>}
              </div>
              <div className="shiny-selection">
                <div><span>MÓDULO SELECCIONADO</span><strong>{selectedShinyMod.name}</strong><small>{selectedShinyMod.groupName} · {selectedShinyMod.englishName}</small></div>
                <label>Variante del nivel 17<select value={selectedShinyVariant} onChange={(event) => setSelectedShinyVariant(event.target.value)}>{selectedShinyMod.variants.map((variant) => <option key={variant} value={variant}>{variant}</option>)}</select></label>
                <button type="button" className="primary" onClick={() => addShinyTracker()}><Plus size={17} /> Empezar en 0</button>
                <button type="button" className="secondary" disabled={!shinySearch.trim()} onClick={() => addShinyTracker(shinySearch)}><Plus size={17} /> Agregar nombre escrito</button>
              </div>
              <p className="catalog-source-note">Catálogo bilingüe revisado el 10 de septiembre de 2026: 36 módulos de arma y 64 de armadura. Los nombres personalizados permiten registrar incorporaciones futuras.</p>
            </article>

            <div className="section-heading shiny-heading"><div><span className="eyebrow">EN PROCESO</span><h2>Intentos de conversión</h2></div><span>{activeShinyGoals.length} activos</span></div>
            {activeShinyGoals.length === 0 ? <div className="empty-card shiny-empty"><Gem size={30} /><strong>No estás siguiendo ningún módulo</strong><span>Busca uno arriba, elige su variante y pulsa “Empezar en 0”.</span></div> : <div className="shiny-tracker-grid">{activeShinyGoals.map((record) => <ShinyTrackerCard key={record.id} record={record} onDecrease={() => adjustShinyAttempts(record.id, -1)} onIncrease={() => adjustShinyAttempts(record.id, 1)} onToggle={() => setShinyObtained(record.id, true)} onDelete={() => commitState((current) => ({ ...current, shinyMods: current.shinyMods.filter((item) => item.id !== record.id) }))} />)}</div>}

            <div className="section-heading shiny-heading"><div><span className="eyebrow">COLECCIÓN SHINY</span><h2>Módulos conseguidos</h2></div><span>{obtainedShinyMods.length} marcados</span></div>
            {obtainedShinyMods.length === 0 ? <div className="empty-card shiny-empty obtained"><Trophy size={30} /><strong>Aún no has marcado ningún Shiny</strong><span>También puedes agregar un módulo y marcarlo directamente si ya lo tenías.</span></div> : <div className="shiny-tracker-grid">{obtainedShinyMods.map((record) => <ShinyTrackerCard key={record.id} record={record} onDecrease={() => adjustShinyAttempts(record.id, -1)} onIncrease={() => adjustShinyAttempts(record.id, 1)} onToggle={() => setShinyObtained(record.id, false)} onDelete={() => commitState((current) => ({ ...current, shinyMods: current.shinyMods.filter((item) => item.id !== record.id) }))} />)}</div>}
          </section>
        )}

        {tab === "changes" && (
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
                <div className="settings-icon"><Clock3 /></div><div><h3>Duración del ciclo</h3><p>Define cuánto espera la rueda para empezar y cuánto permanece activa.</p><div className="field-row"><label>Espera (minutos)<input type="number" min={1} max={525600} value={state.settings.waitMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, waitMinutes: clampNumber(Number(event.target.value), 1, 525600), phaseStartedAt: new Date().toISOString() } }))} /></label><label>Activa (minutos)<input type="number" min={1} max={525600} value={state.settings.activeMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, activeMinutes: clampNumber(Number(event.target.value), 1, 525600), phaseStartedAt: new Date().toISOString() } }))} /></label></div></div>
              </article>
              <SettingToggle icon={Bell} title="Recordatorios" description="Muestra un aviso de Windows cada vez que comienza la fase activa." enabled={state.settings.notificationsEnabled} onToggle={() => commitState((current) => ({ ...current, settings: { ...current.settings, notificationsEnabled: !current.settings.notificationsEnabled } }))} />
              <article className="settings-card voice-settings panel">
                <div className="settings-icon"><Volume2 /></div><div><h3>Aviso por voz · Gravedad</h3><p>Habla antes de que empiece el evento aunque la aplicación esté minimizada.</p><div className="voice-controls"><label>Anticipación (minutos)<input type="number" min={1} max={60} value={state.settings.voiceLeadMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, voiceLeadMinutes: clampNumber(Number(event.target.value), 1, 60), lastVoiceAlertPhaseStartedAt: undefined } }))} /></label><button type="button" className="secondary compact" onClick={() => { speakMessage("Prueba de voz. El aviso de Gravedad está funcionando."); setToast("Prueba de voz reproducida"); window.setTimeout(() => setToast(""), 1800); }}><Volume2 size={15} /> Probar voz</button></div></div><button type="button" className={`switch ${state.settings.voiceNotificationsEnabled ? "on" : ""}`} aria-pressed={state.settings.voiceNotificationsEnabled} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, voiceNotificationsEnabled: !current.settings.voiceNotificationsEnabled } }))}><span /></button>
              </article>
              <SettingToggle icon={MonitorUp} title="Iniciar con Windows" description="Arranca en segundo plano; la ventana principal no interrumpe al encender el PC." enabled={state.settings.autoStartEnabled} onToggle={(enabled) => { commitState((current) => ({ ...current, settings: { ...current.settings, autoStartEnabled: enabled } })); void toggleAutostart(enabled); }} />
              <SettingToggle icon={Eye} title="Ventana flotante" description="Contador pequeño, movible y siempre encima del juego." enabled={state.settings.overlayEnabled} onToggle={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))} />
            </div>

            <article className="backup-panel panel"><div><span className="eyebrow">DATOS PERSONALES</span><h2>Respaldo local</h2><p>El historial permanece en este equipo y no se sube al repositorio público.</p></div><div><button type="button" className="secondary" onClick={() => exportState(state)}><Download size={17} /> Exportar</button><button type="button" className="secondary" onClick={() => importRef.current?.click()}><Upload size={17} /> Importar</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void onImport(event.target.files?.[0])} /></div></article>

            <article className="owner-panel panel">
              <div className="panel-title"><div><span className="eyebrow">MODO DESARROLLADOR</span><h2>Editor de OscarD0823</h2></div><span className={`creator-access-badge ${creatorAccess}`}>{creatorAccess === "granted" ? <UserCheck size={15} /> : <LockKeyhole size={15} />}{creatorAccess === "granted" ? "Propietario verificado" : creatorAccess === "checking" ? "Comprobando" : "Bloqueado"}</span></div>
              <p>Cada cambio se publica automáticamente. El servidor vuelve a comprobar la cuenta de GitHub antes de aceptar cada actualización.</p>
              {creatorAccess === "granted" ? <CatalogEditor catalog={state.catalog} onSave={saveCatalog} onPublish={publishCatalog} /> : <div className="creator-login-card"><div className="creator-lock"><LockKeyhole size={25} /></div><div><strong>Inicia sesión con la cuenta propietaria</strong><span>{creatorMessage}</span><div className="creator-login-actions"><button type="button" className="primary compact" onClick={() => void startCreatorLogin()}><LogIn size={15} /> Iniciar sesión con GitHub</button><button type="button" className="secondary compact" disabled={creatorAccess === "checking"} onClick={() => void checkCreatorAccess()}><RefreshCw size={15} /> Comprobar cuenta</button></div></div></div>}
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
    <button type="button" className={`shiny-obtained-button ${record.isShiny ? "active" : ""}`} onClick={onToggle}>{record.isShiny ? <><Check size={17} /> Shiny conseguido · {record.obtainedAt ? formatDate(record.obtainedAt) : "sin fecha"}</> : <><Sparkles size={17} /> Marcar como Shiny</>}</button>
  </article>;
}

function StartupIntro({ onSkip }: { onSkip: () => void }) {
  return <button type="button" className="startup-intro" onClick={onSkip} aria-label="Omitir animación de apertura">
    <span className="intro-aura" />
    <span className="intro-crate" aria-hidden="true">
      <img className="intro-card-bottom" src={PHANTOM_CRATE_IMAGE} alt="" />
      <span className="intro-card-top"><img src={PHANTOM_CRATE_IMAGE} alt="" /></span>
      <span className="intro-lock"><GameLogoMark /></span>
      <span className="intro-light" />
    </span>
    <span className="intro-title"><strong>CAJA FANTASMA</strong><small>ONCE HUMAN</small></span>
    <span className="intro-hint">Pulsa para continuar</span>
  </button>;
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
