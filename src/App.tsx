import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
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
  RadioTower,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
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
import LocalSyncAddressFields from "./LocalSyncAddressFields";
import OverlayPreviewLab from "./OverlayPreviewLab";
import AppUpdater from "./Updater";
import { GRAVITY_EVENT_IMAGE_A, GRAVITY_EVENT_IMAGE_B, LUNAR_EVENT_IMAGE, PHANTOM_CRATE_IMAGE, SYMBIOSIS_EVENT_IMAGE, visionVisualImage, visionVisualTheme } from "./assets";
import type { Activity, ActivityHistoryRecord, Catalog, CharacterProfile, OverlayCounterStyle, OverlayNameMode, OverlayShape, PersistedState, PointAction, PointRoundRecord, PointRoundTrigger, Settings, ShinyModRecord, Vision, WhaleCounterStyle } from "./model";
import {
  APP_VERSION,
  ANDROID_APK_URL,
  AUTHOR,
  DEFAULT_CHARACTER_ID,
  REMOTE_CATALOG_URL,
  REPOSITORY_URL,
  actionCharacterIds,
  activityHistorySummary,
  applyRemoteCatalog,
  actionsForCharacter,
  actionsForTeamSession,
  boxStatistics,
  buildBreakdown,
  buildPointRoundBreakdown,
  clampNumber,
  computeCountdownTransition,
  computeCycle,
  createId,
  detachCharacterFromActions,
  formatCompactDuration,
  formatDuration,
  localDateKey,
  overlayVisionName,
  parseManualBaseline,
  pointActionsInRound,
  resolveTransitionDelayMilliseconds,
  sharedEventTimingFromSettings,
  sharedVisionId,
  splitPlatformCarryover,
  validateCatalog,
} from "./model";
import { applyPersonalSyncPayload, exportState, importState, loadPersonalSyncUpdatedAt, loadState, personalSyncPayload, savePersonalSyncUpdatedAt, saveState } from "./storage";
import { isValidLocalSyncAddress, splitLocalSyncAddress } from "./localSyncAddress";
import type { ShinyModCatalogItem } from "./shinyModsCatalog";

type ShinyCatalogModule = typeof import("./shinyModsCatalog");
const EMPTY_SHINY_CATALOG: ShinyModCatalogItem[] = [];
const EMPTY_SHINY_GROUPS: ShinyCatalogModule["SHINY_MOD_GROUPS"] = [];

function catalogStatusLabel(item: Pick<ShinyModCatalogItem, "levelLabel">, language: "es" | "en" = "es") {
  return language === "en" && item.levelLabel === "Brillante" ? "Shiny" : item.levelLabel;
}

function catalogOriginLabel(item: Pick<ShinyModCatalogItem, "system">, language: "es" | "en" = "es") {
  if (language === "en") return item.system === "legacy" ? "Legacy system" : "System 2.0";
  return item.system === "legacy" ? "Sistema anterior" : "Sistema 2.0";
}

function normalizeModSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

function matchesModSearch(item: ShinyModCatalogItem, search: string) {
  if (!search) return true;
  const haystack = normalizeModSearch([item.name, item.englishName, item.baseName, item.baseEnglishName, item.variant, item.applyRange, item.modType, item.groupName, item.levelLabel, catalogStatusLabel(item, "en"), catalogOriginLabel(item), catalogOriginLabel(item, "en"), item.itemId].join(" "));
  return search.split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}

type TabId = "progress" | "characters" | "vision" | "devices" | "history" | "shiny" | "changes" | "settings";
type CreatorAccess = "checking" | "locked" | "granted";

type LocalSyncInfo = { enabled: boolean; address: string; port: number; pairingCode: string };
type LocalSyncSnapshot = { enabled: boolean; revision: number; updatedAt: string; dataJson: string; lastExchangeAt: number; lastMobileUpdateAt: number };
type LocalSyncAction = "status" | "pull" | "push" | "live";
type LocalSyncExchange = Omit<LocalSyncSnapshot, "enabled" | "lastMobileUpdateAt"> & { ok: boolean; message: string; catalogJson?: string };

const REMOTE_CATALOG_API_URL = "https://api.github.com/repos/OscarD0823/Caja-Fantasma/contents/catalog/visions.json?ref=main";
const IS_ANDROID = /Android/i.test(navigator.userAgent);
let catalogApiFallbackAvailableAt = 0;

function createPairingCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
}

