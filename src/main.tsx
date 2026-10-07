import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import App from "./App";
import Overlay from "./Overlay";
import WhaleVisualHarness from "./WhaleVisualHarness";
import "./styles.css";
import "./crateOpening.css";

const nativeHost = isTauri();

if (import.meta.env.PROD && !nativeHost && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
}

if (nativeHost && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))).catch(() => undefined);
    if ("caches" in window) {
      void caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("caja-fantasma-web-")).map((key) => caches.delete(key)))).catch(() => undefined);
    }
  });
}

const label = (() => {
  try {
    return getCurrentWindow().label;
  } catch {
    return "main";
  }
})();

const visualWhaleTest = import.meta.env.DEV && new URLSearchParams(window.location.search).has("whale-visual-test");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{visualWhaleTest ? <WhaleVisualHarness /> : label === "overlay" ? <Overlay /> : <App />}</StrictMode>,
);
