export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstallStatus = { available: boolean; installed: boolean; installing: boolean; failed: boolean };

export function createPwaInstaller(onChange: (status: PwaInstallStatus) => void, initiallyInstalled = false) {
  let offered: InstallPrompt | undefined;
  let installed = initiallyInstalled;
  let installing = false;
  let failed = false;
  const snapshot = (): PwaInstallStatus => ({ available: Boolean(offered) && !installed && !installing, installed, installing, failed });
  const publish = () => onChange(snapshot());

  const capture = (event: Event) => {
    if (installed || installing || typeof (event as InstallPrompt).prompt !== "function") return;
    event.preventDefault();
    offered = event as InstallPrompt;
    failed = false;
    publish();
  };
  const complete = () => { installed = true; offered = undefined; failed = false; publish(); };
  const install = async () => {
    if (!offered || installed || installing) return false;
    const current = offered;
    // Browser prompts are single-use; both install buttons share this lock.
    offered = undefined;
    installing = true;
    failed = false;
    publish();
    try {
      await current.prompt();
      return (await current.userChoice).outcome === "accepted";
    } catch {
      failed = !installed;
      return false;
    } finally {
      installing = false;
      publish();
    }
  };
  return { capture, complete, install, snapshot };
}

type InstallStep = { es: string; en: string };
export type PwaInstallGuide = { platform: "ios" | "android" | "safari-mac" | "desktop"; steps: InstallStep[] };

export function pwaInstallGuide(userAgent: string, platform = "", maxTouchPoints = 0): PwaInstallGuide {
  if (/iPhone|iPad|iPod/i.test(userAgent) || platform === "MacIntel" && maxTouchPoints > 1) {
    return { platform: "ios", steps: [
      { es: "Abre esta página en Safari y toca Compartir.", en: "Open this page in Safari and tap Share." },
      { es: "Elige Añadir a pantalla de inicio.", en: "Choose Add to Home Screen." },
      { es: "Si aparece Abrir como app, actívalo. Confirma con Añadir.", en: "If Open as Web App appears, enable it. Confirm with Add." },
    ] };
  }
  if (/Android/i.test(userAgent)) {
    return { platform: "android", steps: [
      { es: "Abre esta página en Chrome o Edge y toca el menú ⋮ o ⋯.", en: "Open this page in Chrome or Edge and tap the ⋮ or ⋯ menu." },
      { es: "Busca Instalar aplicación o Añadir a pantalla de inicio.", en: "Look for Install app or Add to Home screen." },
      { es: "Confirma la instalación y abre Caja Fantasma desde su icono.", en: "Confirm installation and open Caja Fantasma from its icon." },
    ] };
  }
  if (/Macintosh|Mac OS X/i.test(userAgent) && /Safari/i.test(userAgent) && !/Chrome|Chromium|Edg|OPR/i.test(userAgent)) {
    return { platform: "safari-mac", steps: [
      { es: "En Safari, pulsa Compartir y elige Agregar al Dock. También puede aparecer en Archivo.", en: "In Safari, click Share and choose Add to Dock. It may also appear under File." },
      { es: "Confirma con Agregar y abre Caja Fantasma desde el Dock.", en: "Confirm with Add and open Caja Fantasma from the Dock." },
    ] };
  }
  return { platform: "desktop", steps: [
    { es: "Busca el icono de instalar en la barra de direcciones de Chrome o Edge.", en: "Look for the install icon in Chrome or Edge's address bar." },
    { es: "En Chrome también puedes usar ⋮ → Enviar, guardar y compartir → Instalar página como aplicación. En Edge, busca Aplicaciones en ⋯.", en: "In Chrome you can also use ⋮ → Cast, save, and share → Install page as app. In Edge, look for Apps in ⋯." },
    { es: "Confirma la instalación para abrirla desde su propio icono.", en: "Confirm installation to open it from its own icon." },
  ] };
}
