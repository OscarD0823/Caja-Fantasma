const COMMANDS: &[&str] = &["check", "install"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .build();
}
