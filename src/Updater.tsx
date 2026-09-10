import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { Download, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

type Status = "downloading" | "installing" | "restarting" | "error";

export default function AppUpdater() {
  const updateRef = useRef<Update | null>(null);
  const running = useRef(false);
  const checking = useRef(false);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>("downloading");
  const [route, setRoute] = useState({ current: "", next: "" });
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update || running.current) return;
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
      const update = await check({ timeout: 8000 });
      if (!update) return;
      updateRef.current = update;
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
    return () => {
      window.clearTimeout(firstCheck);
      window.clearInterval(periodicCheck);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [checkForUpdate]);

  if (!visible) return null;
  return <div className="update-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title"><section className="update-card" aria-live="polite">
    <div className={`update-icon ${status !== "error" ? "spinning" : ""}`}>{status === "error" ? <TriangleAlert /> : status === "downloading" ? <Download /> : <RefreshCw />}</div>
    <span className="eyebrow">ACTUALIZACIÓN AUTOMÁTICA SEGURA</span>
    <h2 id="update-title">{status === "downloading" ? "Actualizando Caja Fantasma" : status === "installing" ? "Verificando e instalando" : status === "restarting" ? "Reiniciando aplicación" : "No se pudo actualizar"}</h2>
    {status !== "error" ? <><div className="update-route"><span>{route.current}</span><RefreshCw size={14} /><strong>{route.next}</strong></div><p>{status === "downloading" ? "Descargando el paquete firmado desde GitHub Releases." : status === "installing" ? "Comprobando la firma antes de aplicar los archivos." : "La nueva versión volverá a abrirse."}</p>{status !== "restarting" && <><div className={`update-progress ${progress === null ? "indeterminate" : ""}`}><span style={progress === null ? undefined : { width: `${progress}%` }} /></div><strong>{progress === null ? "Descargando…" : `${progress}%`}</strong></>}<div className="update-trust"><ShieldCheck size={16} /> Firma verificada antes de instalar</div>{notes && <details><summary>Ver cambios de la versión</summary><pre>{notes}</pre></details>}</> : <><p>{error}</p><div className="update-actions"><button type="button" className="secondary" onClick={() => setVisible(false)}>Continuar sin actualizar</button><button type="button" className="primary" onClick={() => void install()}><RefreshCw size={17} /> Reintentar</button></div></>}
  </section></div>;
}
