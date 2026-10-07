//! Windows session shutdown must not depend on a still-running JavaScript event loop.
use std::{path::PathBuf, sync::Mutex};
use tauri::Manager;

static LATEST_PROGRESS: Mutex<Option<(PathBuf, String)>> = Mutex::new(None);
const SUBCLASS_ID: usize = 0xCF17;
type Hwnd = *mut std::ffi::c_void;
type Subclass = unsafe extern "system" fn(Hwnd, u32, usize, isize, usize, usize) -> isize;

#[link(name = "comctl32")]
extern "system" {
    fn SetWindowSubclass(window: Hwnd, callback: Subclass, id: usize, data: usize) -> i32;
    fn RemoveWindowSubclass(window: Hwnd, callback: Subclass, id: usize) -> i32;
    fn DefSubclassProc(window: Hwnd, message: u32, wparam: usize, lparam: isize) -> isize;
}

pub fn cache(directory: PathBuf, data: String) -> Result<(), String> {
    if data.len() > 8 * 1024 * 1024
        || !serde_json::from_str::<serde_json::Value>(&data).is_ok_and(|value| value.is_object())
    {
        return Err("La copia preparada para el apagado no es válida.".into());
    }
    *LATEST_PROGRESS
        .lock()
        .map_err(|_| "No se pudo preparar el guardado al apagar.".to_string())? =
        Some((directory, data));
    Ok(())
}

fn save_session_progress() -> Result<(), String> {
    let latest = LATEST_PROGRESS
        .lock()
        .map_err(|_| "No se pudo leer el progreso al apagar.".to_string())?
        .clone();
    if let Some((directory, data)) = latest {
        crate::local_sync::persist_close_snapshot(&data, true, |merged| {
            crate::native_backup::save(&directory, merged)
        })?;
    }
    crate::SAFE_EXIT_READY.store(true, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

fn session_is_ending(message: u32, wparam: usize) -> bool {
    message == 0x0016 && wparam != 0 // WM_ENDSESSION, not a canceled shutdown.
}

unsafe extern "system" fn shutdown_window_proc(
    window: Hwnd,
    message: u32,
    wparam: usize,
    lparam: isize,
    id: usize,
    _: usize,
) -> isize {
    if session_is_ending(message, wparam) {
        // Flush the Rust-owned copy and latest bridge snapshot before returning to Windows.
        // No prompts, sleeps, network exchanges or JavaScript calls during shutdown.
        if let Err(error) = save_session_progress() {
            eprintln!("[Caja Fantasma] No se pudo completar el guardado al apagar: {error}");
        }
    }
    if message == 0x0082 {
        // WM_NCDESTROY
        RemoveWindowSubclass(window, shutdown_window_proc, id);
    }
    DefSubclassProc(window, message, wparam, lparam)
}

pub fn install(app: &tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("No se encontró la ventana principal.")?;
    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    if unsafe { SetWindowSubclass(hwnd.0 as Hwnd, shutdown_window_proc, SUBCLASS_ID, 0) } == 0 {
        return Err(format!(
            "No se pudo registrar el guardado de apagado: {}",
            std::io::Error::last_os_error()
        ));
    }
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    if let Some(data) = crate::native_backup::load(&directory)? {
        cache(directory, data)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_a_confirmed_session_end_triggers_shutdown_save() {
        assert!(!session_is_ending(0x0011, 1)); // Query: never cancel shutdown.
        assert!(!session_is_ending(0x0016, 0)); // Another app/user canceled shutdown.
        assert!(session_is_ending(0x0016, 1)); // Shutdown, restart or log off.
        assert!(!session_is_ending(0x0010, 1)); // Main X uses the frontend handshake.
    }
}
