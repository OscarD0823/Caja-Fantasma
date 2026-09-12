import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import Overlay from "./Overlay";
import WhaleVisualHarness from "./WhaleVisualHarness";
import "./styles.css";

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
