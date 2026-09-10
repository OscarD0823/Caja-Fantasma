import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import Overlay from "./Overlay";
import "./styles.css";

const label = (() => {
  try {
    return getCurrentWindow().label;
  } catch {
    return "main";
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>{label === "overlay" ? <Overlay /> : <App />}</StrictMode>,
);
