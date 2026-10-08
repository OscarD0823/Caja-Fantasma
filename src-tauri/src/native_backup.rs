use serde_json::Value;
use std::{fs, io::Write, path::Path, sync::Mutex};

const BACKUP: &str = "personal-state-backup.json";
const PREVIOUS: &str = "personal-state-backup.previous.json";
const MAX_BYTES: usize = 8 * 1024 * 1024;
static BACKUP_LOCK: Mutex<()> = Mutex::new(());

fn history_count(value: &Value) -> usize {
    [
        "activityHistory",
        "boxes",
        "pointRounds",
        "manualBaselinePoints",
        "shinyMods",
    ]
    .iter()
    .filter_map(|field| value.get(*field).and_then(Value::as_array))
    .map(Vec::len)
    .sum()
}

fn validate(text: &str) -> Result<Value, String> {
    if text.len() > MAX_BYTES {
        return Err("El respaldo supera el tamaño permitido.".into());
    }
    let value: Value = serde_json::from_str(text)
        .map_err(|_| "El respaldo personal no contiene JSON válido.".to_string())?;
    if !value.is_object() {
        return Err("El respaldo personal no contiene un objeto válido.".into());
    }
    Ok(value)
}

fn protect_existing(existing: &str, incoming: &str) -> Result<String, String> {
    let old = validate(existing)?;
    let mut new = validate(incoming)?;
    if history_count(&old) > history_count(&new) {
        // Preserve missing histories without ignoring intentional action deletions.
        crate::local_sync::merge_live_personal_payloads(existing, incoming, true)
    } else {
        let original = new.clone();
        crate::local_sync::protect_box_closed_attempt(&old, &mut new);
        if new == original {
            return Ok(incoming.to_string());
        }
        serde_json::to_string(&new).map_err(|_| "No se pudo proteger el intento guardado.".into())
    }
}

pub fn load(directory: &Path) -> Result<Option<String>, String> {
    let _guard = BACKUP_LOCK
        .lock()
        .map_err(|_| "El respaldo está ocupado.".to_string())?;
    let primary = fs::read_to_string(directory.join(BACKUP))
        .ok()
        .filter(|text| validate(text).is_ok());
    let previous = fs::read_to_string(directory.join(PREVIOUS))
        .ok()
        .filter(|text| validate(text).is_ok());
    match (primary, previous) {
        (Some(primary), Some(previous)) => protect_existing(&previous, &primary).map(Some),
        (Some(text), None) | (None, Some(text)) => Ok(Some(text)),
        (None, None) => Ok(None),
    }
}

#[cfg(target_os = "windows")]
fn replace_file(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "kernel32")]
    extern "system" {
        fn MoveFileExW(existing: *const u16, new: *const u16, flags: u32) -> i32;
    }
    let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let target: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    // REPLACE_EXISTING | WRITE_THROUGH: never delete the active backup first.
    if unsafe { MoveFileExW(source.as_ptr(), target.as_ptr(), 0x1 | 0x8) } == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
fn replace_file(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::rename(source, target)
}