async function fetchPublicCatalog(): Promise<unknown> {
  try {
    const response = await fetch(`${REMOTE_CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub Raw HTTP ${response.status}`);
    return await response.json() as unknown;
  } catch (rawError) {
    if (Date.now() < catalogApiFallbackAvailableAt) throw rawError;
    catalogApiFallbackAvailableAt = Date.now() + 120_000;
    const response = await fetch(REMOTE_CATALOG_API_URL, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
    const payload = await response.json() as { content?: string; encoding?: string };
    if (payload.encoding !== "base64" || typeof payload.content !== "string") throw new Error("GitHub API no devolvió el catálogo esperado");
    const bytes = Uint8Array.from(atob(payload.content.replace(/\s/g, "")), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  }
}

const TABS: Array<{ id: TabId; es: string; en: string; icon: typeof Box }> = [
  { id: "progress", es: "Caja", en: "Crate", icon: Box },
  { id: "characters", es: "Personajes", en: "Characters", icon: Users },
  { id: "vision", es: "Visión", en: "Visional Wheel", icon: Eye },
  { id: "devices", es: "Dispositivos", en: "Devices", icon: Smartphone },
  { id: "history", es: "Historial", en: "History", icon: History },
  { id: "shiny", es: "Mods Brillantes", en: "Shiny Mods", icon: Gem },
  { id: "changes", es: "Cambios", en: "Changes", icon: FileClock },
  { id: "settings", es: "Configuración", en: "Settings", icon: Settings2 },
];

const CHANGELOG = [
  {
    version: "1.17.1",
    date: "20 de septiembre de 2026",
    title: "Conexión en vivo estable en Windows",
    items: [
      "Corregido el error de socket 10035 que podía aparecer al sincronizar con frecuencia entre el PC y Android.",
      "Cada conexión del celular espera correctamente la llegada de los datos sin bloquear indefinidamente el servidor.",
      "Los botones PC → Celular y Celular → PC conservan su funcionamiento junto al modo en vivo.",
    ],
  },
  {
    version: "1.17.0",
    date: "19 de septiembre de 2026",
    title: "Datos en vivo, resumen diario y ranking",
    items: [
      "La sincronización en vivo opcional refleja cambios personales entre PC y Android mientras ambas aplicaciones estén abiertas, sin quitar los botones manuales.",
      "Caja separa los puntos y actividades de hoy de los acumulados históricos.",
      "Un ranking ordena los jefes y recompensas por la cantidad realizada desde que comenzó a usarse el programa.",
      "Cada recompensa muestra su contador de hoy y su contador histórico.",
      "La Ballena incorpora el estilo Solo rayo: el haz funciona como contador y pierde intensidad al acercarse al final.",
    ],
  },
  {
    version: "1.16.3",
    date: "19 de septiembre de 2026",
    title: "Sincronización dirigida e interfaz bilingüe",
    items: [
      "Android permite elegir explícitamente PC → Celular o Celular → PC, sin decidir por la hora de los dispositivos.",
      "El sondeo automático comprueba la conexión y recibe el catálogo público, pero no reemplaza datos personales.",
      "Los tiempos, la fase y la transición publicados por el administrador también llegan al celular a través del PC conectado.",
      "Los módulos se muestran desde Nivel 1 hasta Nivel 17 y después como Brillante.",
      "Nuevo selector Español / English para la interfaz principal.",
    ],
  },
  {
    version: "1.16.2",
    date: "13 de septiembre de 2026",
    title: "Conexión móvil guiada y tiempos públicos comprobados",
    items: [
      "En Android, la IP del PC se escribe en cuatro bloques numéricos y el puerto en un bloque independiente.",
      "Es posible pegar la dirección completa; la aplicación separa y valida automáticamente cada dato.",
      "Windows muestra IP, puerto y código en tarjetas independientes para copiarlos sin confusión.",
      "La sincronización local se verificó en ambas direcciones, con control de código y límite exclusivo a redes privadas.",
      "Los tiempos publicados por el administrador se aplican en Windows y Android junto con la rueda, la fase y la transición.",
    ],
  },
  {
    version: "1.16.1",
    date: "13 de septiembre de 2026",
    title: "Dispositivos y versión siempre visibles",
    items: [
      "La versión instalada aparece en la identidad del programa y en una ficha pública disponible para todas las personas.",
      "Sincronización PC–Android y descarga de la APK se trasladaron a la nueva sección lateral Dispositivos.",
      "La sección muestra la versión del catálogo, la rueda pública y la última publicación del administrador.",
      "Windows y Android comprueban automáticamente los cambios públicos del administrador cada 30 segundos y al recuperar conexión o foco.",
      "Las nuevas versiones del programa llegan a ambos sistemas: Windows se reinicia después de validar su firma y Android descarga la APK, comprueba SHA-256 y abre la confirmación segura del sistema.",
    ],
  },
  {
    version: "1.16.0",
    date: "13 de septiembre de 2026",
    title: "Sincronización directa entre PC y Android",
    items: [
      "El historial, puntos, personajes, rondas y módulos Brillantes se sincronizan directamente entre el PC y la APK mediante la red local, sin Firebase ni nube personal.",
      "La configuración completa de la ventana flotante se concentra ahora en Caja para mantener limpia la pestaña Visión.",
      "El Riftwalker puede conservar el rayo de progreso ocultando únicamente el texto y reloj del tiempo.",
      "La aplicación de Windows incluye un botón directo para descargar la APK firmada correspondiente a esta versión.",
    ],
  },
  {
    version: "1.15.0",
    date: "12 de septiembre de 2026",
    title: "Aplicación Android y ruedas visuales",
    items: [
      "Primera APK instalable para teléfonos Android con el progreso, personajes, historial, módulos y rueda pública.",
      "La vista pública de Visión ya no permite cambiar ni corregir el ciclo; esos controles ahora son exclusivos del administrador.",
      "Todas las ruedas muestran una ficha con imagen, descripción y estado, incluida la configuración de futuras ruedas.",
      "El propietario puede crear ruedas nuevas y modificar su nombre, descripción, imagen, estado, tiempos y recompensas antes de publicarlas.",
    ],
  },
  {
    version: "1.14.1",
    date: "12 de septiembre de 2026",
    title: "Conteos por recompensa desde cero",
    items: [
      "Cada tarjeta muestra únicamente lo realizado en la ronda actual y vuelve visualmente a cero al guardarla.",
      "Debajo del control aparece el acumulado guardado de esa recompensa: por ejemplo, 4 Plataformas y luego 3 muestran Lleva 7.",
      "Las instalaciones nuevas ya no incluyen las 16 salidas de la hoja como historial ni como base estadística.",
      "La estimación comienza en cero y aprende solo de valores manuales o cajas realmente registradas por cada persona.",
    ],
  },
  {
    version: "1.14.0",
    date: "12 de septiembre de 2026",
    title: "Historial de rondas de puntos",
    items: [
      "El cuadro principal muestra los puntos de la ronda actual sin alterar el progreso total de la Caja Fantasma.",
      "Al comenzar una rueda, la ronda anterior se guarda con fecha, recompensas y desglose, y el conteo parcial vuelve a cero.",
      "El botón Guardar ronda permite cerrar el conteo actual manualmente y consultar debajo cuántas rondas y puntos se llevan.",
      "En Gravedad, la ronda se guarda automáticamente un minuto después de que termina y desaparece la Ballena.",
      "Se eliminaron las sombras grises exteriores del contador flotante y de la Ballena.",
    ],
  },
  {
    version: "1.13.0",
    date: "12 de septiembre de 2026",
    title: "Guardado general del administrador",
    items: [
      "La rueda, los puntos, el objetivo y los tiempos se editan como un único borrador local.",
      "El envío automático por campo fue eliminado para evitar bloqueos mientras el administrador escribe.",
      "Un solo botón Guardar todo publica la configuración general completa para los demás equipos.",
      "La espera y duración activa se configuran en minutos; el retraso previo al próximo contador se configura en milisegundos.",
      "Cuando el programa principal está oculto o minimizado, el contador deja pasar el ratón y oculta sus controles para no interferir con el juego.",
      "El reloj del Riftwalker cambia de tamaño y estilo sin depender del tamaño de la Ballena, para conservar una lectura clara.",
      "Sincronizar con todos publica la fase, la hora absoluta, la espera, la duración activa y la transición al cierre en milisegundos.",
    ],
  },
  {
    version: "1.12.0",
    date: "11 de septiembre de 2026",
    title: "Ballena sin marco y módulos por niveles",
    items: [
      "Lunar vuelve a mostrarse como Lunar en español; el nombre inglés permanece como Lunar Revelry.",
      "Todos los módulos normales muestran Nivel 1–17 y el estado especial se presenta como Brillante.",
      "La Ballena nada desde que entra, continúa moviéndose mientras dispara y conserva el movimiento al retirarse.",
      "El área transparente de la Ballena cambia de tamaño de forma independiente, nunca supera el ancho de la ventana y puede desactivarse.",
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
      "Los módulos normales muestran Nivel 1–17 y las versiones especiales se muestran como Brillante.",
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

function formatDate(value: string, language: "es" | "en" = "es") {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function pointsLabel(points: number, language: "es" | "en" = "es") {
  return `${points} ${language === "en" ? (points === 1 ? "point" : "points") : (points === 1 ? "punto" : "puntos")}`;
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

type PointRoundContext = {
  key: string;
  trackingMode: "solo" | "team";
  actions: PointAction[];
  characterId?: string;
  characterName?: string;
  teamSessionId?: string;
  characterIds?: string[];
};

function pointRoundContexts(state: PersistedState): PointRoundContext[] {
  const solo = state.characters.map((character) => ({
    key: `solo:${character.id}`,
    trackingMode: "solo" as const,
    actions: actionsForCharacter(state.actions, character.id),
    characterId: character.id,
    characterName: character.name,
  }));
  const teamSessionIds = new Set(state.actions.flatMap((action) => action.trackingMode === "team" && action.teamSessionId ? [action.teamSessionId] : []));
  teamSessionIds.add(state.activeTeamSessionId);
  const teams = [...teamSessionIds].map((teamSessionId) => {
    const actions = actionsForTeamSession(state.actions, teamSessionId);
    return {
      key: `team:${teamSessionId}`,
      trackingMode: "team" as const,
      actions,
      teamSessionId,
      characterIds: [...new Set(actions.flatMap(actionCharacterIds))],
    };
  });
  return [...solo, ...teams];
}

function archivePointRounds(state: PersistedState, trigger: PointRoundTrigger, endedAt: string, vision?: Vision, onlyContextKey?: string) {
  const endedAtMs = Date.parse(endedAt);
  if (!Number.isFinite(endedAtMs)) return state;
  const boundaries = { ...state.pointRoundBoundaries };
  const records: PointRoundRecord[] = [];
  for (const context of pointRoundContexts(state)) {
    if (onlyContextKey && context.key !== onlyContextKey) continue;
    const startedAt = boundaries[context.key];
    const startedAtMs = startedAt ? Date.parse(startedAt) : Number.NEGATIVE_INFINITY;
    if (Number.isFinite(startedAtMs) && endedAtMs <= startedAtMs) continue;
    const actions = pointActionsInRound(context.actions, startedAt, endedAt);
    boundaries[context.key] = endedAt;
    if (actions.length === 0) continue;
    records.push({
      id: createId("round"),
      startedAt: startedAt ?? actions[0].occurredAt,
      endedAt,
      trigger,
      points: actions.reduce((sum, action) => sum + action.points, 0),
      claims: actions.length,
      actionIds: actions.map((action) => action.id),
      visionId: vision?.id,
      visionName: vision?.name,
      trackingMode: context.trackingMode,
      characterId: context.characterId,
      characterName: context.characterName,
      teamSessionId: context.teamSessionId,
      characterIds: context.characterIds,
      breakdown: buildPointRoundBreakdown(actions),
    });
  }
  return { ...state, pointRounds: [...records, ...state.pointRounds].slice(0, 2_000), pointRoundBoundaries: boundaries };
}

function pointRoundTriggerLabel(trigger: PointRoundTrigger, language: "es" | "en" = "es") {
  if (trigger === "event-start") return language === "en" ? "Event start" : "Inicio de evento";
  if (trigger === "whale-end") return language === "en" ? "Whale end +1 min" : "Fin de Ballena +1 min";
  return language === "en" ? "Manual save" : "Guardado manual";
}

async function showOverlay(show: boolean) {
  if (!isTauri() || IS_ANDROID) return;
  const overlay = await WebviewWindow.getByLabel("overlay");
  if (!overlay) return;
  if (show) await overlay.show();
  else await overlay.hide();
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const language = state.settings.uiLanguage;
  const english = language === "en";
  const tx = useCallback((spanish: string, englishText: string) => language === "en" ? englishText : spanish, [language]);
  const [tab, setTab] = useState<TabId>("progress");
  const [now, setNow] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState("Catálogo local listo");
  const [toast, setToast] = useState("");
  const [introVisible, setIntroVisible] = useState(true);
  const [homeOverlayConfigOpen, setHomeOverlayConfigOpen] = useState(false);
  const [localSyncInfo, setLocalSyncInfo] = useState<LocalSyncInfo>();
  const [localSyncStatus, setLocalSyncStatus] = useState("Sin conexión local");
  const [localSyncBusy, setLocalSyncBusy] = useState(false);
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
  const personalSyncUpdatedAtRef = useRef(loadPersonalSyncUpdatedAt());
  const personalSyncJsonRef = useRef(JSON.stringify(personalSyncPayload(state)));
  const localSyncInFlightRef = useRef(false);
  const liveRevisionRef = useRef(0);
  const lastLocalExchangeRef = useRef(0);
  const lastMobileUpdateRef = useRef(0);
  const localSyncEnabledRef = useRef(state.settings.localSyncEnabled);
  localSyncEnabledRef.current = state.settings.localSyncEnabled;

  const setHomeOverlayEditing = useCallback((enabled: boolean) => {
    setHomeOverlayConfigOpen(enabled);
    if (isTauri() && !IS_ANDROID) void emit("caja-fantasma-overlay-edit-mode", { enabled });
  }, []);

  const SHINY_MOD_CATALOG = shinyCatalogModule?.SHINY_MOD_CATALOG ?? EMPTY_SHINY_CATALOG;
  const SHINY_MOD_GROUPS = shinyCatalogModule?.SHINY_MOD_GROUPS ?? EMPTY_SHINY_GROUPS;
  const SHINY_MOD_CATALOG_META = shinyCatalogModule?.SHINY_MOD_CATALOG_META ?? { sourceUrl: "", sourceCheckedAt: "", total: 0, legacy: 0, normal: 0, shiny: 0 };
  const defaultShinyMod = SHINY_MOD_CATALOG.find((item) => item.englishName === "Rush Hour <Downstar>" && !item.isCatalogShiny) ?? SHINY_MOD_CATALOG[0];

  const referencePoints = useMemo(() => [...state.manualBaselinePoints], [state.manualBaselinePoints]);
  const personalSyncJson = useMemo(() => JSON.stringify(personalSyncPayload(state)), [state.actions, state.activityHistory, state.boxes, state.pointRounds, state.pointRoundBoundaries, state.manualBaselinePoints, state.shinyMods, state.characters, state.activeCharacterId, state.trackingMode, state.teamMemberIds, state.activeTeamSessionId]);
  const sharedCatalogJson = useMemo(() => JSON.stringify(state.catalog), [state.catalog]);
  const target = clampNumber(state.catalog.boxTargetPoints, 1, 10_000);
  const activeCharacter = state.characters.find((character) => character.id === state.activeCharacterId) ?? state.characters[0];
  const isTeamMode = state.trackingMode === "team" && state.characters.length > 1;
  const activeCharacterActions = useMemo(() => actionsForCharacter(state.actions, activeCharacter.id), [state.actions, activeCharacter.id]);
  const activeTeamActions = useMemo(() => actionsForTeamSession(state.actions, state.activeTeamSessionId), [state.actions, state.activeTeamSessionId]);
  const currentActions = isTeamMode ? activeTeamActions : activeCharacterActions;
  const currentPoints = useMemo(() => currentActions.reduce((sum, action) => sum + action.points, 0), [currentActions]);
  const currentClaims = currentActions.length;
  const currentPointRoundKey = isTeamMode ? `team:${state.activeTeamSessionId}` : `solo:${activeCharacter.id}`;
  const currentPointRoundActions = useMemo(() => pointActionsInRound(currentActions, state.pointRoundBoundaries[currentPointRoundKey]), [currentActions, currentPointRoundKey, state.pointRoundBoundaries]);
  const currentPointRoundPoints = useMemo(() => currentPointRoundActions.reduce((sum, action) => sum + action.points, 0), [currentPointRoundActions]);
  const visiblePointRounds = useMemo(() => state.pointRounds.filter((record) => isTeamMode ? record.trackingMode === "team" : record.trackingMode === "solo" && record.characterId === activeCharacter.id), [activeCharacter.id, isTeamMode, state.pointRounds]);
  const savedPointRoundTotal = useMemo(() => visiblePointRounds.reduce((sum, record) => sum + record.points, 0), [visiblePointRounds]);
  const todayKey = localDateKey(now);
  const activitySummary = useMemo(() => activityHistorySummary(state.activityHistory, new Date(`${todayKey}T12:00:00`)), [state.activityHistory, todayKey]);
  const activityCount = (activity: Activity, vision?: Vision) => activitySummary.ranking.find((item) => item.key === `${vision?.id ?? "pro"}:${activity.id}`) ?? { todayCount: 0, count: 0 };
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
  const publicVisionId = sharedVisionId(state.catalog, state.settings.selectedVisionId);
  const selectedVision = state.catalog.visions.find((vision) => vision.id === publicVisionId) ?? state.catalog.visions.find((vision) => vision.enabled) ?? state.catalog.visions[0];
  const localSyncAddressReady = isValidLocalSyncAddress(state.settings.localSyncAddress);
  const desktopLocalAddress = splitLocalSyncAddress(localSyncInfo?.address ?? "");
  const cycle = computeCycle(state.settings, now);
  const cycleDurationMinutes = cycle.phase === "active" ? state.settings.activeMinutes : state.settings.waitMinutes;
  const cyclePhaseStartedAt = new Date(Date.parse(cycle.phaseEndsAt) - cycleDurationMinutes * 60_000).toISOString();
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

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const acceptLocalSyncSnapshot = useCallback((snapshot: Pick<LocalSyncSnapshot, "updatedAt" | "dataJson">, force = false) => {
    const remoteUpdatedAt = Date.parse(snapshot.updatedAt);
    const localUpdatedAt = Date.parse(personalSyncUpdatedAtRef.current);
    if (!Number.isFinite(remoteUpdatedAt) || (!force && Number.isFinite(localUpdatedAt) && remoteUpdatedAt <= localUpdatedAt)) return false;
    if (personalSyncJsonRef.current === snapshot.dataJson) {
      if (remoteUpdatedAt > localUpdatedAt) {
        personalSyncUpdatedAtRef.current = snapshot.updatedAt;
        savePersonalSyncUpdatedAt(snapshot.updatedAt);
      }
      return false;
    }
    const value = JSON.parse(snapshot.dataJson) as unknown;
    setState((current) => {
      const synchronized = applyPersonalSyncPayload(current, value);
      personalSyncJsonRef.current = JSON.stringify(personalSyncPayload(synchronized));
      personalSyncUpdatedAtRef.current = snapshot.updatedAt;
      savePersonalSyncUpdatedAt(snapshot.updatedAt);
      return synchronized;
    });
    return true;
  }, []);

  const acceptLocalSyncCatalog = useCallback((catalogJson?: string) => {
    if (!catalogJson) return;
    const catalog = JSON.parse(catalogJson) as unknown;
    if (!validateCatalog(catalog)) throw new Error(tx("El PC devolvió un catálogo público inválido.", "The PC returned an invalid public catalog."));
    setState((current) => applyRemoteCatalog(current, catalog));
  }, [tx]);

  const exchangeWithComputer = useCallback(async (action: LocalSyncAction, showBusy = true) => {
    if (!IS_ANDROID || !isTauri() || localSyncInFlightRef.current) return;
    const address = state.settings.localSyncAddress.trim();
    const pairingCode = state.settings.localSyncCode.trim();
    if (!isValidLocalSyncAddress(address) || !/^\d{6}$/.test(pairingCode)) {
      setLocalSyncStatus(tx("Completa la IP, el puerto y el código de 6 números que muestra el PC", "Enter the PC IP, port, and six-digit code"));
      return;
    }
    localSyncInFlightRef.current = true;
    if (showBusy) setLocalSyncBusy(true);
    try {
      const exchange = await invoke<LocalSyncExchange>("mobile_sync_exchange", {
        address,
        pairingCode,
        action,
        knownRevision: action === "live" ? liveRevisionRef.current : 0,
        dataJson: action === "push" || action === "live" ? personalSyncJsonRef.current : "{}",
        updatedAt: action === "push" || action === "live" ? personalSyncUpdatedAtRef.current : "1970-01-01T00:00:00.000Z",
      });
      if (action !== "status") liveRevisionRef.current = exchange.revision;
      acceptLocalSyncCatalog(exchange.catalogJson);
      if (action === "pull") {
        const receivedChanges = acceptLocalSyncSnapshot(exchange, true);
        setLocalSyncStatus(receivedChanges ? tx("Datos del PC copiados al celular", "PC data copied to this phone") : tx("El celular ya tenía los mismos datos del PC", "The phone already had the same PC data"));
      } else if (action === "push") {
        setLocalSyncStatus(tx("Datos del celular copiados al PC", "Phone data copied to the PC"));
      } else if (action === "live") {
        const receivedChanges = acceptLocalSyncSnapshot(exchange, true);
        setLocalSyncStatus(receivedChanges ? tx("Cambios del PC recibidos en vivo", "PC changes received live") : tx("Sincronización en vivo · datos al día", "Live sync · data up to date"));
      } else {
        setLocalSyncStatus(tx("PC conectado · catálogo público al día", "PC connected · public catalog up to date"));
      }
    } catch (error) {
      setLocalSyncStatus(error instanceof Error ? error.message : String(error));
    } finally {
      localSyncInFlightRef.current = false;
      if (showBusy) setLocalSyncBusy(false);
    }
  }, [acceptLocalSyncCatalog, acceptLocalSyncSnapshot, state.settings.localSyncAddress, state.settings.localSyncCode, tx]);

  useEffect(() => {
    if (personalSyncJsonRef.current !== personalSyncJson) {
      personalSyncJsonRef.current = personalSyncJson;
      const updatedAt = new Date().toISOString();
      personalSyncUpdatedAtRef.current = updatedAt;
      savePersonalSyncUpdatedAt(updatedAt);
    }
    if (!IS_ANDROID && isTauri() && state.settings.localSyncEnabled) {
      void invoke("update_local_sync_state", {
        dataJson: personalSyncJsonRef.current,
        updatedAt: personalSyncUpdatedAtRef.current,
        catalogJson: sharedCatalogJson,
        liveEnabled: state.settings.localSyncLiveEnabled,
      }).catch(() => undefined);
    }
  }, [personalSyncJson, sharedCatalogJson, state.settings.localSyncEnabled, state.settings.localSyncLiveEnabled]);

  useEffect(() => {
    if (IS_ANDROID || !isTauri() || !state.settings.localSyncEnabled) {
      setLocalSyncInfo(undefined);
      return;
    }
    let active = true;
    const pairingCode = state.settings.localSyncCode;
    if (!/^\d{6}$/.test(pairingCode)) {
      setLocalSyncStatus(tx("No se pudo iniciar: el código de conexión no es válido", "Could not start: the connection code is invalid"));
      return;
    }
    const start = async () => {
      try {
        const info = await invoke<LocalSyncInfo>("start_local_sync", {
          pairingCode,
          dataJson: personalSyncJsonRef.current,
          updatedAt: personalSyncUpdatedAtRef.current,
          catalogJson: sharedCatalogJson,
          liveEnabled: state.settings.localSyncLiveEnabled,
        });
        if (!active) {
          if (!localSyncEnabledRef.current) void invoke("stop_local_sync").catch(() => undefined);
          return;
        }
        setLocalSyncInfo(info);
        setLocalSyncStatus(tx(`Esperando al celular en ${info.address}`, `Waiting for the phone at ${info.address}`));
      } catch (error) {
        if (active) setLocalSyncStatus(error instanceof Error ? error.message : String(error));
      }
    };
    void start();
    const timer = window.setInterval(() => {
      if (!active) return;
      void invoke<LocalSyncSnapshot>("read_local_sync_state")
        .then((snapshot) => {
          if (!active) return;
          const hasMobileUpdate = snapshot.lastMobileUpdateAt > lastMobileUpdateRef.current;
          if (hasMobileUpdate) lastMobileUpdateRef.current = snapshot.lastMobileUpdateAt;
          const receivedChanges = hasMobileUpdate ? acceptLocalSyncSnapshot(snapshot, true) : false;
          if (receivedChanges) setLocalSyncStatus(tx("Datos nuevos recibidos del celular", "New data received from the phone"));
          else if (snapshot.lastExchangeAt > lastLocalExchangeRef.current) setLocalSyncStatus(tx("Celular conectado · datos al día", "Phone connected · data up to date"));
          lastLocalExchangeRef.current = Math.max(lastLocalExchangeRef.current, snapshot.lastExchangeAt);
        })
        .catch(() => undefined);
    }, 1_500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [acceptLocalSyncSnapshot, sharedCatalogJson, state.settings.localSyncCode, state.settings.localSyncEnabled, state.settings.localSyncLiveEnabled, tx]);

  useEffect(() => {
    if (IS_ANDROID || !isTauri() || state.settings.localSyncEnabled) return;
    setLocalSyncInfo(undefined);
    void invoke("stop_local_sync").catch(() => undefined);
  }, [state.settings.localSyncEnabled]);

  useEffect(() => {
    if (!IS_ANDROID || !state.settings.localSyncEnabled) return;
    const action: LocalSyncAction = state.settings.localSyncLiveEnabled ? "live" : "status";
    if (!state.settings.localSyncLiveEnabled) liveRevisionRef.current = 0;
    void exchangeWithComputer(action, false);
    const timer = window.setInterval(() => void exchangeWithComputer(action, false), state.settings.localSyncLiveEnabled ? 1_500 : 5_000);
    return () => window.clearInterval(timer);
  }, [exchangeWithComputer, state.settings.localSyncEnabled, state.settings.localSyncLiveEnabled]);

  const checkCreatorAccess = useCallback(async () => {
    if (IS_ANDROID) {
      setCreatorAccess("locked");
      setCreatorMessage("La edición y publicación del catálogo se realizan desde el instalador de Windows del propietario.");
      return;
    }
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
    if (isTauri() && !IS_ANDROID) void listen("caja-fantasma-overlay-disabled", receiveOverlayChange).then((stop) => { stopListening = stop; });
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
    if (tab !== "progress" && homeOverlayConfigOpen) setHomeOverlayEditing(false);
  }, [homeOverlayConfigOpen, setHomeOverlayEditing, tab]);

  useEffect(() => () => {
    if (isTauri() && !IS_ANDROID) void emit("caja-fantasma-overlay-edit-mode", { enabled: false });
  }, []);

  useEffect(() => {
    void showOverlay(state.settings.overlayEnabled);
  }, [state.settings.overlayEnabled]);

  useEffect(() => {
    if (cycle.phase !== "active" || state.settings.lastPointRoundEventStartedAt === cyclePhaseStartedAt) return;
    commitState((current) => {
      if (current.settings.lastPointRoundEventStartedAt === cyclePhaseStartedAt) return current;
      const archived = archivePointRounds(current, "event-start", cyclePhaseStartedAt, selectedVision);
      return { ...archived, settings: { ...archived.settings, lastPointRoundEventStartedAt: cyclePhaseStartedAt } };
    });
  }, [commitState, cycle.phase, cyclePhaseStartedAt, selectedVision, state.settings.lastPointRoundEventStartedAt]);

  useEffect(() => {
    if (cycle.phase !== "waiting" || selectedVision?.id !== "gravity" || state.settings.lastWhalePointRoundWaitStartedAt === cyclePhaseStartedAt) return;
    const saveAtMs = Date.parse(cyclePhaseStartedAt) + 6 * 60_000;
    if (now < saveAtMs) return;
    const saveAt = new Date(saveAtMs).toISOString();
    commitState((current) => {
      if (current.settings.lastWhalePointRoundWaitStartedAt === cyclePhaseStartedAt) return current;
      const archived = archivePointRounds(current, "whale-end", saveAt, selectedVision);
      return { ...archived, settings: { ...archived.settings, lastWhalePointRoundWaitStartedAt: cyclePhaseStartedAt } };
    });
  }, [commitState, cycle.phase, cyclePhaseStartedAt, now, selectedVision, state.settings.lastWhalePointRoundWaitStartedAt]);

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
    if (!silent) setSyncStatus(tx("Buscando catálogo público…", "Checking the public catalog…"));
    try {
      const catalog = await fetchPublicCatalog();
      if (!validateCatalog(catalog)) throw new Error(tx("formato no válido", "invalid format"));
      setState((current) => applyRemoteCatalog(current, catalog));
      setSyncStatus(tx(
        `Catálogo v${catalog.catalogVersion} comprobado · ${catalog.eventTiming?.waitMinutes ?? "—"}/${catalog.eventTiming?.activeMinutes ?? "—"} min · ${resolveTransitionDelayMilliseconds(catalog.eventTiming)} ms`,
        `Catalog v${catalog.catalogVersion} checked · ${catalog.eventTiming?.waitMinutes ?? "—"}/${catalog.eventTiming?.activeMinutes ?? "—"} min · ${resolveTransitionDelayMilliseconds(catalog.eventTiming)} ms`,
      ));
    } catch (error) {
      setSyncStatus(tx("Sin conexión · usando catálogo local", "Offline · using local catalog"));
      if (!silent) console.info("No se pudo sincronizar el catálogo", error);
    }
  }, [tx]);

  useEffect(() => {
    void syncCatalog(true);
    const timer = window.setInterval(() => {
      void syncCatalog(true);
    }, 30_000);
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
    if (!isTauri() || IS_ANDROID) return;
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
    const historyRecord: ActivityHistoryRecord = {
      id: action.id,
      activityId: action.activityId,
      activityName: action.activityName,
      visionId: action.visionId,
      visionName: action.visionName,
      points: action.points,
      count: 1,
      occurredAt: action.occurredAt,
    };
    commitState((current) => ({ ...current, actions: [...current.actions, action], activityHistory: [...current.activityHistory, historyRecord].slice(-100_000) }));
    setToast(isTeamMode ? `+${activity.points} para ${state.teamMemberIds.length} personajes · ${activity.name}` : `+${activity.points} · ${activity.name}`);
    window.setTimeout(() => setToast(""), 1800);
  };

  const removeActionFromCurrentTracking = (actionId: string) => {
    commitState((current) => {
      const actions = isTeamMode
        ? current.actions.filter((action) => action.id !== actionId)
        : detachCharacterFromActions(current.actions, activeCharacter.id, new Set([actionId]));
      const activityHistory = actions.some((action) => action.id === actionId) ? current.activityHistory : current.activityHistory.filter((record) => record.id !== actionId);
      return { ...current, actions, activityHistory };
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

  const saveCurrentPointRound = () => {
    if (currentPointRoundActions.length === 0) return;
    const endedAt = new Date().toISOString();
    commitState((current) => archivePointRounds(current, "manual", endedAt, selectedVision, currentPointRoundKey));
    setToast(`Ronda guardada con ${currentPointRoundPoints} ${currentPointRoundPoints === 1 ? "punto" : "puntos"}; el conteo parcial vuelve a 0`);
    window.setTimeout(() => setToast(""), 2800);
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
    const timing = catalog.eventTiming;
    commitState((current) => ({
      ...current,
      catalog,
      settings: {
        ...current.settings,
        selectedVisionId: sharedVisionId(catalog, current.settings.selectedVisionId),
        ...(timing ? {
          waitMinutes: timing.waitMinutes,
          activeMinutes: timing.activeMinutes,
          transitionDelayMilliseconds: resolveTransitionDelayMilliseconds(timing, current.settings.transitionDelayMilliseconds),
          phaseStartedAt: timing.phaseStartedAt,
          phase: timing.phase,
          sharedTimingUpdatedAt: timing.updatedAt,
          lastNotificationPhaseStartedAt: undefined,
          lastVoiceAlertPhaseStartedAt: undefined,
        } : {}),
      },
    }));
    setSyncStatus(`Configuración general v${catalog.catalogVersion} publicada`);
  }, [commitState]);

  const publishCatalog = useCallback(async (catalog: Catalog) => {
    if (!isTauri() || IS_ANDROID) throw new Error("La publicación solo está disponible en la aplicación de escritorio del propietario.");
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
      eventTiming: sharedEventTimingFromSettings(sharedSettings, updatedAt, AUTHOR),
    };
    try {
      setToast("Publicando fase, tiempos y transición para todos…");
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
    if (!isTauri() || IS_ANDROID) return;
    if (enabled) await enable();
    else await disable();
  };

  const openRepository = () => {
    if (isTauri() && !IS_ANDROID) void openUrl(REPOSITORY_URL);
    else window.open(REPOSITORY_URL, "_blank", "noopener,noreferrer");
  };

  const openAndroidDownload = () => {
    if (isTauri() && !IS_ANDROID) void openUrl(ANDROID_APK_URL);
    else window.open(ANDROID_APK_URL, "_blank", "noopener,noreferrer");
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
      {introVisible && <StartupIntro language={language} onSkip={() => setIntroVisible(false)} />}
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><GameLogoMark /></div>
          <div><strong>Caja Fantasma</strong><span>Once Human · v{APP_VERSION}</span></div>
        </div>

        <nav aria-label={tx("Navegación principal", "Main navigation")}>
          {visibleTabs.map(({ id, es, en, icon: Icon }) => (
            <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={19} /><span>{english ? en : es}</span>{tab === id && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className={syncStatus.startsWith("Sin") ? "offline" : "online"}>
            {syncStatus.startsWith("Sin") ? <WifiOff size={14} /> : <Wifi size={14} />}
            {syncStatus}
          </span>
          <button type="button" onClick={() => void syncCatalog()}><RefreshCw size={14} /> {tx("Sincronizar", "Sync")}</button>
        </div>

        <button type="button" className="author-card" onClick={openRepository}>
          <Github size={21} />
          <span><small>{tx("Creado por", "Created by")}</small><strong>{AUTHOR}</strong></span>
          <ExternalLink size={14} />
        </button>
      </aside>

      <main>
        <header className={`topbar vision-${selectedVision?.id ?? "none"} ${cycle.phase}`}>
          <VisionAtmosphere visionId={selectedVision?.id} active={cycle.phase === "active"} />
          <div className="topbar-copy">
            <span className="eyebrow">{tab === "progress" ? tx("SEGUIMIENTO ACTUAL", "CURRENT TRACKING") : tab === "characters" ? tx("PERFILES DE JUEGO", "GAME PROFILES") : tab === "vision" ? tx("RUEDA VISIONAL", "VISIONAL WHEEL") : tab === "devices" ? tx("PC Y ANDROID", "PC AND ANDROID") : tab === "history" ? tx("REGISTRO PERSONAL", "PERSONAL RECORD") : tab === "shiny" ? tx("COLECCIÓN DE MÓDULOS", "MOD COLLECTION") : tab === "changes" ? tx("NOVEDADES", "WHAT'S NEW") : tx("PREFERENCIAS", "PREFERENCES")}</span>
            <h1>{TABS.find((item) => item.id === tab)?.[language]}</h1>
          </div>
          <div className={`phase-chip ${cycle.phase} ${transition.active ? "transitioning" : ""}`}>
            <span className="pulse" />
            <div><small>{transition.active ? tx("Preparando próximo contador", "Preparing next countdown") : cycle.phase === "active" ? `${english ? selectedVision?.englishName || selectedVision?.name || "Vision" : selectedVision?.name ?? "Visión"} ${tx("activa", "active")}` : tx("Próxima activación", "Next activation")}</small><strong>{formatDuration(overlayDisplayMs)}</strong></div>
          </div>
        </header>

        {tab === "progress" && (
          <section className="page progress-page">
            {state.characters.length > 1 && <article className="character-dashboard panel">
              <div className="character-dashboard-top">
                <div><span className="eyebrow"><Users size={15} /> {tx("PERSONAJES", "CHARACTERS")}</span><h2>{isTeamMode ? tx("Registro compartido del equipo", "Shared team tracking") : `${tx("Jugando con", "Playing as")} ${activeCharacter.name}`}</h2></div>
                <div className="tracking-mode-switch" aria-label={tx("Modo de registro", "Tracking mode")}>
                  <button type="button" className={!isTeamMode ? "selected" : ""} onClick={() => setTrackingMode("solo")}><UserRound size={16} /> {tx("Solitario", "Solo")}</button>
                  <button type="button" className={isTeamMode ? "selected team" : ""} onClick={() => setTrackingMode("team")}><Users size={16} /> {tx("Equipo", "Team")}</button>
                </div>
              </div>
              <div className="character-progress-list">
                {characterSummaries.map((summary) => {
                  const selected = isTeamMode ? state.teamMemberIds.includes(summary.character.id) : summary.character.id === activeCharacter.id;
                  return <button type="button" key={summary.character.id} className={selected ? "selected" : ""} onClick={() => isTeamMode ? toggleTeamMember(summary.character.id) : selectCharacter(summary.character.id)}>
                    <span className="character-avatar"><UserRound size={17} /></span>
                    <span className="character-progress-copy"><strong>{summary.character.name}</strong><small>{summary.points} {tx("puntos", "points")} · {summary.chance.toFixed(1)}% {tx("estimado", "estimated")}</small><span className="character-progress-track"><i style={{ width: `${Math.min(100, Math.round((summary.points / target) * 100))}%` }} /></span></span>
                    {isTeamMode && <span className={`team-member-check ${selected ? "selected" : ""}`}>{selected ? <Check size={14} /> : <Plus size={14} />}</span>}
                  </button>;
                })}
              </div>
              {isTeamMode && <div className={`team-guidance ${teamReady ? "ready" : "warning"}`}><Users size={17} /><span><strong>{state.teamMemberIds.length} {tx("personajes en este equipo.", "characters on this team.")}</strong>{teamReady ? tx(" Cada recompensa se suma una vez a todos los seleccionados.", " Each reward is added once to every selected character.") : tx(" Selecciona al menos dos para comenzar.", " Select at least two to begin.")}</span><button type="button" className="secondary compact" onClick={startNewTeamCount}><RotateCcw size={15} /> {tx("Nuevo conteo en 0", "New count at 0")}</button></div>}
            </article>}

            <div className="hero-grid">
              <article className="progress-hero panel">
                <div className="hero-copy">
                  <span className="eyebrow"><Sparkles size={14} /> {isTeamMode ? tx("CONTEO DE EQUIPO", "TEAM COUNT") : `${tx("INTENTO", "ATTEMPT")} · ${activeCharacter.name}`}</span>
                  <h2>{currentPoints}<small> / {target} {tx("puntos", "points")}</small></h2>
                  <p>{isTeamMode ? `${currentClaims} ${english ? (currentClaims === 1 ? "shared reward" : "shared rewards") : (currentClaims === 1 ? "recompensa compartida" : "recompensas compartidas")}. ${tx("Se suman al intento individual de cada integrante.", "They are added to every member's individual attempt.")}` : `${currentClaims} ${english ? (currentClaims === 1 ? "claimed reward" : "claimed rewards") : (currentClaims === 1 ? "recompensa reclamada" : "recompensas reclamadas")}. ${tx("La caja puede salir antes: regístrala cuando aparezca.", "The crate may drop early: record it when it appears.")}`}</p>
                  <div className="progress-track" role="progressbar" aria-label="Progreso del intento" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(currentPoints, target)}>
                    <span style={{ width: `${targetProgress}%` }} />
                  </div>
                  <div className="hero-actions">
                    {!isTeamMode && <button type="button" className="primary" disabled={currentActions.length === 0} onClick={() => markBox("normal")}><Box size={19} /> {tx("¡Salió la caja!", "The crate dropped!")}</button>}
                    {!isTeamMode && <button type="button" className="secondary platform-mail-button" disabled={currentActions.length === 0} onClick={() => markBox("platform-mail")}><Mail size={18} /> {tx("Llegó por Plataformas", "Platforms mail arrived")}</button>}
                    {isTeamMode && <button type="button" className="primary" onClick={startNewTeamCount}><Users size={18} /> {tx("Nuevo conteo de Equipo", "New Team count")}</button>}
                    <button type="button" className="secondary" disabled={currentActions.length === 0} onClick={undoLastAction}><Undo2 size={18} /> {tx("Deshacer último", "Undo last")}</button>
                    <button type="button" className={`secondary overlay-home-button ${state.settings.overlayEnabled ? "enabled" : ""}`} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))}><Eye size={18} /> {state.settings.overlayEnabled ? tx("Quitar ventana flotante", "Remove floating overlay") : tx("Agregar ventana flotante", "Add floating overlay")}</button>
                  </div>
                  <section className="point-round-history" aria-label="Historial de rondas de puntos">
                    <header>
                      <div><span>{tx("RONDA ACTUAL", "CURRENT ROUND")}</span><strong>{pointsLabel(currentPointRoundPoints, language)}</strong><small>{currentPointRoundActions.length} {english ? (currentPointRoundActions.length === 1 ? "reward" : "rewards") : (currentPointRoundActions.length === 1 ? "recompensa" : "recompensas")} {tx("desde el último guardado", "since the last save")}</small></div>
                      <button type="button" className="secondary compact" disabled={currentPointRoundActions.length === 0} onClick={saveCurrentPointRound}><Save size={15} /> {tx("Guardar ronda", "Save round")}</button>
                    </header>
                    <div className="point-round-totals"><span><strong>{visiblePointRounds.length}</strong> {visiblePointRounds.length === 1 ? "ronda guardada" : "rondas guardadas"}</span><span><strong>{savedPointRoundTotal}</strong> {savedPointRoundTotal === 1 ? "punto registrado" : "puntos registrados"}</span></div>
                    {visiblePointRounds.length > 0 && <div className="point-round-list">
                      {visiblePointRounds.slice(0, 5).map((record, index) => <article key={record.id}>
                        <span>#{visiblePointRounds.length - index}</span>
                        <strong>{record.points} pts</strong>
                        <small>{record.claims} {english ? (record.claims === 1 ? "reward" : "rewards") : (record.claims === 1 ? "recompensa" : "recompensas")} · {pointRoundTriggerLabel(record.trigger, language)} · {new Date(record.endedAt).toLocaleString(english ? "en-US" : "es-CO", { dateStyle: "short", timeStyle: "short" })}</small>
                      </article>)}
                    </div>}
                  </section>
                </div>
                <div className="ghost-orbit" aria-hidden="true"><div className="orbital-ring" /><img className="ghost-crate-image" src={PHANTOM_CRATE_IMAGE} alt="" /><div className="once-human-wordmark"><span>ONCE</span><strong>HUMAN</strong></div><Sparkles className="spark-one" /><Sparkles className="spark-two" /></div>
              </article>

              <article className="chance-card panel">
                <span className="eyebrow"><BarChart3 size={14} /> {tx("ESTIMACIÓN OBSERVADA", "OBSERVED ESTIMATE")}</span>
                <strong className="chance-value">{displayedChance.toFixed(1)}%</strong>
                <p>{isTeamMode ? tx("Promedio del porcentaje individual de los personajes seleccionados. Cada uno conserva su propio intento.", "Average individual percentage of the selected characters. Each keeps a separate attempt.") : tx("Probabilidad acumulada estimada únicamente con tus valores manuales y las cajas de este personaje.", "Estimated cumulative probability based only on your manual values and this character's crates.")}</p>
                    <div className="mini-stats"><span><small>{tx("Promedio", "Average")}</small><strong>{stats.count ? stats.average.toFixed(1) : "—"}</strong></span><span><small>{tx("Muestras", "Samples")}</small><strong>{stats.count}</strong></span></div>
              </article>
            </div>

            <section className="activity-insights-grid" aria-label={tx("Estadísticas de recompensas", "Reward statistics")}>
              <article className="daily-points-panel panel">
                <div className="panel-title"><div><span className="eyebrow"><Clock3 size={14} /> {tx("PUNTUACIÓN POR DÍA", "POINTS BY DAY")}</span><h2>{tx("Actividad de hoy", "Today's activity")}</h2></div><span className="daily-date-badge">{new Date(`${todayKey}T12:00:00`).toLocaleDateString(english ? "en-US" : "es-CO", { day: "2-digit", month: "short" })}</span></div>
                <div className="daily-score-cards"><span><small>{tx("Puntos de hoy", "Points today")}</small><strong>{activitySummary.today.points}</strong></span><span><small>{tx("Jefes y recompensas", "Bosses and rewards")}</small><strong>{activitySummary.today.count}</strong></span><span><small>{tx("Puntos históricos", "All-time points")}</small><strong>{activitySummary.totalPoints}</strong></span><span><small>{tx("Registros históricos", "All-time records")}</small><strong>{activitySummary.totalCount}</strong></span></div>
                {activitySummary.days.length > 0 ? <div className="daily-history-list">{activitySummary.days.slice(0, 7).map((day) => <div key={day.date}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(english ? "en-US" : "es-CO", { weekday: "short", day: "2-digit", month: "short" })}</span><strong>{day.points} pts</strong><small>{day.count} {tx("actividades", "activities")}</small></div>)}</div> : <p className="empty-inline">{tx("El primer registro de actividad creará el resumen diario.", "Your first activity will create the daily summary.")}</p>}
              </article>
              <article className="activity-ranking-panel panel">
                <div className="panel-title"><div><span className="eyebrow"><Trophy size={14} /> {tx("RANKING HISTÓRICO", "ALL-TIME RANKING")}</span><h2>{tx("Lo que más has realizado", "Your most completed activities")}</h2></div><span>{activitySummary.ranking.length}</span></div>
                {activitySummary.ranking.length > 0 ? <div className="activity-ranking-list">{activitySummary.ranking.slice(0, 12).map((item, index) => <div key={item.key}><span className="ranking-position">#{index + 1}</span><span className="ranking-name"><strong>{item.name}</strong><small>{tx("Hoy", "Today")} {item.todayCount} · {item.points} pts</small></span><strong className="ranking-count">{item.count}×</strong></div>)}</div> : <p className="empty-inline">{tx("Todavía no hay jefes ni recompensas para ordenar.", "There are no bosses or rewards to rank yet.")}</p>}
              </article>
            </section>

            {!IS_ANDROID && <article className={`home-overlay-controls panel ${homeOverlayConfigOpen ? "expanded" : ""}`}>
              <div><span className="eyebrow"><MonitorUp size={15} /> {tx("VENTANA FLOTANTE", "FLOATING OVERLAY")}</span><h2>{tx("Configurar ventana", "Configure overlay")}</h2><p>{tx("Todos los tamaños y estilos están aquí en Caja para que la pestaña Visión muestre solamente las ruedas publicadas.", "All sizes and styles are configured here so the Visional Wheel page only shows published wheels.")}</p></div>
              <div className="home-overlay-actions">
                <button type="button" className="secondary" aria-expanded={homeOverlayConfigOpen} aria-controls="home-overlay-size-panel" onClick={() => setHomeOverlayEditing(!homeOverlayConfigOpen)}><Settings2 size={17} /> {homeOverlayConfigOpen ? tx("Terminar ajuste", "Finish editing") : tx("Abrir configuración", "Open settings")}</button>
                <button type="button" className={`secondary overlay-home-button ${state.settings.overlayEnabled ? "enabled" : ""}`} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))}><Eye size={18} /> {state.settings.overlayEnabled ? tx("Quitar ventana", "Remove overlay") : tx("Agregar ventana", "Add overlay")}</button>
              </div>
              {homeOverlayConfigOpen && <div id="home-overlay-size-panel" className="home-overlay-size-panel">
                <div className={`mock-overlay ${cycle.phase} vision-${selectedVision?.id ?? "none"} shape-${state.settings.overlayShape} counter-${state.settings.overlayCounterStyle}`}><span>{transition.active ? "Preparando próximo contador" : cycle.phase === "active" ? `${overlayDisplayName} activa` : `Próxima ${overlayDisplayName}`}</span><strong>{overlayDisplayTimer}</strong></div>
                <div className="overlay-style-config">
                  <label>{tx("Forma", "Shape")}<select value={state.settings.overlayShape} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayShape: event.target.value as OverlayShape } }))}><option value="event">{tx("Automática por evento", "Automatic by event")}</option><option value="rectangle">{tx("Rectangular", "Rectangle")}</option><option value="square">{tx("Cuadrada", "Square")}</option><option value="vertical">{tx("Vertical", "Vertical")}</option><option value="round">{tx("Redonda", "Round")}</option></select></label>
                  <label>{tx("Estilo del contador", "Countdown style")}<select value={state.settings.overlayCounterStyle} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayCounterStyle: event.target.value as OverlayCounterStyle } }))}><option value="digital">Digital</option><option value="compact">{tx("Compacto", "Compact")}</option><option value="ring">{tx("Anillo de progreso", "Progress ring")}</option></select></label>
                  <label>{tx("Nombre del evento", "Event name")}<select value={state.settings.overlayNameMode} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayNameMode: event.target.value as OverlayNameMode } }))}><option value="spanish">Español</option><option value="english">English</option><option value="custom">{tx("Personalizado", "Custom")}</option></select></label>
                  {state.settings.overlayNameMode === "custom" && <label>{tx("Tu nombre", "Custom name")}<input maxLength={40} value={state.settings.overlayCustomName} placeholder={tx("Ej. Gravedad azul", "E.g. Blue Gravity")} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayCustomName: event.target.value.slice(0, 40) } }))} /></label>}
                </div>
                <label className="overlay-size-control"><span>{tx("Ventana", "Overlay")} <strong>{Math.round(state.settings.overlayScale * 100)}%</strong></span><input type="range" min={20} max={150} step={5} value={Math.round(state.settings.overlayScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayScale: clampNumber(Number(event.target.value) / 100, .2, 1.5) } }))} /></label>
                <label className="overlay-size-control"><span>{tx("Área de Ballena", "Whale area")} <strong>{Math.round(state.settings.overlayAddonScale * 100)}%</strong></span><input type="range" min={20} max={100} step={5} value={Math.round(state.settings.overlayAddonScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayAddonScale: clampNumber(Number(event.target.value) / 100, .2, 1) } }))} /></label>
                {state.settings.overlayWhaleShowTime && <>{state.settings.overlayWhaleCounterStyle !== "beam" && <label className="overlay-size-control"><span>Tiempo sobre el rayo <strong>{Math.round(state.settings.overlayWhaleCounterScale * 100)}%</strong></span><input type="range" min={20} max={150} step={5} value={Math.round(state.settings.overlayWhaleCounterScale * 100)} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleCounterScale: clampNumber(Number(event.target.value) / 100, .2, 1.5) } }))} /></label>}
                <label className="overlay-size-control"><span>Estilo del tiempo</span><select value={state.settings.overlayWhaleCounterStyle} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleCounterStyle: event.target.value as WhaleCounterStyle } }))}><option value="digital">Digital</option><option value="compact">Compacto</option><option value="ring">Anillo</option><option value="beam">Solo rayo</option></select></label></>}
                <div className="overlay-addon-option"><span><strong>Mostrar tiempo de Ballena</strong><small>Si lo desactivas, permanece solamente el Riftwalker con su rayo de progreso.</small></span><button type="button" className={`switch ${state.settings.overlayWhaleShowTime ? "on" : ""}`} aria-label="Mostrar tiempo sobre el rayo de Ballena" aria-pressed={state.settings.overlayWhaleShowTime} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleShowTime: !current.settings.overlayWhaleShowTime } }))}><span /></button></div>
                <div className="overlay-addon-option"><span><strong>Ballena y rayo</strong><small>Puede ocultarse por completo sin desactivar el contador principal.</small></span><button type="button" className={`switch ${state.settings.overlayWhaleEnabled ? "on" : ""}`} aria-label="Mostrar Ballena y rayo" aria-pressed={state.settings.overlayWhaleEnabled} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleEnabled: !current.settings.overlayWhaleEnabled } }))}><span /></button></div>
              </div>}
            </article>}

            <div className="section-heading"><div><span className="eyebrow">{tx("RECOMPENSAS PRO", "PRO REWARDS")}</span><h2>{tx("Suma lo que reclames", "Add each claimed reward")}</h2></div><span>{tx("Solo las recompensas completadas cuentan", "Only completed rewards count")}</span></div>
            <div className="activity-grid">
              {state.catalog.proActivities.map((activity) => <ActivityCard
                key={activity.id}
                language={language}
                activity={activity}
                disabled={!teamReady}
                currentCount={currentPointRoundActions.filter((action) => !action.visionId && action.activityId === activity.id).length}
                dailyCount={activityCount(activity).todayCount}
                totalCount={activityCount(activity).count}
                onAdd={() => addActivity(activity)}
                onRemove={() => removeLastActivity(activity.id)}
              />)}
            </div>

            <div className="section-heading"><div><span className="eyebrow">{tx("VISIÓN SELECCIONADA POR EL ADMINISTRADOR", "ADMINISTRATOR-SELECTED WHEEL")}</span><h2>{selectedVision ? (english ? selectedVision.englishName || selectedVision.name : selectedVision.name) : tx("Sin visión", "No wheel")}</h2></div><button type="button" className="link-button" onClick={() => setTab("vision")}>{tx("Ver contador", "View countdown")} <ChevronRight size={15} /></button></div>
            <div className="activity-grid">
              {selectedVision?.activities.length ? selectedVision.activities.map((activity) => <ActivityCard
                key={activity.id}
                language={language}
                activity={activity}
                disabled={!selectedVision.enabled || !teamReady}
                currentCount={currentPointRoundActions.filter((action) => action.visionId === selectedVision.id && action.activityId === activity.id).length}
                dailyCount={activityCount(activity, selectedVision).todayCount}
                totalCount={activityCount(activity, selectedVision).count}
                onAdd={() => addActivity(activity, selectedVision)}
                onRemove={() => removeLastActivity(activity.id, selectedVision.id)}
              />) : <div className="empty-card"><Sparkles size={28} /><strong>Aún no hay recompensas para {selectedVision?.name}</strong><span>Puedes añadirlas en Configuración y publicarlas para todos.</span></div>}
            </div>

            {breakdown.length > 0 && <article className="attempt-log panel">
              <div className="panel-title"><div><span className="eyebrow">DESGLOSE</span><h3>{isTeamMode ? "Conteo actual del equipo" : `Intento de ${activeCharacter.name}`}</h3></div><button type="button" className="danger-quiet" onClick={resetAttempt}><RotateCcw size={16} /> {isTeamMode ? "Nuevo conteo" : "Reiniciar"}</button></div>
              {breakdown.map((item) => <div className="log-row" key={item.name}><span>{item.name}<small>{item.count}× {tx("reclamado", "claimed")}</small></span><strong>{pointsLabel(item.points, language)}</strong></div>)}
            </article>}
          </section>
        )}

        {tab === "vision" && (
          <section className="page vision-page">
            <div className="section-heading public-wheels-heading"><div><span className="eyebrow"><RadioTower size={15} /> {tx("RUEDAS PUBLICADAS", "PUBLISHED WHEELS")}</span><h2>{tx("Ruedas Visionales", "Visional Wheels")}</h2><p>{tx("OscarD0823 selecciona la rueda y sincroniza su estado para todos.", "OscarD0823 selects the wheel and synchronizes its status for everyone.")}</p></div></div>
            <div className="public-vision-grid">
              {state.catalog.visions.map((vision) => {
                const selected = vision.id === selectedVision?.id;
                const publicState = selected ? transition.active ? tx("CAMBIO DE FASE", "PHASE CHANGE") : cycle.phase === "active" ? tx("EVENTO ACTIVO", "ACTIVE EVENT") : tx("PRÓXIMA RUEDA", "NEXT WHEEL") : tx("OTRA RUEDA", "OTHER WHEEL");
                return <article key={vision.id} className={`public-wheel-card panel theme-${visionVisualTheme(vision)} ${selected ? "selected" : ""}`}>
                  <img src={visionVisualImage(vision)} alt={`${tx("Referencia visual de", "Visual reference for")} ${vision.name}`} />
                  <span className="public-wheel-shade" />
                  <span className={`public-wheel-state ${selected ? cycle.phase : "idle"}`}>{publicState}</span>
                  <div><span className="eyebrow">{vision.englishName || "Visional Wheel"}</span><h2>{english ? vision.englishName || vision.name : vision.name}</h2><p>{vision.description || tx("Sin descripción publicada.", "No published description.")}</p>{selected && <strong>{transition.active ? formatDuration(overlayDisplayMs) : cycle.phase === "active" ? `${tx("Termina en", "Ends in")} ${formatDuration(cycle.remainingMs)}` : `${tx("Comienza en", "Starts in")} ${formatDuration(cycle.remainingMs)}`}</strong>}</div>
                  {selected && <UserCheck size={22} />}
                </article>;
              })}
            </div>
          </section>
        )}

        {tab === "characters" && (
          <section className="page characters-page">
            <article className="character-manager panel">
              <div className="panel-title"><div><span className="eyebrow"><Users size={15} /> {tx("PERSONAJES", "CHARACTERS")}</span><h2>{tx("Perfiles de juego", "Game profiles")}</h2></div><span className="character-limit">{state.characters.length} / 12</span></div>
              <p>{tx("La aplicación siempre abre en Solitario. Cada personaje conserva sus puntos, porcentaje e historial; en Equipo, una recompensa se suma a todos los integrantes seleccionados.", "The app always opens in Solo mode. Each character keeps their own points, percentage, and history; in Team mode, one reward is added to every selected member.")}</p>
              <form className="character-add" onSubmit={(event) => { event.preventDefault(); addCharacter(); }}>
                <label>{tx("Nuevo personaje", "New character")}<input value={newCharacterName} maxLength={40} placeholder={tx("Nombre dentro del juego", "In-game name")} onChange={(event) => setNewCharacterName(event.target.value)} /></label>
                <button type="submit" className="primary" disabled={state.characters.length >= 12}><UserPlus size={17} /> {tx("Agregar personaje", "Add character")}</button>
              </form>
              <div className="character-manager-list">
                {state.characters.map((character, index) => {
                  const summary = characterSummaries.find((item) => item.character.id === character.id);
                  return <div className="character-manager-row" key={character.id}>
                    <span className="character-avatar"><UserRound size={18} /></span>
                    <label>{tx("Nombre", "Name")}<input defaultValue={character.name} maxLength={40} onBlur={(event) => renameCharacter(character.id, event.target.value.trim() || character.name)} /></label>
                    <span className="character-manager-stats"><strong>{summary?.points ?? 0} {tx("puntos", "points")}</strong><small>{(summary?.chance ?? 0).toFixed(1)}% {tx("estimado", "estimated")}</small></span>
                    {index === 0 && <span className="main-character-badge">{tx("PRINCIPAL", "MAIN")}</span>}
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
              <StatCard icon={Box} label={`${tx("Muestras", "Samples")} · ${activeCharacter.name}`} value={String(stats.count)} />
              <StatCard icon={Minus} label={tx("Más baja", "Lowest")} value={stats.count ? pointsLabel(stats.minimum, language) : "—"} />
              <StatCard icon={MonitorUp} label={tx("Más alta", "Highest")} value={stats.count ? pointsLabel(stats.maximum, language) : "—"} />
              <StatCard icon={BarChart3} label={tx("Promedio", "Average")} value={stats.count ? pointsLabel(Number(stats.average.toFixed(1)), language) : "—"} />
            </div>
            <article className="probability-explainer panel">
              <div><span className="eyebrow">{tx("PROBABILIDAD OBSERVADA", "OBSERVED PROBABILITY")}</span><strong>{stats.perPointPercent.toFixed(3)}%</strong><p>{tx(`Una caja por cada ${stats.perPointPercent ? (100 / stats.perPointPercent).toFixed(1) : "—"} puntos, usando únicamente tu historial manual aproximado y tus cajas confirmadas. Una instalación nueva empieza en cero; no es una tasa oficial del juego.`, `One crate per ${stats.perPointPercent ? (100 / stats.perPointPercent).toFixed(1) : "—"} points, using only your approximate manual history and confirmed crates. A new installation starts at zero; this is not an official game rate.`)}</p></div>
              <div className="probability-ring" style={{ "--value": `${Math.min(100, stats.currentChancePercent) * 3.6}deg` } as React.CSSProperties}><span>{stats.currentChancePercent.toFixed(0)}%</span></div>
            </article>

            <article className="manual-history-panel panel">
              <div className="panel-title"><div><span className="eyebrow"><Plus size={15} /> {tx("HISTORIAL APROXIMADO", "APPROXIMATE HISTORY")}</span><h2>{tx("Cargar valores manualmente", "Add values manually")}</h2></div>{state.manualBaselinePoints.length > 0 && <button type="button" className="danger-quiet compact" onClick={() => commitState((current) => ({ ...current, manualBaselinePoints: [] }))}><Trash2 size={15} /> {tx("Borrar manuales", "Clear manual values")}</button>}</div>
              <p>{tx("Pega puntos separados por espacios, comas o líneas. Se usarán solo como referencia estadística; no aparecerán como cajas confirmadas ni tendrán fecha inventada.", "Paste points separated by spaces, commas, or lines. They are used only as statistical reference and will not appear as confirmed crates or receive an invented date.")}</p>
              <div className="manual-history-entry">
                <textarea value={manualHistoryText} onChange={(event) => setManualHistoryText(event.target.value)} placeholder={"Ejemplo:\n762, 966, 1143, 909"} aria-label="Valores históricos aproximados" />
                <button type="button" className="primary" onClick={addManualHistory}><Plus size={17} /> {tx("Agregar a la estimación", "Add to estimate")}</button>
              </div>
              {state.manualBaselinePoints.length > 0 && <div className="manual-values" aria-label="Valores aproximados guardados">{state.manualBaselinePoints.map((value, index) => <button type="button" key={`${value}-${index}`} title="Quitar este valor" onClick={() => commitState((current) => ({ ...current, manualBaselinePoints: current.manualBaselinePoints.filter((_, itemIndex) => itemIndex !== index) }))}><span>{value}</span><X size={12} /></button>)}</div>}
              <small>{state.manualBaselinePoints.length} {tx("de 500 valores manuales guardados en este equipo.", "of 500 manual values saved on this device.")}</small>
            </article>

            <div className="panel-title history-title"><div><span className="eyebrow">{tx("CAJAS SACADAS", "DROPPED CRATES")}</span><h2>{tx("Historial con fecha y hora", "Dated history")}</h2></div><button type="button" className="secondary compact" onClick={() => exportState(state)}><Download size={16} /> {tx("Exportar", "Export")}</button></div>
            {state.boxes.length === 0 ? <div className="empty-card history-empty"><History size={32} /><strong>{tx("Todavía no hay cajas registradas", "No crates recorded yet")}</strong><span>{tx("Cuando pulses “¡Salió la caja!”, aparecerá aquí con todos los datos del intento.", "When you press ‘The crate dropped!’, it will appear here with all attempt details.")}</span></div> : (
              <div className="history-list">
                {state.boxes.map((box, index) => (
                  <article className="history-record panel" key={box.id}>
                    <div className="record-number">#{state.boxes.length - index}</div>
                    <div className="record-main"><span>{box.characterName ?? state.characters.find((character) => character.id === (box.characterId ?? DEFAULT_CHARACTER_ID))?.name ?? tx("Personaje principal", "Main character")} · {formatDate(box.occurredAt, language)}</span><strong>{pointsLabel(box.points, language)}</strong><small>{box.claims} {tx("recompensas reclamadas", "rewards claimed")}{box.source === "platform-mail" ? ` · ${tx("correo de Plataformas", "Platforms mail")} · ${box.carriedPoints ?? 0} pts ${tx("transferidos", "carried over")}` : ""}</small></div>
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
              <StatCard icon={Search} label={tx("Buscando convertir", "Conversion goals")} value={String(allActiveShinyGoals.length)} />
              <StatCard icon={Gem} label={tx("Brillantes conseguidos", "Shiny obtained")} value={String(allObtainedShinyMods.length)} />
              <StatCard icon={RotateCcw} label={tx("Duplicados +17 fallidos", "Failed +17 duplicates")} value={String(totalShinyAttempts)} />
              <StatCard icon={Trophy} label={tx("Colección del catálogo", "Catalog collection")} value={`${shinyCollectionPercent.toFixed(1)}%`} />
            </div>

            <article className="shiny-rule panel">
              <div className="shiny-rule-icon"><Gem /></div>
              <div><span className="eyebrow">{tx("CÓMO FUNCIONA", "HOW IT WORKS")}</span><h2>{tx("Del nivel 1 al 17, después Brillante", "From level 1 to 17, then Shiny")}</h2><p>{tx("Todos los módulos progresan del nivel 1 al 17. Cuando ya tienes uno en nivel 17, otro igual puede convertirse en Brillante. Pulsa “Otro +17 no se convirtió” después de cada fallo; cuando salga, márcalo como conseguido.", "All mods progress from level 1 to 17. Once you have one at level 17, another copy can become Shiny. Press ‘Another +17 failed’ after each failed conversion, then mark it as obtained when it succeeds.")}</p></div>
            </article>

            <article className="shiny-catalog-panel panel">
              <div className="panel-title"><div><span className="eyebrow"><Search size={15} /> {tx("CATÁLOGO DE MÓDULOS", "MOD CATALOG")}</span><h2>{tx("Buscar y agregar un objetivo exacto", "Find and add an exact goal")}</h2></div><span className="catalog-count">{SHINY_MOD_CATALOG.length.toLocaleString(english ? "en-US" : "es-CO")} {tx("registros", "records")}</span></div>
              <div className="shiny-search-controls">
                <label className="shiny-search-field">{tx("Buscar nombre, variante, estilo o ID", "Search name, variant, style, or ID")}<div><Search size={16} /><input value={shinySearch} onChange={(event) => setShinySearch(event.target.value)} placeholder={tx("Ejemplo: Hora punta, Downstar o 19500542", "Example: Rush Hour, Downstar, or 19500542")} /></div></label>
                <label>{tx("Estilo o pieza", "Style or slot")}<select value={shinyGroupFilter} onChange={(event) => setShinyGroupFilter(event.target.value)}><option value="all">{tx("Todas las armas y armaduras", "All weapons and armor")}</option><optgroup label={tx("ARMAS", "WEAPONS")}>{SHINY_MOD_GROUPS.filter((entry) => entry.category === "weapon").map((entry) => <option key={entry.id} value={entry.id}>{entry.name.replace("Arma · ", "")} ({entry.count})</option>)}</optgroup><optgroup label={tx("ARMADURA", "ARMOR")}>{SHINY_MOD_GROUPS.filter((entry) => entry.category === "armor").map((entry) => <option key={entry.id} value={entry.id}>{entry.name.replace("Armadura · ", "")} ({entry.count})</option>)}</optgroup></select></label>
                <label>{tx("Nivel y sistema", "Level and system")}<select value={shinySystemFilter} onChange={(event) => setShinySystemFilter(event.target.value)}><option value="all">{tx("Todos", "All")} ({SHINY_MOD_CATALOG_META.total.toLocaleString(english ? "en-US" : "es-CO")})</option><option value="legacy">{tx("Nivel 1–17 · anterior", "Level 1–17 · legacy")} ({SHINY_MOD_CATALOG_META.legacy})</option><option value="normal">{tx("Nivel 1–17 · sistema 2.0", "Level 1–17 · system 2.0")} ({SHINY_MOD_CATALOG_META.normal})</option><option value="shiny">{tx("Brillante", "Shiny")} ({SHINY_MOD_CATALOG_META.shiny})</option></select></label>
              </div>
              <div className="shiny-result-summary"><span>{filteredShinyCatalog.length.toLocaleString(english ? "en-US" : "es-CO")} {tx("coincidencias en", "matches in")} {groupedVisibleShinyCatalog.length} {tx("grupos", "groups")}</span>{filteredShinyCatalog.length > visibleShinyCatalogCount && <small>{tx(`Se muestran ${visibleShinyCatalogCount}. Elige una pieza, estilo o escribe una búsqueda para ver más.`, `${visibleShinyCatalogCount} shown. Choose a slot or style, or enter a search to see more.`)}</small>}</div>
              <div className="shiny-catalog-results">
                {groupedVisibleShinyCatalog.map((group) => <section className="shiny-result-group" key={group.id}><header><strong>{group.name}</strong><small>{group.items.length} {tx("mostrados de", "shown of")} {filteredShinyCatalog.filter((item) => item.groupId === group.id).length}</small></header><div className="shiny-result-group-grid">{group.items.map((item) => <button type="button" key={item.id} className={selectedShinyMod.id === item.id ? "selected" : ""} onClick={() => chooseShinyMod(item)}><span>{catalogStatusLabel(item, language)}</span><strong>{english ? item.englishName || item.name : item.name}</strong><small>{catalogOriginLabel(item, language)} · ID {item.itemId}</small>{selectedShinyMod.id === item.id && <Check size={16} />}</button>)}</div></section>)}
                {filteredShinyCatalog.length === 0 && <div className="shiny-no-results"><Search size={23} /><span>{tx("No aparece en el catálogo. Puedes agregar el nombre escrito como personalizado.", "It is not in the catalog. You can add the typed name as a custom entry.")}</span></div>}
              </div>
              <div className="shiny-selection">
                <div><span>{tx("MÓDULO SELECCIONADO", "SELECTED MOD")}</span><strong>{english ? selectedShinyMod.englishName || selectedShinyMod.name : selectedShinyMod.name}</strong><small>{selectedShinyMod.groupName} · {catalogOriginLabel(selectedShinyMod, language)} · ID {selectedShinyMod.itemId}</small></div>
                <div className={`shiny-selected-variant ${selectedShinyMod.isCatalogShiny ? "bright" : ""}`}><span>{catalogStatusLabel(selectedShinyMod, language)}</span><strong>{selectedShinyMod.variant}</strong><small>{selectedShinyMod.englishName}</small></div>
                <button type="button" className="primary" onClick={() => addShinyTracker()}><Plus size={17} /> {tx("Empezar en 0", "Start at 0")}</button>
                <button type="button" className="secondary" disabled={!shinySearch.trim()} onClick={() => addShinyTracker(shinySearch)}><Plus size={17} /> {tx("Agregar nombre escrito", "Add typed name")}</button>
              </div>
              <p className="catalog-source-note">{tx(`Los ${SHINY_MOD_CATALOG_META.total.toLocaleString("es-CO")} registros están ordenados por tipo de arma o pieza de armadura. Todos progresan de nivel 1 a 17; los ${SHINY_MOD_CATALOG_META.shiny} registros especiales representan el estado Brillante.`, `The ${SHINY_MOD_CATALOG_META.total.toLocaleString("en-US")} records are grouped by weapon style or armor slot. All progress from level 1 to 17; the ${SHINY_MOD_CATALOG_META.shiny} special records represent the Shiny state.`)}</p>
            </article>

            <label className="shiny-search-field shiny-record-search">{tx("Buscar en mi registro", "Search my records")}<div><Search size={16} /><input value={shinyRecordSearch} onChange={(event) => setShinyRecordSearch(event.target.value)} placeholder={tx("Buscar entre objetivos e historial Brillante", "Search goals and Shiny history")} /></div></label>

            <div className="section-heading shiny-heading"><div><span className="eyebrow">{tx("EN PROCESO", "IN PROGRESS")}</span><h2>{tx("Intentos de conversión", "Conversion attempts")}</h2></div><span>{activeShinyGoals.length}{normalizedRecordSearch ? ` ${tx("de", "of")} ${allActiveShinyGoals.length}` : ""} {tx("activos", "active")}</span></div>
            {activeShinyGoals.length === 0 ? <div className="empty-card shiny-empty"><Gem size={30} /><strong>{normalizedRecordSearch ? tx("No hay coincidencias en los objetivos", "No matching goals") : tx("No estás siguiendo ningún módulo", "You are not tracking any mods")}</strong><span>{normalizedRecordSearch ? tx("Prueba con otro nombre, variante o estilo.", "Try another name, variant, or style.") : tx("Busca uno arriba, elige el registro exacto y pulsa “Empezar en 0”.", "Search above, choose the exact record, and press ‘Start at 0’.")}</span></div> : <div className="shiny-tracker-grid">{activeShinyGoals.map((record) => <ShinyTrackerCard language={language} key={record.id} record={record} onDecrease={() => adjustShinyAttempts(record.id, -1)} onIncrease={() => adjustShinyAttempts(record.id, 1)} onToggle={() => setShinyObtained(record.id, true)} onDelete={() => commitState((current) => ({ ...current, shinyMods: current.shinyMods.filter((item) => item.id !== record.id) }))} />)}</div>}

            <div className="section-heading shiny-heading"><div><span className="eyebrow">{tx("COLECCIÓN BRILLANTE", "SHINY COLLECTION")}</span><h2>{tx("Módulos conseguidos", "Obtained mods")}</h2></div><span>{obtainedShinyMods.length}{normalizedRecordSearch ? ` ${tx("de", "of")} ${allObtainedShinyMods.length}` : ""} {tx("marcados", "marked")}</span></div>
            {obtainedShinyMods.length === 0 ? <div className="empty-card shiny-empty obtained"><Trophy size={30} /><strong>{normalizedRecordSearch ? tx("No hay coincidencias en los conseguidos", "No matching obtained mods") : tx("Aún no has marcado ningún Brillante", "No Shiny mods marked yet")}</strong><span>{normalizedRecordSearch ? tx("La búsqueda también revisa nombre, variante y estilo.", "Search also checks name, variant, and style.") : tx("También puedes agregar un módulo y marcarlo directamente si ya lo tenías.", "You can also add a mod and mark it immediately if you already had it.")}</span></div> : <div className="shiny-tracker-grid">{obtainedShinyMods.map((record) => <ShinyTrackerCard language={language} key={record.id} record={record} onDecrease={() => adjustShinyAttempts(record.id, -1)} onIncrease={() => adjustShinyAttempts(record.id, 1)} onToggle={() => setShinyObtained(record.id, false)} onDelete={() => commitState((current) => ({ ...current, shinyMods: current.shinyMods.filter((item) => item.id !== record.id) }))} />)}</div>}
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

        {tab === "devices" && (
          <section className="page devices-page">
            <article className="device-version-panel panel">
              <div className="device-version-icon"><ShieldCheck size={27} /></div>
              <div><span className="eyebrow">{tx("VERSIÓN INSTALADA", "INSTALLED VERSION")}</span><h2>Caja Fantasma v{APP_VERSION}</h2><p>{IS_ANDROID ? tx("Aplicación Android ARM64 con actualizaciones verificadas dentro de la app.", "ARM64 Android app with verified in-app updates.") : tx("Aplicación de Windows con actualizaciones firmadas desde GitHub Releases.", "Windows app with signed updates from GitHub Releases.")}</p></div>
              <span className="version-current-badge">{tx("ACTUAL", "CURRENT")}</span>
            </article>

            <article className="public-catalog-sync panel">
              <div className="public-catalog-heading"><div><span className="eyebrow"><RadioTower size={15} /> {tx("CAMBIOS DEL ADMINISTRADOR", "ADMINISTRATOR CHANGES")}</span><h2>{tx("Actualización pública para PC y Android", "Public updates for PC and Android")}</h2><p>{tx("La rueda, sus recompensas, puntos y tiempos se comprueban automáticamente en ambos sistemas.", "The wheel, rewards, points, and timing are checked automatically on both platforms.")}</p></div><span className="catalog-version-badge">{tx("CATÁLOGO", "CATALOG")} v{state.catalog.catalogVersion}</span></div>
              <div className="public-catalog-facts"><span><small>{tx("Rueda publicada", "Published wheel")}</small><strong>{selectedVision ? (english ? selectedVision.englishName || selectedVision.name : selectedVision.name) : tx("Sin rueda", "No wheel")}</strong></span><span><small>{tx("Falta para volver", "Wait time")}</small><strong>{state.settings.waitMinutes} min</strong></span><span><small>{tx("Duración activa", "Active duration")}</small><strong>{state.settings.activeMinutes} min</strong></span><span><small>{tx("Transición", "Transition")}</small><strong>{state.settings.transitionDelayMilliseconds} ms</strong></span><span><small>{tx("Publicado por", "Published by")}</small><strong>{state.catalog.updatedBy || AUTHOR}</strong></span><span><small>{tx("Último cambio", "Last change")}</small><strong>{formatDate(state.catalog.updatedAt, language)}</strong></span></div>
              <div className="public-catalog-actions"><button type="button" className="secondary" onClick={() => void syncCatalog()}><RefreshCw size={16} /> {tx("Comprobar ahora", "Check now")}</button><small>{syncStatus}. {tx("Se revisa al abrir, cada 30 segundos, al volver Internet y al regresar a la aplicación.", "Checked at startup, every 30 seconds, when Internet returns, and when the app regains focus.")}</small></div>
            </article>

            <article className={`local-device-sync panel ${state.settings.localSyncEnabled ? "enabled" : ""}`}>
              <div className="local-sync-heading"><div><span className="eyebrow"><Wifi size={15} /> {tx("SIN NUBE NI FIREBASE", "NO CLOUD OR FIREBASE")}</span><h2>{tx("Sincronizar PC ↔ Android", "Sync PC ↔ Android")}</h2><p>{tx("Transfiere puntos, cajas, rondas, personajes, historial y módulos Brillantes directamente por tu red local. Tú eliges qué dispositivo reemplaza al otro.", "Transfer points, crates, rounds, characters, history, and Shiny Mods over your local network. You choose which device replaces the other.")}</p></div><span className={`local-sync-state ${state.settings.localSyncEnabled ? "online" : "offline"}`}>{state.settings.localSyncEnabled ? tx("ACTIVA", "ON") : tx("APAGADA", "OFF")}</span></div>
              {!IS_ANDROID ? <>
                <div className="local-sync-desktop-grid">
                  <div><small>{tx("IP DEL PC", "PC IP")}</small><strong>{localSyncInfo ? desktopLocalAddress.octets.join(".") : tx("Se mostrará al activar", "Shown after enabling")}</strong></div>
                  <div><small>{tx("PUERTO", "PORT")}</small><strong>{localSyncInfo?.port ?? "—"}</strong></div>
                  <div><small>{tx("CÓDIGO DE CONEXIÓN", "PAIRING CODE")}</small><strong className="pairing-code">{state.settings.localSyncCode || "—— —— ——"}</strong></div>
                </div>
                <div className="local-sync-actions"><button type="button" className={state.settings.localSyncEnabled ? "secondary" : "primary"} onClick={() => commitState((current) => { const enabling = !current.settings.localSyncEnabled; return { ...current, settings: { ...current.settings, localSyncEnabled: enabling, localSyncCode: enabling && !/^\d{6}$/.test(current.settings.localSyncCode) ? createPairingCode() : current.settings.localSyncCode } }; })}>{state.settings.localSyncEnabled ? <WifiOff size={17} /> : <Wifi size={17} />}{state.settings.localSyncEnabled ? tx("Detener conexión", "Stop connection") : tx("Compartir con el celular", "Share with phone")}</button>{state.settings.localSyncEnabled && <button type="button" className="secondary" onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, localSyncCode: createPairingCode() } }))}><RefreshCw size={16} /> {tx("Cambiar código", "Change code")}</button>}</div>
              </> : <>
                <div className="local-sync-mobile-fields"><LocalSyncAddressFields language={language} value={state.settings.localSyncAddress} onChange={(address) => commitState((current) => ({ ...current, settings: { ...current.settings, localSyncAddress: address.slice(0, 80) } }))} /><label className="local-pairing-field">{tx("Código de 6 números", "Six-digit code")}<input inputMode="numeric" maxLength={6} value={state.settings.localSyncCode} placeholder="000000" onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, localSyncCode: event.target.value.replace(/\D/g, "").slice(0, 6) } }))} /></label></div>
                <div className="local-sync-actions"><button type="button" disabled={localSyncBusy} className={state.settings.localSyncEnabled ? "secondary" : "primary"} onClick={() => { const enabling = !state.settings.localSyncEnabled; if (enabling && (!localSyncAddressReady || !/^\d{6}$/.test(state.settings.localSyncCode))) { setLocalSyncStatus(tx("Completa los cuatro bloques de la IP, el puerto y el código del PC", "Enter all four IP blocks, the port, and the PC code")); return; } commitState((current) => ({ ...current, settings: { ...current.settings, localSyncEnabled: enabling } })); if (enabling) window.setTimeout(() => void exchangeWithComputer("status"), 0); }}>{state.settings.localSyncEnabled ? <WifiOff size={17} /> : <Wifi size={17} />}{state.settings.localSyncEnabled ? tx("Desconectar", "Disconnect") : tx("Conectar con el PC", "Connect to PC")}</button></div>
                {state.settings.localSyncEnabled && <div className="local-sync-direction-grid">
                  <button type="button" className="secondary" disabled={localSyncBusy} onClick={() => { if (window.confirm(tx("Los datos personales de este celular se reemplazarán por los datos actuales del PC. ¿Continuar?", "This phone's personal data will be replaced with the current PC data. Continue?"))) void exchangeWithComputer("pull"); }}><Download size={18} /><span><strong>{tx("PC → Celular", "PC → Phone")}</strong><small>{tx("Traer los datos del PC", "Get data from the PC")}</small></span></button>
                  <button type="button" className="secondary" disabled={localSyncBusy} onClick={() => { if (window.confirm(tx("Los datos personales del PC se reemplazarán por los datos actuales de este celular. ¿Continuar?", "The PC's personal data will be replaced with this phone's current data. Continue?"))) void exchangeWithComputer("push"); }}><Upload size={18} /><span><strong>{tx("Celular → PC", "Phone → PC")}</strong><small>{tx("Enviar los datos del celular", "Send phone data to the PC")}</small></span></button>
                </div>}
              </>}
              <div className={`local-live-sync-option ${state.settings.localSyncLiveEnabled ? "enabled" : ""}`}>
                <span className="local-live-sync-icon"><Zap size={19} /></span>
                <span><strong>{tx("Sincronización en vivo", "Live synchronization")}</strong><small>{tx("Refleja automáticamente los cambios de puntos, cajas, personajes y módulos mientras PC y celular estén abiertos. Los botones manuales siguen disponibles.", "Automatically mirrors points, crates, characters, and mods while PC and phone are open. Manual buttons remain available.")}</small></span>
                <button type="button" className={`switch ${state.settings.localSyncLiveEnabled ? "on" : ""}`} disabled={!state.settings.localSyncEnabled} aria-label={tx("Activar sincronización en vivo", "Enable live synchronization")} aria-pressed={state.settings.localSyncLiveEnabled} onClick={() => { liveRevisionRef.current = 0; commitState((current) => ({ ...current, settings: { ...current.settings, localSyncLiveEnabled: !current.settings.localSyncLiveEnabled } })); }}><span /></button>
              </div>
              {state.settings.localSyncLiveEnabled && <p className="local-live-sync-note"><RadioTower size={15} /> {tx("Debe estar activada en ambos dispositivos. Al iniciarla, el celular recibe primero la copia del PC; usa Celular → PC antes si quieres conservar primero la copia del teléfono.", "Enable it on both devices. When it starts, the phone first receives the PC copy; use Phone → PC beforehand if you need to preserve the phone copy first.")}</p>}
              <p className="local-sync-message" role="status">{localSyncStatus}</p>
              <small>{tx("Usa una red Wi‑Fi de confianza o el anclaje USB del teléfono. Los cambios públicos del administrador también viajan del PC al celular mientras estén conectados.", "Use a trusted Wi-Fi network or USB tethering. Public administrator changes also travel from the PC to the phone while connected.")}</small>
            </article>

            {!IS_ANDROID && <article className="android-download-panel panel"><div><span className="eyebrow"><Download size={15} /> {tx("APLICACIÓN COMPAÑERA", "COMPANION APP")}</span><h2>{tx("Instalar en Android", "Install on Android")}</h2><p>{tx("Descarga la APK firmada una sola vez. Después recibirá las siguientes actualizaciones dentro de la aplicación.", "Download the signed APK once. Future updates will then arrive inside the app.")}</p></div><button type="button" className="primary" onClick={openAndroidDownload}><Download size={18} /> {tx("Descargar APK", "Download APK")} v{APP_VERSION}</button></article>}
          </section>
        )}

        {tab === "settings" && (
          <section className="page settings-page">
            <div className="settings-grid">
              <article className="settings-card language-settings panel">
                <div className="settings-icon"><Settings2 /></div><div><h3>{tx("Idioma de la aplicación", "App language")}</h3><p>{tx("Cambia los controles y mensajes principales. Los nombres personalizados del administrador no se traducen.", "Changes the main controls and messages. Custom administrator names are not translated.")}</p><div className="language-choice" role="group" aria-label={tx("Idioma", "Language")}><button type="button" className={language === "es" ? "selected" : ""} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, uiLanguage: "es" } }))}>Español</button><button type="button" className={language === "en" ? "selected" : ""} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, uiLanguage: "en" } }))}>English</button></div></div>
              </article>
              <article className="settings-card panel public-timing-summary">
                <div className="settings-icon"><Clock3 /></div><div><h3>{tx("Duración pública del ciclo", "Public cycle duration")}</h3><p>{tx("Estos valores los define el administrador y se sincronizan junto con la rueda y sus puntos.", "These values are set by the administrator and synced with the wheel and its points.")}</p><div className="timing-summary-values"><span><small>{tx("Espera", "Waiting")}</small><strong>{state.settings.waitMinutes} min</strong></span><span><small>{tx("Activa", "Active")}</small><strong>{state.settings.activeMinutes} min</strong></span><span><small>{tx("Transición al cierre", "End transition")}</small><strong>{state.settings.transitionDelayMilliseconds} ms</strong></span></div><small>{tx("El propietario puede modificarlos en el editor general inferior y enviarlos todos con un solo botón.", "The owner can edit them below and publish everything with one button.")}</small></div>
              </article>
              <article className="settings-card panel setting-disabled"><div className="settings-icon"><Bell /></div><div><h3>{tx("Notificaciones de escritorio", "Desktop notifications")}</h3><p>{tx("Desactivadas en esta versión. Gravedad puede seguir avisando mediante voz.", "Disabled in this version. Gravity can still warn you by voice.")}</p><span className="disabled-setting-badge">{tx("DESACTIVADAS", "DISABLED")}</span></div></article>
              <article className="settings-card voice-settings panel">
                <div className="settings-icon"><Volume2 /></div><div><h3>{tx("Aviso por voz · Gravedad", "Voice alert · Gravity")}</h3><p>{tx("Habla antes de que empiece el evento aunque la aplicación esté minimizada.", "Speaks before the event starts even when the app is minimized.")}</p><div className="voice-controls"><label>{tx("Anticipación (minutos)", "Lead time (minutes)")}<input type="number" min={1} max={60} value={state.settings.voiceLeadMinutes} onChange={(event) => commitState((current) => ({ ...current, settings: { ...current.settings, voiceLeadMinutes: clampNumber(Number(event.target.value), 1, 60), lastVoiceAlertPhaseStartedAt: undefined } }))} /></label><button type="button" className="secondary compact" onClick={() => { speakMessage(tx("Prueba de voz. El aviso de Gravedad está funcionando.", "Voice test. The Gravity alert is working.")); setToast(tx("Prueba de voz reproducida", "Voice test played")); window.setTimeout(() => setToast(""), 1800); }}><Volume2 size={15} /> {tx("Probar voz", "Test voice")}</button></div></div><button type="button" className={`switch ${state.settings.voiceNotificationsEnabled ? "on" : ""}`} aria-pressed={state.settings.voiceNotificationsEnabled} onClick={() => commitState((current) => ({ ...current, settings: { ...current.settings, voiceNotificationsEnabled: !current.settings.voiceNotificationsEnabled } }))}><span /></button>
              </article>
              {!IS_ANDROID && <><SettingToggle icon={MonitorUp} title={tx("Iniciar con Windows", "Start with Windows")} description={tx("Arranca en segundo plano; la ventana principal no interrumpe al encender el PC.", "Starts in the background without interrupting you when the PC boots.")} enabled={state.settings.autoStartEnabled} onToggle={(enabled) => { commitState((current) => ({ ...current, settings: { ...current.settings, autoStartEnabled: enabled } })); void toggleAutostart(enabled); }} /><SettingToggle icon={Eye} title={tx("Ventana flotante", "Floating overlay")} description={tx("Contador pequeño, movible y siempre encima del juego.", "A small movable countdown that stays above the game.")} enabled={state.settings.overlayEnabled} onToggle={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: !current.settings.overlayEnabled } }))} /><SettingToggle icon={Zap} title={tx("Contador de Ballena", "Whale countdown")} description={tx("Muestra la Ballena y su rayo durante Gravedad; puede ocultarse sin quitar la ventana flotante.", "Shows the Whale and its beam during Gravity; it can be hidden without disabling the main overlay.")} enabled={state.settings.overlayWhaleEnabled} onToggle={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleEnabled: !current.settings.overlayWhaleEnabled } }))} /></>}
            </div>

            <article className="backup-panel panel"><div><span className="eyebrow">{tx("DATOS PERSONALES", "PERSONAL DATA")}</span><h2>{tx("Respaldo local", "Local backup")}</h2><p>{tx("El historial permanece en este equipo y no se sube al repositorio público.", "Your history stays on this device and is not uploaded to the public repository.")}</p></div><div><button type="button" className="secondary" onClick={() => exportState(state)}><Download size={17} /> {tx("Exportar", "Export")}</button><button type="button" className="secondary" onClick={() => importRef.current?.click()}><Upload size={17} /> {tx("Importar", "Import")}</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void onImport(event.target.files?.[0])} /></div></article>

            <article className="owner-panel panel">
              <div className="panel-title"><div><span className="eyebrow">{creatorAccess === "granted" ? "MODO DESARROLLADOR" : "CUENTA PROPIETARIA"}</span><h2>{creatorAccess === "granted" ? "Editor de OscarD0823" : "Acceso privado"}</h2></div><span className={`creator-access-badge ${creatorAccess}`}>{creatorAccess === "granted" ? <UserCheck size={15} /> : <LockKeyhole size={15} />}{creatorAccess === "granted" ? "Propietario verificado" : creatorAccess === "checking" ? "Comprobando" : "Bloqueado"}</span></div>
              {creatorAccess === "granted" ? <>
                <p>Las herramientas privadas, el control del contador y la publicación completa solo aparecen al propietario verificado.</p>
                <section className="admin-cycle-console">
                  <div className="admin-cycle-heading"><div><span className="eyebrow"><Clock3 size={15} /> CONTROL PRIVADO DEL CICLO</span><h3>Rueda pública y contador sincronizado</h3></div><span className={`live-dot ${cycle.phase}`}>{transition.active ? "TRANSICIÓN" : cycle.phase === "active" ? "EN CURSO" : "EN ESPERA"}</span></div>
                  <div className="admin-cycle-grid">
                    <div className={`admin-cycle-live ${cycle.phase}`}><span>{transition.active ? "Preparando el próximo contador" : cycle.phase === "active" ? `${selectedVision?.name ?? "Rueda"} activa` : `${selectedVision?.name ?? "Rueda"} comenzará en`}</span><strong>{formatDuration(overlayDisplayMs)}</strong><div className="cycle-track"><i style={{ width: `${Math.round(cycle.progress * 100)}%` }} /></div><small>{cycle.phase === "active" ? `Termina el ${formatDate(cycle.phaseEndsAt)}.` : `Comienza el ${formatDate(cycle.phaseEndsAt)}.`}</small><div className="hero-actions"><button type="button" className="primary" onClick={() => setCyclePhase(cycle.phase === "active" ? "waiting" : "active")}>{cycle.phase === "active" ? <X size={17} /> : <Zap size={17} />}{cycle.phase === "active" ? "Terminar ahora" : "Activar ahora"}</button><button type="button" className="secondary" onClick={() => setCyclePhase(cycle.phase)}><RotateCcw size={16} /> Reiniciar</button></div></div>
                    <div className="admin-counter-editor"><div className="panel-title"><div><span className="eyebrow">AJUSTE EXACTO</span><h3>Modificar el contador</h3></div><button type="button" className="secondary compact" onClick={loadCurrentCountdown}><RefreshCw size={15} /> Copiar actual</button></div><p>Introduce el tiempo exacto que muestra el juego y decide si solo se aplica aquí o se envía a todos.</p><div className="counter-phase-buttons" aria-label="Fase que se está contando"><button type="button" className={counterPhase === "waiting" ? "selected" : ""} aria-pressed={counterPhase === "waiting"} onClick={() => setCounterPhase("waiting")}>Falta para empezar</button><button type="button" className={counterPhase === "active" ? "selected active" : ""} aria-pressed={counterPhase === "active"} onClick={() => setCounterPhase("active")}>Falta para terminar</button></div><div className="counter-time-fields"><label>Minutos<input type="number" min={0} max={counterPhase === "active" ? state.settings.activeMinutes : state.settings.waitMinutes} value={counterMinutes} onChange={(event) => setCounterMinutes(event.target.value)} /></label><span>:</span><label>Segundos<input type="number" min={0} max={59} value={counterSeconds} onChange={(event) => setCounterSeconds(event.target.value)} /></label></div><div className="admin-counter-actions"><button type="button" className="secondary" onClick={synchronizeCountdown}><Save size={16} /> Aplicar en este PC</button><button type="button" className="primary" onClick={() => void publishSharedCountdown()}><Upload size={16} /> Sincronizar con todos</button></div></div>
                  </div>
                  <small className="counter-anchor-note">La sincronización pública envía fase, hora absoluta, espera, duración activa y transición al cierre en milisegundos.</small>
                </section>
                <OverlayPreviewLab catalog={state.catalog} scale={state.settings.overlayScale} addonScale={state.settings.overlayAddonScale} whaleCounterScale={state.settings.overlayWhaleCounterScale} whaleCounterStyle={state.settings.overlayWhaleCounterStyle} whaleShowTime={state.settings.overlayWhaleShowTime} shape={state.settings.overlayShape} counterStyle={state.settings.overlayCounterStyle} nameMode={state.settings.overlayNameMode} customName={state.settings.overlayCustomName} onScaleChange={(scale) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayScale: clampNumber(scale, .2, 1.5) } }))} onAddonScaleChange={(scale) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayAddonScale: clampNumber(scale, .2, 1) } }))} onWhaleCounterScaleChange={(scale) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleCounterScale: clampNumber(scale, .2, 1.5) } }))} onWhaleCounterStyleChange={(style) => commitState((current) => ({ ...current, settings: { ...current.settings, overlayWhaleCounterStyle: style } }))} onAppearanceChange={(patch) => commitState((current) => ({ ...current, settings: { ...current.settings, ...(patch.shape ? { overlayShape: patch.shape } : {}), ...(patch.counterStyle ? { overlayCounterStyle: patch.counterStyle } : {}), ...(patch.nameMode ? { overlayNameMode: patch.nameMode } : {}), ...(patch.customName !== undefined ? { overlayCustomName: patch.customName.slice(0, 40) } : {}) } }))} onOpenRealOverlay={() => commitState((current) => ({ ...current, settings: { ...current.settings, overlayEnabled: true } }))} />
                <CatalogEditor catalog={state.catalog} onSave={saveCatalog} onPublish={publishCatalog} />
              </> : <div className="creator-login-card"><div className="creator-lock"><LockKeyhole size={25} /></div><div><strong>Acceso privado del propietario</strong><span>{creatorMessage}</span>{!IS_ANDROID && <div className="creator-login-actions"><button type="button" className="primary compact" onClick={() => void startCreatorLogin()}><LogIn size={15} /> Iniciar sesión con GitHub</button><button type="button" className="secondary compact" disabled={creatorAccess === "checking"} onClick={() => void checkCreatorAccess()}><RefreshCw size={15} /> Comprobar cuenta</button></div>}</div></div>}
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

