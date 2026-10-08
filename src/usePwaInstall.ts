import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPwaInstaller, type PwaInstallStatus } from "./pwaInstall";

export type PwaInstallState = PwaInstallStatus & { install: () => Promise<boolean> };

export function usePwaInstall(enabled: boolean): PwaInstallState {
  const [status, setStatus] = useState<PwaInstallStatus>(() => ({ available: false, installing: false, failed: false, installed: window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone) }));
  const controllerRef = useRef<ReturnType<typeof createPwaInstaller> | null>(null);
  if (!controllerRef.current) controllerRef.current = createPwaInstaller(setStatus, status.installed);
  useEffect(() => {
    if (!enabled) return;
    const controller = controllerRef.current!;
    const display = window.matchMedia("(display-mode: standalone)");
    const changed = (event: MediaQueryListEvent) => { if (event.matches) controller.complete(); };
    window.addEventListener("beforeinstallprompt", controller.capture);
    window.addEventListener("appinstalled", controller.complete);
    display.addEventListener?.("change", changed);
    return () => {
      window.removeEventListener("beforeinstallprompt", controller.capture);
      window.removeEventListener("appinstalled", controller.complete);
      display.removeEventListener?.("change", changed);
    };
  }, [enabled]);
  const install = useCallback(() => enabled ? controllerRef.current!.install() : Promise.resolve(false), [enabled]);
  return useMemo(() => ({ ...status, install }), [status, install]);
}
