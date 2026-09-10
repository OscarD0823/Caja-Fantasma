#![cfg_attr(target_env = "msvc", allow(linker_messages))]

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::{json, Value};
use std::{fs, process::Command};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

const REPOSITORY: &str = "OscarD0823/Caja-Fantasma";
const CATALOG_PATH: &str = "catalog/visions.json";

fn command_error(output: &std::process::Output, fallback: &str) -> String {
    let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if message.is_empty() {
        fallback.to_string()
    } else {
        message
    }
}

#[tauri::command]
fn publish_catalog(catalog_json: String) -> Result<String, String> {
    if catalog_json.len() > 262_144 {
        return Err("El catálogo supera el tamaño permitido.".into());
    }
    let catalog: Value = serde_json::from_str(&catalog_json)
        .map_err(|_| "El catálogo no contiene JSON válido.".to_string())?;
    if catalog.get("schemaVersion").and_then(Value::as_u64) != Some(1)
        || catalog
            .get("catalogVersion")
            .and_then(Value::as_u64)
            .is_none()
        || catalog.get("visions").and_then(Value::as_array).is_none()
    {
        return Err("El catálogo no cumple el formato esperado.".into());
    }

    let auth = Command::new("gh")
        .args(["auth", "status", "--hostname", "github.com"])
        .output()
        .map_err(|_| {
            "No se encontró GitHub CLI. Instálalo e inicia sesión con gh auth login.".to_string()
        })?;
    if !auth.status.success() {
        return Err(
            "GitHub CLI no tiene una sesión válida. Ejecuta gh auth login y vuelve a intentarlo."
                .into(),
        );
    }

    let endpoint = format!("repos/{REPOSITORY}/contents/{CATALOG_PATH}");
    let current = Command::new("gh")
        .args([
            "api",
            &endpoint,
            "-H",
            "Accept: application/vnd.github+json",
        ])
        .output()
        .map_err(|error| format!("No se pudo consultar GitHub: {error}"))?;
    if !current.status.success() {
        return Err(command_error(
            &current,
            "No se pudo leer el catálogo remoto.",
        ));
    }
    let remote: Value = serde_json::from_slice(&current.stdout)
        .map_err(|_| "GitHub devolvió una respuesta inesperada.".to_string())?;
    let sha = remote
        .get("sha")
        .and_then(Value::as_str)
        .ok_or_else(|| "GitHub no informó la versión actual del archivo.".to_string())?;

    let version = catalog
        .get("catalogVersion")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let payload = json!({
        "message": format!("Actualizar catálogo público a v{version}"),
        "content": STANDARD.encode(catalog_json.as_bytes()),
        "sha": sha,
        "branch": "main"
    });
    let temp_path =
        std::env::temp_dir().join(format!("caja-fantasma-catalog-{}.json", std::process::id()));
    fs::write(
        &temp_path,
        serde_json::to_vec(&payload).map_err(|error| error.to_string())?,
    )
    .map_err(|error| format!("No se pudo preparar la publicación: {error}"))?;

    let published = Command::new("gh")
        .args([
            "api",
            "--method",
            "PUT",
            &endpoint,
            "-H",
            "Accept: application/vnd.github+json",
            "--input",
        ])
        .arg(&temp_path)
        .output();
    let _ = fs::remove_file(&temp_path);
    let published =
        published.map_err(|error| format!("No se pudo ejecutar GitHub CLI: {error}"))?;
    if !published.status.success() {
        return Err(command_error(&published, "GitHub rechazó la publicación."));
    }

    Ok(format!(
        "Catálogo v{version} publicado. Los demás equipos lo recibirán automáticamente."
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--background"])
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![publish_catalog])
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Abrir Caja Fantasma", true, None::<&str>)?;
            let overlay = MenuItem::with_id(
                app,
                "overlay",
                "Mostrar contador flotante",
                true,
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &overlay, &quit])?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("falta el icono de la aplicación"),
                )
                .tooltip("Caja Fantasma · Once Human")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "overlay" => {
                        if let Some(window) = app.get_webview_window("overlay") {
                            let visible = window.is_visible().unwrap_or(false);
                            if visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                            }
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            if std::env::args().any(|argument| argument == "--background") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar Caja Fantasma");
}