function ShinyTrackerCard({ record, language, onDecrease, onIncrease, onToggle, onDelete }: { record: ShinyModRecord; language: "es" | "en"; onDecrease: () => void; onIncrease: () => void; onToggle: () => void; onDelete: () => void }) {
  const english = language === "en";
  return <article className={`shiny-tracker-card panel ${record.isShiny ? "obtained" : ""}`}>
    <div className="shiny-tracker-top">
      <span className="shiny-mod-icon">{record.isShiny ? <Trophy size={20} /> : <Gem size={20} />}</span>
      <div><small>{record.groupName}</small><h3>{record.modName}</h3>{record.englishName && <em>{record.englishName}</em>}</div>
      <button type="button" className="shiny-delete" aria-label={`${english ? "Delete" : "Eliminar"} ${record.modName}`} onClick={onDelete}><Trash2 size={15} /></button>
    </div>
    <div className="shiny-variant"><span>{english ? "VARIANT" : "VARIANTE"}</span><strong>{record.variant}</strong></div>
    <div className="shiny-attempt-count"><span>{english ? "Duplicate +17 mods that did not convert" : "Duplicados +17 que no se convirtieron"}</span><strong>{record.attempts}</strong></div>
    {!record.isShiny && <div className="shiny-attempt-actions"><button type="button" aria-label={english ? "Subtract one attempt" : "Restar un intento"} disabled={record.attempts === 0} onClick={onDecrease}><Minus size={17} /></button><button type="button" className="primary" onClick={onIncrease}><Plus size={17} /> {english ? "Another +17 failed" : "Otro +17 no se convirtió"}</button></div>}
    <button type="button" className={`shiny-obtained-button ${record.isShiny ? "active" : ""}`} onClick={onToggle}>{record.isShiny ? <><Check size={17} /> {english ? "Shiny obtained" : "Brillante conseguido"} · {record.obtainedAt ? formatDate(record.obtainedAt, language) : english ? "no date" : "sin fecha"}</> : <><Sparkles size={17} /> {english ? "Mark as Shiny" : "Marcar como Brillante"}</>}</button>
  </article>;
}

