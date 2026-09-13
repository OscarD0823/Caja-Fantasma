import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { Download, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { APP_VERSION } from "./model";

type Status = "downloading" | "installing" | "restarting" | "permission" | "confirming" | "error";
type AndroidRelease = { version: string; notes: string; url: string; sha256: string };
type AndroidInstallResult = { status: "permission-required" | "installer-opened" };

const IS_ANDROID = /Android/i.test(navigator.userAgent);

function isNewerVersion(candidate: string, current: string) {
  const left = candidate.replace(/^v/i, "").split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  const right = current.replace(/^v/i, "").split(/[.+-]/).map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] ?? 0) !== (right[index] ?? 0)) return (left[index] ?? 0) > (right[index] ?? 0);
  }
  return false;
}

export default function AppUpdater() {
  const desktopUpdateRef = useRef<Update | null>(null);
  const androidReleaseRef = useRef<AndroidRelease | null>(null);
  const snoozedVersionRef = useRef("");
  const running = useRef(false);
  const checking = useRef(false);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>("downloading");
  const [route, setRoute] = useState({ current: "", next: "" });
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const dismiss = useCallback(() => {
    snoozedVersionRef.current = route.next;
    running.current = false;
    setVisible(false);
  }, [route.next]);

  const install = useCallback(async () => {
    if (running.current) return;

    if (IS_ANDROID) {
      const release = androidReleaseRef.current;
      if (!release) return;
      running.current = true;
      setStatus("downloading");
      setError("");
      setProgress(null);
      try {
        const result = await invoke<AndroidInstallResult>("plugin:android-updater|install", {
          version: release.version,
          url: release.url,
          sha256: release.sha256,
        });
        running.current = false;
        if (result.status === "permission-required") {
          setStatus("permission");
        } else {
          setStatus("confirming");
          setProgress(100);
        }
      } catch (reason) {
        running.current = false;
        setStatus("error");
        setError(reason instanceof Error ? reason.message : String(reason || "No se pudo instalar la actualización de Android."));
      }
      return;
    }

    const update = desktopUpdateRef.current;
    if (!update) return;
    running.current = true;
    setStatus("downloading");
    setError("");
    setProgress(null);
    let downloaded = 0;
    let total = 0;
    try {
      await update.download((event?: DownloadEvent) => {
        if (event?.event === "Started") total = event.data.contentLength ?? 0;
        if (event?.event === "Progress") downloaded += event.data.chunkLength;
        setProgress(event?.event === "Finished" ? 100 : total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : null);
      }, { timeout: 180_000 });
      setStatus("installing");
      setProgress(100);
      await update.install();
      setStatus("restarting");
      await relaunch();
    } catch (reason) {
      running.current = false;
      setStatus("error");
      setError(reason instanceof Error ? reason.message : "No se pudo instalar la actualización firmada.");
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!isTauri() || navigator.onLine === false || checking.current || running.current) return;
    checking.current = true;
    try {
      if (IS_ANDROID) {
        const release = await invoke<AndroidRelease>("plugin:android-updater|check");
        if (!isNewerVersion(release.version, APP_VERSION) || snoozedVersionRef.current === release.version) return;
        androidReleaseRef.current = release;
        setRoute({ current: APP_VERSION, next: release.version });
        setNotes(release.notes || "Incluye mejoras y correcciones.");
        setVisible(true);
        void install();
        return;
      }

      const update = await check({ timeout: 8000 });
      if (!update || snoozedVersionRef.current === update.version) return;
      desktopUpdateRef.current = update;
      setRoute({ current: update.currentVersion, next: update.version });
      setNotes(update.body ?? "Incluye mejoras y correcciones.");
      setVisible(true);
      void install();
    } catch (reason) {
      console.info("[Caja Fantasma] Comprobación automática aplazada.", reason);
    } finally {
      checking.current = false;
    }
  }, [install]);

  useEffect(() => {
    if (!isTauri()) return;
    const firstCheck = window.setTimeout(() => void checkForUpdate(), 900);
    const periodicCheck = window.setInterval(() => void checkForUpdate(), 15 * 60_000);
    const refresh = () => void checkForUpdate();
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(firstCheck);
      window.clearInterval(periodicCheck);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [checkForUpdate]);

  if (!visible) return null;

  const title = status === "downloading"
    ? "Actualizando Caja Fantasma"
    : status === "installing"
      ? "Verificando e instalando"
      : status === "restarting"
        ? "Reiniciando aplicación"
        : status === "permission"
          ? "Permite actualizar esta aplicación"
          : status === "confirming"
            ? "Confirma la actualización en Android"
            : "No se pudo actualizar";
  const message = status === "downloading"
    ? IS_ANDROID
      ? "Descargando la APK oficial y verificando su suma SHA-256."
      : "Descargando el paquete firmado desde GitHub Releases."
    : status === "installing"
      ? "Comprobando la firma antes de aplicar los archivos."
      : status === "restarting"
        ? "La nueva versión volverá a abrirse."
        : status === "permission"
          ? "Android abrió el permiso «Instalar apps desconocidas». Actívalo para Caja Fantasma, regresa aquí y pulsa continuar."
          : status === "confirming"
            ? "La descarga ya fue verificada. Android requiere que confirmes la instalación por seguridad."
            : error;

  return <div className="update-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title"><section className="update-card" aria-live="polite">
    <div className={`update-icon ${status === "downloading" || status === "installing" || status === "restarting" ? "spinning" : ""}`}>{status === "error" ? <TriangleAlert /> : status === "downloading" ? <Download /> : status === "permission" || status === "confirming" ? <ShieldCheck /> : <RefreshCw />}</div>
    <span className="eyebrow">ACTUALIZACIÓN AUTOMÁTICA SEGURA</span>
    <h2 id="update-title">{title}</h2>
    <div className="update-route"><span>{route.current}</span><RefreshCw size={14} /><strong>{route.next}</strong></div>
    <p>{message}</p>

    {(status === "downloading" || status === "installing") && <><div className={`update-progress ${progress === null ? "indeterminate" : ""}`}><span style={progress === null ? undefined : { width: `${progress}%` }} /></div><strong>{progress === null ? IS_ANDROID ? "Descargando y verificando…" : "Descargando…" : `${progress}%`}</strong></>}

    {status !== "error" && <div className="update-trust"><ShieldCheck size={16} /> {IS_ANDROID ? "SHA-256 y firma Android verificados antes de instalar" : "Firma verificada antes de instalar"}</div>}
    {notes && status !== "error" && <details><summary>Ver cambios de la versión</summary><pre>{notes}</pre></details>}

    {status === "permission" && <div className="update-actions"><button type="button" className="secondary" onClick={dismiss}>Más tarde</button><button type="button" className="primary" onClick={() => void install()}><Download size={17} /> Continuar actualización</button></div>}
    {status === "confirming" && <div className="update-actions"><button type="button" className="secondary" onClick={dismiss}>Cerrar</button><button type="button" className="primary" onClick={() => void install()}><RefreshCw size={17} /> Abrir instalador otra vez</button></div>}
    {status === "error" && <div className="update-actions"><button type="button" className="secondary" onClick={dismiss}>Continuar sin actualizar</button><button type="button" className="primary" onClick={() => void install()}><RefreshCw size={17} /> Reintentar</button></div>}
  </section></div>;
}
