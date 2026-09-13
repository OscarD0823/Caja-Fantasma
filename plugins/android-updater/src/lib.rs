use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime,
};

const PLUGIN_IDENTIFIER: &str = "com.oscard0823.cajafantasma.updater";

pub struct AndroidUpdater<R: Runtime>(PluginHandle<R>);

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AndroidRelease {
    pub version: String,
    pub notes: String,
    pub url: String,
    pub sha256: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallArgs {
    version: String,
    url: String,
    sha256: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub status: String,
}

#[tauri::command]
async fn check<R: Runtime>(app: AppHandle<R>) -> Result<AndroidRelease, String> {
    app.state::<AndroidUpdater<R>>()
        .0
        .run_mobile_plugin_async("check", ())
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn install<R: Runtime>(
    app: AppHandle<R>,
    version: String,
    url: String,
    sha256: String,
) -> Result<InstallResult, String> {
    app.state::<AndroidUpdater<R>>()
        .0
        .run_mobile_plugin_async(
            "install",
            InstallArgs {
                version,
                url,
                sha256,
            },
        )
        .await
        .map_err(|error| error.to_string())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R>::new("android-updater")
        .setup(|app, api| {
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "AndroidUpdaterPlugin")?;
            app.manage(AndroidUpdater(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![check, install])
        .build()
}
