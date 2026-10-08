use tauri::Manager;

pub fn should_reveal_main(args: &[String]) -> bool {
    // Autostart must not interrupt a game when an instance is already running.
    !args.iter().any(|argument| argument == "--background")
}

pub fn reveal_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::should_reveal_main;

    #[test]
    fn regular_launch_restores_the_existing_window() {
        assert!(should_reveal_main(&[]));
        assert!(should_reveal_main(&["caja-fantasma.exe".into()]));
        assert!(should_reveal_main(&[
            "caja-fantasma.exe".into(),
            "--other".into()
        ]));
    }

    #[test]
    fn autostart_keeps_the_existing_window_in_the_background() {
        assert!(!should_reveal_main(&["--background".into()]));
        assert!(!should_reveal_main(&[
            "caja-fantasma.exe".into(),
            "--background".into()
        ]));
    }
}
