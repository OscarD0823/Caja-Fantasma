use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundSyncStatus {
    pub active: bool,
    pub connected: bool,
    pub revision: u64,
    pub updated_at: String,
    pub data_json: String,
    pub catalog_json: String,
    pub last_exchange_at: u64,
    pub message: String,
    #[serde(default)]
    pub connected_devices: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn passes_all_device_presence_from_kotlin_to_frontend() {
        let mut input = serde_json::json!({
            "active": true, "connected": true, "revision": 7,
            "updatedAt": "2026-10-08T12:00:00Z", "dataJson": "{}", "catalogJson": "{}",
            "lastExchangeAt": 1791460800000_u64, "message": "Connected",
            "connectedDevices": ["pc", "mobile", "web"]
        });
        let status: BackgroundSyncStatus = serde_json::from_value(input.clone()).unwrap();
        let output = serde_json::to_value(status).unwrap();
        assert_eq!(output["connectedDevices"], input["connectedDevices"]);
        input.as_object_mut().unwrap().remove("connectedDevices");
        let legacy: BackgroundSyncStatus = serde_json::from_value(input).unwrap();
        assert!(legacy.connected_devices.is_empty());
    }
}