pub fn save(directory: &Path, incoming: &str) -> Result<String, String> {
    validate(incoming)?;
    let _guard = BACKUP_LOCK
        .lock()
        .map_err(|_| "El respaldo está ocupado.".to_string())?;
    fs::create_dir_all(directory)
        .map_err(|error| format!("No se pudo crear la carpeta de respaldo: {error}"))?;
    let path = directory.join(BACKUP);
    let previous = directory.join(PREVIOUS);
    let existing = fs::read_to_string(&path)
        .ok()
        .filter(|text| validate(text).is_ok());
    let data = match &existing {
        Some(text) => protect_existing(text, incoming)?,
        None => incoming.to_string(),
    };
    validate(&data)?;
    if existing.as_ref() == Some(&data) {
        return Ok(data);
    }
    let temporary = directory.join(format!("{BACKUP}.tmp"));
    let mut file = fs::File::create(&temporary)
        .map_err(|error| format!("No se pudo preparar el respaldo: {error}"))?;
    file.write_all(data.as_bytes())
        .and_then(|()| file.sync_all())
        .map_err(|error| format!("No se pudo guardar el progreso en disco: {error}"))?;
    drop(file);
    if existing.is_some() {
        fs::copy(&path, &previous)
            .and_then(|_| {
                fs::OpenOptions::new()
                    .write(true)
                    .open(&previous)?
                    .sync_all()
            })
            .map_err(|error| format!("No se pudo conservar el respaldo anterior: {error}"))?;
    }
    replace_file(&temporary, &path)
        .map_err(|error| format!("No se pudo activar el respaldo nuevo: {error}"))?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::atomic::{AtomicU64, Ordering};
    static SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn directory() -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "caja-backup-test-{}-{}",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ))
    }

    #[test]
    fn saves_last_edit_even_when_history_size_is_equal() {
        let directory = directory();
        let old = json!({"actions": [{"id": "a", "points": 1}], "activityHistory": [{"id": "a"}]})
            .to_string();
        let edited =
            json!({"actions": [{"id": "a", "points": 4}], "activityHistory": [{"id": "a"}]})
                .to_string();
        save(&directory, &old).unwrap();
        save(&directory, &edited).unwrap();
        assert_eq!(load(&directory).unwrap(), Some(edited));
        assert_eq!(fs::read_to_string(directory.join(PREVIOUS)).unwrap(), old);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn stale_write_cannot_revive_consumed_rewards_on_disk() {
        let directory = directory();
        let closed = json!({"actions":[{"id":"fresh","points":177}],"activityHistory":[{"id":"old"},{"id":"fresh"}],"boxes":[{"id":"box","actionIds":["old"]}]}).to_string();
        let stale = json!({"actions":[{"id":"old","points":987},{"id":"fresh","points":177}],"activityHistory":[{"id":"old"},{"id":"fresh"}],"boxes":[{"id":"box"}]}).to_string();
        save(&directory, &closed).unwrap();
        save(&directory, &stale).unwrap();
        let value: Value = serde_json::from_str(&load(&directory).unwrap().unwrap()).unwrap();
        assert_eq!(value["actions"].as_array().unwrap().len(), 1);
        assert_eq!(value["actions"][0]["points"], 177);
        assert_eq!(value["boxes"][0]["actionIds"][0], "old");
        assert_eq!(value["activityHistory"].as_array().unwrap().len(), 2);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn closure_protection_does_not_revert_other_local_edits() {
        let directory = directory();
        let old = json!({"actions":[],"activityHistory":[{"id":"old"}],"boxes":[{"id":"box","actionIds":["old"]}],"characters":[{"id":"character-main","name":"Old name"}],"shinyMods":[{"id":"mod","attempts":5}]}).to_string();
        let edited = json!({"actions":[],"activityHistory":[{"id":"old"}],"boxes":[{"id":"box","actionIds":["old"]}],"characters":[{"id":"character-main","name":"New name"}],"shinyMods":[{"id":"mod","attempts":4}]}).to_string();
        save(&directory, &old).unwrap();
        save(&directory, &edited).unwrap();
        let value: Value = serde_json::from_str(&load(&directory).unwrap().unwrap()).unwrap();
        assert_eq!(value["characters"][0]["name"], "New name");
        assert_eq!(value["shinyMods"][0]["attempts"], 4);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn invalid_save_does_not_replace_progress_and_corrupt_primary_recovers() {
        let directory = directory();
        let old = json!({"actions": [{"id": "a"}], "activityHistory": [{"id": "a"}]}).to_string();
        save(&directory, &old).unwrap();
        assert!(save(&directory, "[]").is_err());
        assert_eq!(load(&directory).unwrap(), Some(old.clone()));
        fs::copy(directory.join(BACKUP), directory.join(PREVIOUS)).unwrap();
        fs::write(directory.join(BACKUP), "broken").unwrap();
        assert_eq!(load(&directory).unwrap(), Some(old));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn fewer_records_preserve_missing_data_and_intentional_deletions() {
        let directory = directory();
        let old = json!({"actions": [{"id": "a", "points": 4}, {"id": "b", "points": 1}], "activityHistory": [{"id": "a"}, {"id": "b"}], "boxes": [{"id": "box"}]}).to_string();
        let deleted = json!({"actions": [{"id": "b", "points": 1}], "deletedActionIds": ["a"], "activityHistory": [{"id": "b"}], "boxes": []}).to_string();
        save(&directory, &old).unwrap();
        save(&directory, &deleted).unwrap();
        let recovered: Value = serde_json::from_str(&load(&directory).unwrap().unwrap()).unwrap();
        assert_eq!(recovered["actions"].as_array().unwrap().len(), 1);
        assert_eq!(recovered["actions"][0]["id"], "b");
        assert_eq!(recovered["boxes"][0]["id"], "box");
        assert_eq!(recovered["deletedActionIds"][0], "a");
        fs::remove_dir_all(directory).unwrap();
    }
}