function StartupIntro({ language, onSkip }: { language: "es" | "en"; onSkip: () => void }) {
  return <button type="button" className="startup-intro" onClick={onSkip} aria-label={language === "en" ? "Skip opening animation" : "Omitir animación de apertura"}>
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
    <span className="intro-hint">{language === "en" ? "Tap to continue" : "Pulsa para continuar"}</span>
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

function ActivityCard({ activity, currentCount, dailyCount, totalCount, language, disabled = false, onAdd, onRemove }: { activity: Activity; currentCount: number; dailyCount: number; totalCount: number; language: "es" | "en"; disabled?: boolean; onAdd: () => void; onRemove: () => void }) {
  const english = language === "en";
  const inactive = disabled || !activity.enabled || activity.points <= 0;
  return (
    <article className={`activity-card ${inactive ? "disabled" : ""}`}>
      <div className="activity-points"><strong>{activity.points}</strong><small>PTS</small></div>
      <div className="activity-copy"><strong>{activity.name}</strong><span>{activity.note ?? (english ? "Claimed reward" : "Recompensa reclamada")}</span></div>
      <div className="activity-counts">
        <div className="activity-counter">
          {currentCount > 0 && <button type="button" aria-label={`${english ? "Remove one" : "Quitar una de"} ${activity.name}`} onClick={onRemove}><Minus size={15} /></button>}
          <span aria-label={`${currentCount} ${english ? "in the current round" : "en la ronda actual"}`}>{currentCount}</span>
          <button type="button" aria-label={`${english ? "Add" : "Sumar"} ${activity.name}`} disabled={inactive} onClick={onAdd}><Plus size={19} /></button>
        </div>
        <small>{english ? "Today" : "Hoy"} {dailyCount} · {english ? "All time" : "Histórico"} {totalCount}</small>
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
