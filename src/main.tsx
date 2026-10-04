import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import Overlay from "./Overlay";
import WhaleVisualHarness from "./WhaleVisualHarness";
import "./styles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
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
