use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeSet;
use std::io::{Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream};
use std::time::Duration;
#[cfg(desktop)]
use std::time::{SystemTime, UNIX_EPOCH};

const LOCAL_SYNC_PROTOCOL: u8 = 1;
const DEFAULT_LOCAL_SYNC_PORT: u16 = 47_183;
const DEFAULT_WEB_SYNC_PORT: u16 = 48_183;
const MAX_SYNC_BYTES: usize = 8 * 1024 * 1024;
const MAX_CATALOG_BYTES: usize = 512 * 1024;

#[cfg(desktop)]
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSyncSnapshot {
    pub enabled: bool,
    pub revision: u64,
    pub updated_at: String,
    pub data_json: String,
    pub catalog_json: String,
    pub last_exchange_at: u64,
    pub last_mobile_update_at: u64,
}

#[cfg(desktop)]
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSyncInfo {
    pub enabled: bool,
    pub address: String,
    pub port: u16,
    pub web_address: String,
    pub web_port: u16,
    pub pairing_code: String,
    pub revision: u64,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalSyncRequest {
    protocol: u8,
    pairing_code: String,
    #[serde(default)]
    action: LocalSyncAction,
    #[serde(default)]
    known_revision: u64,
    updated_at: String,
    data_json: String,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
enum LocalSyncAction {
    Status,
    Pull,
    Push,
    Live,
    #[default]
    Auto,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSyncExchange {
    pub ok: bool,
    pub message: String,
    pub revision: u64,
    pub updated_at: String,
    pub data_json: String,
    pub catalog_json: String,
    pub last_exchange_at: u64,
}

fn parse_sync_action(action: &str) -> Result<LocalSyncAction, String> {
    match action.trim().to_ascii_lowercase().as_str() {
        "status" => Ok(LocalSyncAction::Status),
        "pull" => Ok(LocalSyncAction::Pull),
        "push" => Ok(LocalSyncAction::Push),
        "live" => Ok(LocalSyncAction::Live),
        "auto" => Ok(LocalSyncAction::Auto),
        _ => Err("La dirección de sincronización no es válida.".into()),
    }
}

fn validate_pairing_code(code: &str) -> Result<(), String> {
    if code.len() == 6 && code.bytes().all(|byte| byte.is_ascii_digit()) {
        Ok(())
    } else {
        Err("El código de conexión debe tener exactamente 6 números.".into())
    }
}

fn validate_sync_payload(data_json: &str, updated_at: &str) -> Result<(), String> {
    if data_json.len() > MAX_SYNC_BYTES {
        return Err("Los datos personales superan el límite de 8 MB.".into());
    }
    let timestamp = updated_at.as_bytes();
    let valid_timestamp = timestamp.len() == 24
        && timestamp[4] == b'-'
        && timestamp[7] == b'-'
        && timestamp[10] == b'T'
        && timestamp[13] == b':'
        && timestamp[16] == b':'
        && timestamp[19] == b'.'
        && timestamp[23] == b'Z'
        && timestamp.iter().enumerate().all(|(index, byte)| {
            matches!(index, 4 | 7 | 10 | 13 | 16 | 19 | 23) || byte.is_ascii_digit()
        });
    if !valid_timestamp {
        return Err("La fecha de sincronización no es válida.".into());
    }
    let value: Value = serde_json::from_str(data_json)
        .map_err(|_| "Los datos personales no contienen JSON válido.".to_string())?;
    if !value.is_object() {
        return Err("Los datos personales deben ser un objeto JSON.".into());
    }
    Ok(())
}

fn validate_catalog_payload(catalog_json: &str) -> Result<(), String> {
    if catalog_json.len() > MAX_CATALOG_BYTES {
        return Err("El catálogo público supera el límite permitido.".into());
    }
    let value: Value = serde_json::from_str(catalog_json)
        .map_err(|_| "El catálogo público no contiene JSON válido.".to_string())?;
    if !value.is_object() {
        return Err("El catálogo público debe ser un objeto JSON.".into());
    }
    Ok(())
}

fn durable_record_ids(data: &serde_json::Map<String, Value>) -> BTreeSet<String> {
    const FIELDS: [&str; 3] = ["activityHistory", "boxes", "pointRounds"];
    let mut ids = BTreeSet::new();
    for field in FIELDS {
        let Some(records) = data.get(field).and_then(Value::as_array) else {
            continue;
        };
        for (index, record) in records.iter().enumerate() {
            let identity = record
                .get("id")
                .and_then(Value::as_str)
                .map(str::to_owned)
                .unwrap_or_else(|| format!("index-{index}:{record}"));
            ids.insert(format!("{field}:{identity}"));
        }
    }
    ids
}

fn merge_id_array(current: Option<&Value>, incoming: Option<&Value>, field: &str) -> Value {
    let mut merged = current
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let Some(incoming) = incoming.and_then(Value::as_array) else {
        return Value::Array(merged);
    };
    for candidate in incoming {
        let Some(id) = candidate.get("id").and_then(Value::as_str) else {
            if !merged.contains(candidate) {
                merged.push(candidate.clone());
            }
            continue;
        };
        let Some(index) = merged
            .iter()
            .position(|item| item.get("id").and_then(Value::as_str) == Some(id))
        else {
            merged.push(candidate.clone());
            continue;
        };
        if field == "shinyMods" {
            let existing_attempts = merged[index]
                .get("attempts")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            let incoming_attempts = candidate
                .get("attempts")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            let existing_shiny = merged[index]
                .get("isShiny")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let incoming_shiny = candidate
                .get("isShiny")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            if let Some(existing) = merged[index].as_object_mut() {
                existing.insert(
                    "attempts".into(),
                    Value::Number(existing_attempts.max(incoming_attempts).into()),
                );
                existing.insert(
                    "isShiny".into(),
                    Value::Bool(existing_shiny || incoming_shiny),
                );
                if existing.get("obtainedAt").and_then(Value::as_str).is_none() {
                    if let Some(obtained_at) = candidate.get("obtainedAt") {
                        existing.insert("obtainedAt".into(), obtained_at.clone());
                    }
                }
            }
        }
    }
    Value::Array(merged)
}

fn merge_string_array(current: Option<&Value>, incoming: Option<&Value>) -> Value {
    let mut merged = current
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if let Some(incoming) = incoming.and_then(Value::as_array) {
        for candidate in incoming {
            if candidate.is_string() && !merged.contains(candidate) {
                merged.push(candidate.clone());
            }
        }
    }
    Value::Array(merged)
}

pub(crate) fn merge_live_personal_payloads(
    current_json: &str,
    incoming_json: &str,
    prefer_incoming_on_equal: bool,
) -> Result<String, String> {
    const ID_ARRAY_FIELDS: [&str; 5] = [
        "activityHistory",
        "boxes",
        "pointRounds",
        "shinyMods",
        "characters",
    ];
    let Value::Object(mut current) = serde_json::from_str::<Value>(current_json)
        .map_err(|_| "Los datos actuales no contienen JSON válido.".to_string())?
    else {
        return Err("Los datos actuales deben ser un objeto JSON.".into());
    };
    let original = Value::Object(current.clone());
    let Value::Object(incoming) = serde_json::from_str::<Value>(incoming_json)
        .map_err(|_| "Los datos entrantes no contienen JSON válido.".to_string())?
    else {
        return Err("Los datos entrantes deben ser un objeto JSON.".into());
    };
    let known_personal_fields = [
        "actions",
        "activityHistory",
        "boxes",
        "pointRounds",
        "manualBaselinePoints",
        "shinyMods",
        "characters",
    ];
    if !known_personal_fields
        .iter()
        .any(|field| current.contains_key(*field) || incoming.contains_key(*field))
    {
        return Ok(if prefer_incoming_on_equal {
            incoming_json.to_string()
        } else {
            current_json.to_string()
        });
    }
    let current_durable_ids = durable_record_ids(&current);
    let incoming_durable_ids = durable_record_ids(&incoming);
    let current_contains_incoming = incoming_durable_ids.is_subset(&current_durable_ids);
    let incoming_contains_current = current_durable_ids.is_subset(&incoming_durable_ids);
    let incoming_dominates = incoming_contains_current && !current_contains_incoming;
    let current_dominates = current_contains_incoming && !incoming_contains_current;

    if current.contains_key("actions") || incoming.contains_key("actions") {
        let actions = if current_dominates {
            current
                .get("actions")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
        } else if incoming_dominates || (current_contains_incoming && prefer_incoming_on_equal) {
            incoming
                .get("actions")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default()
        } else {
            merge_id_array(current.get("actions"), incoming.get("actions"), "actions")
                .as_array()
                .cloned()
                .unwrap_or_default()
        };
        current.insert("actions".into(), Value::Array(actions));
    }

    for field in ID_ARRAY_FIELDS {
        if !current.contains_key(field) && !incoming.contains_key(field) {
            continue;
        }
        let value = merge_id_array(current.get(field), incoming.get(field), field);
        current.insert(field.into(), value);
    }
    if current.contains_key("manualBaselinePoints") || incoming.contains_key("manualBaselinePoints")
    {
        let baselines = match (
            current
                .get("manualBaselinePoints")
                .and_then(Value::as_array),
            incoming
                .get("manualBaselinePoints")
                .and_then(Value::as_array),
        ) {
            (Some(existing), Some(candidate)) if candidate.len() > existing.len() => {
                candidate.clone()
            }
            (Some(existing), _) => existing.clone(),
            (None, Some(candidate)) => candidate.clone(),
            (None, None) => Vec::new(),
        };
        current.insert("manualBaselinePoints".into(), Value::Array(baselines));
    }
    if current.contains_key("teamMemberIds") || incoming.contains_key("teamMemberIds") {
        let team_member_ids =
            merge_string_array(current.get("teamMemberIds"), incoming.get("teamMemberIds"));
        current.insert("teamMemberIds".into(), team_member_ids);
    }
    let mut boundaries = current
        .get("pointRoundBoundaries")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    if let Some(incoming_boundaries) = incoming
        .get("pointRoundBoundaries")
        .and_then(Value::as_object)
    {
        for (key, value) in incoming_boundaries {
            let should_replace = match (boundaries.get(key).and_then(Value::as_str), value.as_str())
            {
                (Some(existing), Some(candidate)) => candidate > existing,
                (None, Some(_)) => true,
                _ => false,
            };
            if should_replace {
                boundaries.insert(key.clone(), value.clone());
            }
        }
    }
    if current.contains_key("pointRoundBoundaries") || incoming.contains_key("pointRoundBoundaries")
    {
        current.insert("pointRoundBoundaries".into(), Value::Object(boundaries));
    }

    if incoming_dominates || (!current_dominates && !incoming_dominates && prefer_incoming_on_equal)
    {
        for field in ["activeCharacterId", "trackingMode", "activeTeamSessionId"] {
            if let Some(value) = incoming.get(field) {
                current.insert(field.into(), value.clone());
            }
        }
    }
    let merged = Value::Object(current);
    if merged == original {
        return Ok(current_json.to_string());
    }
    serde_json::to_string(&merged)
        .map_err(|_| "No se pudieron combinar los datos personales.".into())
}

fn read_json_line(stream: &mut TcpStream) -> Result<String, String> {
    let mut result = Vec::new();
    let mut chunk = [0_u8; 8_192];
    loop {
        let read = match stream.read(&mut chunk) {
            Ok(read) => read,
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                ) =>
            {
                return Err(
                    "La conexión tardó demasiado en enviar los datos. Intenta sincronizar otra vez."
                        .into(),
                );
            }
            Err(error) => return Err(format!("No se pudieron leer los datos: {error}")),
        };
        if read == 0 {
            break;
        }
        let bytes = &chunk[..read];
        if let Some(end) = bytes.iter().position(|byte| *byte == b'\n') {
            if result.len().saturating_add(end) > MAX_SYNC_BYTES {
                return Err("La solicitud de sincronización supera el límite permitido.".into());
            }
            result.extend_from_slice(&bytes[..end]);
            break;
        }
        result.extend_from_slice(bytes);
        if result.len() > MAX_SYNC_BYTES {
            return Err("La solicitud de sincronización supera el límite permitido.".into());
        }
    }
    String::from_utf8(result).map_err(|_| "La solicitud no usa texto UTF-8 válido.".into())
}

fn write_json_line<T: Serialize>(stream: &mut TcpStream, value: &T) -> Result<(), String> {
    let mut body = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    body.push(b'\n');
    stream
        .write_all(&body)
        .map_err(|error| format!("No se pudo enviar la respuesta: {error}"))?;
    stream.flush().map_err(|error| error.to_string())
}

fn is_local_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => ip.is_private() || ip.is_loopback() || ip.is_link_local(),
        IpAddr::V6(ip) => ip.is_loopback() || ip.is_unique_local() || ip.is_unicast_link_local(),
    }
}

fn local_socket_address(address: &str) -> Result<SocketAddr, String> {
    let cleaned = address
        .trim()
        .trim_start_matches("http://")
        .trim_start_matches("https://")
        .trim_end_matches('/');
    let socket = if let Ok(socket) = cleaned.parse::<SocketAddr>() {
        socket
    } else if let Ok(ip) = cleaned.parse::<IpAddr>() {
        SocketAddr::new(ip, DEFAULT_LOCAL_SYNC_PORT)
    } else {
        return Err(
            "Escribe la dirección IP mostrada en el PC, por ejemplo 192.168.1.20:47183.".into(),
        );
    };
    if !is_local_ip(socket.ip()) {
        return Err(
            "Por seguridad, la sincronización solo acepta direcciones de la red local.".into(),
        );
    }
    Ok(socket)
}

fn mobile_sync_exchange_blocking(
    address: String,
    pairing_code: String,
    action: LocalSyncAction,
    known_revision: u64,
    data_json: String,
    updated_at: String,
) -> Result<LocalSyncExchange, String> {
    validate_pairing_code(&pairing_code)?;
    validate_sync_payload(&data_json, &updated_at)?;
    let socket = local_socket_address(&address)?;
    let timeout = Duration::from_secs(4);
    let mut stream = TcpStream::connect_timeout(&socket, timeout)
        .map_err(|_| "No se encontró el PC. Comprueba la IP, el código y que ambas aplicaciones estén abiertas.".to_string())?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|error| error.to_string())?;
    write_json_line(
        &mut stream,
        &LocalSyncRequest {
            protocol: LOCAL_SYNC_PROTOCOL,
            pairing_code,
            action,
            known_revision,
            updated_at,
            data_json,
        },
    )?;
    let response = read_json_line(&mut stream)?;
    let exchange: LocalSyncExchange = serde_json::from_str(&response)
        .map_err(|_| "El PC devolvió una respuesta de sincronización inválida.".to_string())?;
    if !exchange.ok {
        return Err(exchange.message);
    }
    validate_sync_payload(&exchange.data_json, &exchange.updated_at)?;
    Ok(exchange)
}

#[tauri::command]
pub async fn mobile_sync_exchange(
    address: String,
    pairing_code: String,
    action: String,
    known_revision: u64,
    data_json: String,
    updated_at: String,
) -> Result<LocalSyncExchange, String> {
    let action = parse_sync_action(&action)?;
    tauri::async_runtime::spawn_blocking(move || {
        mobile_sync_exchange_blocking(
            address,
            pairing_code,
            action,
            known_revision,
            data_json,
            updated_at,
        )
    })
    .await
    .map_err(|error| format!("La conexión local se interrumpió: {error}"))?
}

#[cfg(desktop)]
mod desktop {
    use super::*;
    use std::net::{TcpListener, UdpSocket};
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex, OnceLock,
    };
    use std::thread;

    #[derive(Clone)]
    struct ServerState {
        enabled: Arc<AtomicBool>,
        live_enabled: Arc<AtomicBool>,
        pairing_code: Arc<Mutex<String>>,
        snapshot: Arc<Mutex<LocalSyncSnapshot>>,
        address: String,
        port: u16,
        web_port: u16,
    }

    static LOCAL_SYNC_SERVER: OnceLock<ServerState> = OnceLock::new();

    fn local_ip_address() -> String {
        UdpSocket::bind("0.0.0.0:0")
            .and_then(|socket| {
                socket.connect("192.0.2.1:80")?;
                socket.local_addr()
            })
            .map(|address| address.ip().to_string())
            .unwrap_or_else(|_| "127.0.0.1".into())
    }

    fn bind_listener() -> Result<(TcpListener, u16), String> {
        for port in DEFAULT_LOCAL_SYNC_PORT..=DEFAULT_LOCAL_SYNC_PORT + 10 {
            if let Ok(listener) = TcpListener::bind(("0.0.0.0", port)) {
                listener
                    .set_nonblocking(true)
                    .map_err(|error| error.to_string())?;
                return Ok((listener, port));
            }
        }
        Err("No se encontró un puerto disponible para conectar el celular.".into())
    }

    fn bind_web_listener() -> Result<(TcpListener, u16), String> {
        for port in DEFAULT_WEB_SYNC_PORT..=DEFAULT_WEB_SYNC_PORT + 10 {
            if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
                listener
                    .set_nonblocking(true)
                    .map_err(|error| error.to_string())?;
                return Ok((listener, port));
            }
        }
        Err("No se encontró un puerto disponible para conectar la página web.".into())
    }

    fn write_http_response(stream: &mut TcpStream, status: &str, origin: &str, body: &str) {
        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: {origin}\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nAccess-Control-Allow-Private-Network: true\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
    }

    fn process_web_client(mut stream: TcpStream, peer_address: SocketAddr, state: &ServerState) {
        let timeout = Some(Duration::from_secs(4));
        let _ = stream.set_nonblocking(false);
        let _ = stream.set_read_timeout(timeout);
        let _ = stream.set_write_timeout(timeout);
        if !is_local_ip(peer_address.ip()) {
            return;
        }

        let mut request_bytes = Vec::new();
        let mut chunk = [0_u8; 8_192];
        let mut header_end = None;
        let mut content_length = 0usize;
        loop {
            let Ok(read) = stream.read(&mut chunk) else {
                return;
            };
            if read == 0 {
                break;
            }
            request_bytes.extend_from_slice(&chunk[..read]);
            if request_bytes.len() > MAX_SYNC_BYTES + 16_384 {
                return;
            }
            if header_end.is_none() {
                header_end = request_bytes
                    .windows(4)
                    .position(|window| window == b"\r\n\r\n")
                    .map(|index| index + 4);
                if let Some(end) = header_end {
                    let headers = String::from_utf8_lossy(&request_bytes[..end]);
                    content_length = headers
                        .lines()
                        .find_map(|line| {
                            line.strip_prefix("Content-Length:")
                                .or_else(|| line.strip_prefix("content-length:"))
                        })
                        .and_then(|value| value.trim().parse().ok())
                        .unwrap_or(0);
                }
            }
            if let Some(end) = header_end {
                if request_bytes.len() >= end.saturating_add(content_length) {
                    break;
                }
            }
        }
        let Some(end) = header_end else {
            return;
        };
        let headers = String::from_utf8_lossy(&request_bytes[..end]);
        let origin = headers
            .lines()
            .find_map(|line| {
                line.strip_prefix("Origin:")
                    .or_else(|| line.strip_prefix("origin:"))
            })
            .map(str::trim)
            .unwrap_or("");
        let allowed_origin = matches!(
            origin,
            "https://oscard0823.github.io" | "http://localhost:1420" | "http://127.0.0.1:1420"
        );
        let response_origin = if allowed_origin { origin } else { "null" };
        if headers.starts_with("OPTIONS ") {
            write_http_response(&mut stream, "204 No Content", response_origin, "");
            return;
        }
        if !allowed_origin || !headers.starts_with("POST /sync ") {
            write_http_response(
                &mut stream,
                "403 Forbidden",
                response_origin,
                r#"{"ok":false,"message":"Origen web no autorizado."}"#,
            );
            return;
        }
        let body_end = end.saturating_add(content_length).min(request_bytes.len());
        let request = serde_json::from_slice::<LocalSyncRequest>(&request_bytes[end..body_end]);
        let exchange = match request {
            Ok(request) => {
                process_sync_request(request, peer_address, state).unwrap_or_else(error_exchange)
            }
            _ => error_exchange("La solicitud de la página no es válida.".into()),
        };
        let body = serde_json::to_string(&exchange).unwrap_or_else(|_| {
            r#"{"ok":false,"message":"No se pudo preparar la respuesta."}"#.into()
        });
        write_http_response(
            &mut stream,
            if exchange.ok {
                "200 OK"
            } else {
                "400 Bad Request"
            },
            response_origin,
            &body,
        );
    }

    fn error_exchange(message: String) -> LocalSyncExchange {
        LocalSyncExchange {
            ok: false,
            message,
            revision: 0,
            updated_at: "1970-01-01T00:00:00.000Z".into(),
            data_json: "{}".into(),
            catalog_json: "{}".into(),
            last_exchange_at: 0,
        }
    }

    fn process_sync_request(
        request: LocalSyncRequest,
        peer_address: SocketAddr,
        state: &ServerState,
    ) -> Result<LocalSyncExchange, String> {
        if !is_local_ip(peer_address.ip()) {
            return Err("La sincronización solo acepta equipos de la red local.".into());
        }
        if !state.enabled.load(Ordering::Relaxed) {
            return Err("La sincronización está desactivada en el PC.".into());
        }
        if request.protocol != LOCAL_SYNC_PROTOCOL {
            return Err(
                "La versión de sincronización no coincide. Actualiza ambas aplicaciones.".into(),
            );
        }
        validate_pairing_code(&request.pairing_code)?;
        let expected_code = state
            .pairing_code
            .lock()
            .map_err(|_| "No se pudo comprobar el código.".to_string())?
            .clone();
        if request.pairing_code != expected_code {
            return Err("El código de conexión no coincide con el del PC.".into());
        }
        if request.action == LocalSyncAction::Live && !state.live_enabled.load(Ordering::Relaxed) {
            return Err("Activa Sincronización en vivo también en el PC.".into());
        }
        validate_sync_payload(&request.data_json, &request.updated_at)?;
        let mut snapshot = state
            .snapshot
            .lock()
            .map_err(|_| "No se pudieron abrir los datos compartidos.".to_string())?;
        let exchange_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0);
        snapshot.last_exchange_at = exchange_at;
        match request.action {
            LocalSyncAction::Push => {
                // Una transferencia manual también combina los historiales conocidos. Así,
                // una página o un teléfono atrasados nunca pueden borrar la copia más completa.
                let protected_data =
                    merge_live_personal_payloads(&snapshot.data_json, &request.data_json, true)
                        .unwrap_or_else(|_| request.data_json.clone());
                if request.updated_at != snapshot.updated_at || protected_data != snapshot.data_json
                {
                    snapshot.revision = snapshot.revision.saturating_add(1);
                }
                snapshot.updated_at = request.updated_at;
                snapshot.data_json = protected_data;
                snapshot.last_mobile_update_at = exchange_at;
            }
            LocalSyncAction::Auto if request.updated_at > snapshot.updated_at => {
                let merged =
                    merge_live_personal_payloads(&snapshot.data_json, &request.data_json, true)?;
                if merged != snapshot.data_json {
                    snapshot.data_json = merged;
                    snapshot.revision = snapshot.revision.saturating_add(1);
                    snapshot.last_mobile_update_at = exchange_at;
                }
                snapshot.updated_at = request.updated_at.max(snapshot.updated_at.clone());
            }
            LocalSyncAction::Live => {
                let acknowledged_current =
                    request.known_revision != 0 && request.known_revision == snapshot.revision;
                let merged = merge_live_personal_payloads(
                    &snapshot.data_json,
                    &request.data_json,
                    acknowledged_current,
                )?;
                if merged != snapshot.data_json {
                    snapshot.revision = snapshot.revision.saturating_add(1);
                    snapshot.updated_at = request.updated_at.max(snapshot.updated_at.clone());
                    snapshot.data_json = merged;
                    snapshot.last_mobile_update_at = exchange_at;
                }
            }
            LocalSyncAction::Status | LocalSyncAction::Pull | LocalSyncAction::Auto => {}
        }
        let (response_updated_at, response_data_json) = if request.action == LocalSyncAction::Status
        {
            ("1970-01-01T00:00:00.000Z".into(), "{}".into())
        } else {
            (snapshot.updated_at.clone(), snapshot.data_json.clone())
        };
        Ok(LocalSyncExchange {
            ok: true,
            message: match request.action {
                LocalSyncAction::Status => "PC conectado.".into(),
                LocalSyncAction::Pull => "Datos del PC listos para el dispositivo.".into(),
                LocalSyncAction::Push => "Datos del dispositivo guardados en el PC.".into(),
                LocalSyncAction::Live => "Cambios en vivo sincronizados.".into(),
                LocalSyncAction::Auto => "Datos sincronizados directamente con el PC.".into(),
            },
            revision: snapshot.revision,
            updated_at: response_updated_at,
            data_json: response_data_json,
            catalog_json: snapshot.catalog_json.clone(),
            last_exchange_at: snapshot.last_exchange_at,
        })
    }

    fn process_client(mut stream: TcpStream, peer_address: SocketAddr, state: &ServerState) {
        let timeout = Some(Duration::from_secs(4));
        let response = (|| -> Result<LocalSyncExchange, String> {
            // Un socket aceptado puede conservar el modo no bloqueante del listener. Volverlo
            // bloqueante evita WSAEWOULDBLOCK (10035) y los timeouts limitan cada cliente.
            stream
                .set_nonblocking(false)
                .map_err(|error| format!("No se pudo preparar la conexión local: {error}"))?;
            stream
                .set_read_timeout(timeout)
                .map_err(|error| format!("No se pudo preparar la lectura local: {error}"))?;
            stream
                .set_write_timeout(timeout)
                .map_err(|error| format!("No se pudo preparar el envío local: {error}"))?;
            let body = read_json_line(&mut stream)?;
            let request: LocalSyncRequest = serde_json::from_str(&body)
                .map_err(|_| "La solicitud del celular no es válida.".to_string())?;
            process_sync_request(request, peer_address, state)
        })()
        .unwrap_or_else(error_exchange);
        let _ = write_json_line(&mut stream, &response);
    }

    fn process_unified_client(stream: TcpStream, peer_address: SocketAddr, state: &ServerState) {
        let timeout = Some(Duration::from_secs(4));
        let _ = stream.set_nonblocking(false);
        let _ = stream.set_read_timeout(timeout);
        let mut first_byte = [0_u8; 1];
        let is_http =
            matches!(stream.peek(&mut first_byte), Ok(1)) && matches!(first_byte[0], b'O' | b'P');
        if is_http {
            process_web_client(stream, peer_address, state);
        } else {
            process_client(stream, peer_address, state);
        }
    }

    fn create_server(
        pairing_code: String,
        data_json: String,
        updated_at: String,
        catalog_json: String,
        live_enabled: bool,
    ) -> Result<ServerState, String> {
        let (listener, port) = bind_listener()?;
        let (web_listener, _legacy_web_port) = bind_web_listener()?;
        let state = ServerState {
            enabled: Arc::new(AtomicBool::new(true)),
            live_enabled: Arc::new(AtomicBool::new(live_enabled)),
            pairing_code: Arc::new(Mutex::new(pairing_code)),
            snapshot: Arc::new(Mutex::new(LocalSyncSnapshot {
                enabled: true,
                revision: 1,
                updated_at,
                data_json,
                catalog_json,
                last_exchange_at: 0,
                last_mobile_update_at: 0,
            })),
            address: local_ip_address(),
            port,
            web_port: port,
        };
        let thread_state = state.clone();
        thread::Builder::new()
            .name("caja-fantasma-local-sync".into())
            .spawn(move || loop {
                match listener.accept() {
                    Ok((stream, peer_address)) => {
                        process_unified_client(stream, peer_address, &thread_state)
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(90));
                    }
                    Err(_) => thread::sleep(Duration::from_millis(250)),
                }
            })
            .map_err(|error| format!("No se pudo iniciar la conexión local: {error}"))?;
        let legacy_web_state = state.clone();
        thread::Builder::new()
            .name("caja-fantasma-web-bridge".into())
            .spawn(move || loop {
                match web_listener.accept() {
                    Ok((stream, peer_address)) => {
                        process_web_client(stream, peer_address, &legacy_web_state)
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(90))
                    }
                    Err(_) => thread::sleep(Duration::from_millis(250)),
                }
            })
            .map_err(|error| format!("No se pudo iniciar el puente web: {error}"))?;
        Ok(state)
    }

    fn info(state: &ServerState) -> Result<LocalSyncInfo, String> {
        let revision = state
            .snapshot
            .lock()
            .map_err(|_| "No se pudo leer la revisión compartida.".to_string())?
            .revision;
        Ok(LocalSyncInfo {
            enabled: state.enabled.load(Ordering::Relaxed),
            address: format!("{}:{}", state.address, state.port),
            port: state.port,
            web_address: format!("{}:{}", state.address, state.web_port),
            web_port: state.web_port,
            pairing_code: state
                .pairing_code
                .lock()
                .map_err(|_| "No se pudo leer el código de conexión.".to_string())?
                .clone(),
            revision,
        })
    }

    pub fn start(
        pairing_code: String,
        data_json: String,
        updated_at: String,
        catalog_json: String,
        live_enabled: bool,
    ) -> Result<LocalSyncInfo, String> {
        validate_pairing_code(&pairing_code)?;
        validate_sync_payload(&data_json, &updated_at)?;
        validate_catalog_payload(&catalog_json)?;
        if LOCAL_SYNC_SERVER.get().is_none() {
            let server = create_server(
                pairing_code.clone(),
                data_json.clone(),
                updated_at.clone(),
                catalog_json.clone(),
                live_enabled,
            )?;
            let _ = LOCAL_SYNC_SERVER.set(server);
        }
        let state = LOCAL_SYNC_SERVER
            .get()
            .ok_or_else(|| "No se pudo iniciar el servidor local.".to_string())?;
        state.enabled.store(true, Ordering::Relaxed);
        state.live_enabled.store(live_enabled, Ordering::Relaxed);
        *state
            .pairing_code
            .lock()
            .map_err(|_| "No se pudo guardar el código de conexión.".to_string())? = pairing_code;
        let known_revision = state
            .snapshot
            .lock()
            .map_err(|_| "No se pudo leer la revisión compartida.".to_string())?
            .revision;
        update(
            data_json,
            updated_at,
            catalog_json,
            live_enabled,
            known_revision,
        )?;
        info(state)
    }

    pub fn stop() -> Result<(), String> {
        if let Some(state) = LOCAL_SYNC_SERVER.get() {
            state.enabled.store(false, Ordering::Relaxed);
            if let Ok(mut snapshot) = state.snapshot.lock() {
                snapshot.enabled = false;
            }
        }
        Ok(())
    }

    pub fn update(
        data_json: String,
        updated_at: String,
        catalog_json: String,
        live_enabled: bool,
        known_revision: u64,
    ) -> Result<u64, String> {
        validate_sync_payload(&data_json, &updated_at)?;
        validate_catalog_payload(&catalog_json)?;
        let state = LOCAL_SYNC_SERVER
            .get()
            .ok_or_else(|| "La sincronización local todavía no está iniciada.".to_string())?;
        state.live_enabled.store(live_enabled, Ordering::Relaxed);
        let mut snapshot = state
            .snapshot
            .lock()
            .map_err(|_| "No se pudieron actualizar los datos compartidos.".to_string())?;
        let acknowledged_current =
            live_enabled && known_revision != 0 && known_revision == snapshot.revision;
        let synchronized_data = if live_enabled {
            merge_live_personal_payloads(&snapshot.data_json, &data_json, acknowledged_current)?
        } else {
            data_json.clone()
        };
        let recovered_conflict = live_enabled && synchronized_data != data_json;
        if updated_at != snapshot.updated_at || synchronized_data != snapshot.data_json {
            snapshot.revision = snapshot.revision.saturating_add(1);
            snapshot.updated_at = updated_at;
            snapshot.data_json = synchronized_data;
            if recovered_conflict {
                snapshot.last_mobile_update_at = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_millis() as u64)
                    .unwrap_or(snapshot.last_mobile_update_at);
            }
        }
        snapshot.catalog_json = catalog_json;
        snapshot.enabled = state.enabled.load(Ordering::Relaxed);
        Ok(snapshot.revision)
    }

    pub fn read() -> Result<LocalSyncSnapshot, String> {
        let state = LOCAL_SYNC_SERVER
            .get()
            .ok_or_else(|| "La sincronización local todavía no está iniciada.".to_string())?;
        let mut snapshot = state
            .snapshot
            .lock()
            .map_err(|_| "No se pudieron leer los datos compartidos.".to_string())?
            .clone();
        snapshot.enabled = state.enabled.load(Ordering::Relaxed);
        Ok(snapshot)
    }
}

#[cfg(desktop)]
#[tauri::command]
pub fn start_local_sync(
    pairing_code: String,
    data_json: String,
    updated_at: String,
    catalog_json: String,
    live_enabled: bool,
) -> Result<LocalSyncInfo, String> {
    desktop::start(
        pairing_code,
        data_json,
        updated_at,
        catalog_json,
        live_enabled,
    )
}

#[cfg(desktop)]
#[tauri::command]
pub fn stop_local_sync() -> Result<(), String> {
    desktop::stop()
}

#[cfg(desktop)]
#[tauri::command]
pub fn update_local_sync_state(
    data_json: String,
    updated_at: String,
    catalog_json: String,
    live_enabled: bool,
    known_revision: u64,
) -> Result<u64, String> {
    desktop::update(
        data_json,
        updated_at,
        catalog_json,
        live_enabled,
        known_revision,
    )
}

#[cfg(desktop)]
#[tauri::command]
pub fn read_local_sync_state() -> Result<LocalSyncSnapshot, String> {
    desktop::read()
}

#[cfg(all(test, desktop))]
mod tests {
    use super::*;

    fn assert_json_eq(left: &str, right: &str) {
        let left: Value = serde_json::from_str(left).expect("left JSON should be valid");
        let right: Value = serde_json::from_str(right).expect("right JSON should be valid");
        assert_eq!(left, right);
    }

    #[test]
    fn merges_concurrent_live_histories_without_losing_either_device() {
        let computer = r#"{"actions":[{"id":"pc-action"}],"activityHistory":[{"id":"pc-history"}],"boxes":[],"pointRounds":[],"pointRoundBoundaries":{"solo:main":"2026-09-21T10:00:00.000Z"},"manualBaselinePoints":[],"shinyMods":[{"id":"mod-1","attempts":4,"isShiny":false}],"characters":[{"id":"main","name":"Principal"}],"teamMemberIds":["main"]}"#;
        let phone = r#"{"actions":[{"id":"phone-action"}],"activityHistory":[{"id":"phone-history"}],"boxes":[],"pointRounds":[],"pointRoundBoundaries":{"solo:main":"2026-09-21T10:05:00.000Z"},"manualBaselinePoints":[],"shinyMods":[{"id":"mod-1","attempts":6,"isShiny":true}],"characters":[{"id":"main","name":"Principal"},{"id":"alt","name":"Alterno"}],"teamMemberIds":["alt"]}"#;

        let merged = merge_live_personal_payloads(computer, phone, false)
            .expect("both histories should merge");
        let value: Value = serde_json::from_str(&merged).expect("merged JSON should remain valid");

        assert_eq!(value["actions"].as_array().map(Vec::len), Some(2));
        assert_eq!(value["activityHistory"].as_array().map(Vec::len), Some(2));
        assert_eq!(value["characters"].as_array().map(Vec::len), Some(2));
        assert_eq!(value["shinyMods"][0]["attempts"].as_u64(), Some(6));
        assert_eq!(value["shinyMods"][0]["isShiny"].as_bool(), Some(true));
        assert_eq!(
            value["pointRoundBoundaries"]["solo:main"].as_str(),
            Some("2026-09-21T10:05:00.000Z")
        );
        assert_eq!(value["teamMemberIds"].as_array().map(Vec::len), Some(2));
    }

    #[test]
    fn rejects_a_nonempty_but_stale_live_snapshot() {
        let rich = r#"{"actions":[{"id":"a"},{"id":"b"},{"id":"c"}],"activityHistory":[{"id":"a"},{"id":"b"},{"id":"c"}],"boxes":[],"pointRounds":[{"id":"round-a"}],"manualBaselinePoints":[],"shinyMods":[],"characters":[]}"#;
        let stale = r#"{"actions":[{"id":"a"}],"activityHistory":[{"id":"a"}],"boxes":[],"pointRounds":[],"manualBaselinePoints":[],"shinyMods":[],"characters":[]}"#;

        let protected_pc = merge_live_personal_payloads(rich, stale, true)
            .expect("an acknowledged stale phone must not replace richer PC data");
        let protected_pc: Value = serde_json::from_str(&protected_pc).expect("valid JSON");
        assert_eq!(protected_pc["actions"].as_array().map(Vec::len), Some(3));
        assert_eq!(
            protected_pc["activityHistory"].as_array().map(Vec::len),
            Some(3)
        );

        let recovered_pc = merge_live_personal_payloads(stale, rich, false)
            .expect("a richer phone must recover a stale PC even during a revision conflict");
        let recovered_pc: Value = serde_json::from_str(&recovered_pc).expect("valid JSON");
        assert_eq!(recovered_pc["actions"].as_array().map(Vec::len), Some(3));
        assert_eq!(
            recovered_pc["pointRounds"].as_array().map(Vec::len),
            Some(1)
        );
    }

    #[test]
    fn keeps_an_intentional_attempt_reset_when_a_box_is_newer() {
        let before_box = r#"{"actions":[{"id":"a"},{"id":"b"}],"activityHistory":[{"id":"a"},{"id":"b"}],"boxes":[],"pointRounds":[],"manualBaselinePoints":[],"shinyMods":[],"characters":[]}"#;
        let after_box = r#"{"actions":[],"activityHistory":[{"id":"a"},{"id":"b"}],"boxes":[{"id":"box-a"}],"pointRounds":[],"manualBaselinePoints":[],"shinyMods":[],"characters":[]}"#;

        let merged = merge_live_personal_payloads(before_box, after_box, true)
            .expect("a newer box should remain authoritative for the active attempt");
        let merged: Value = serde_json::from_str(&merged).expect("valid JSON");
        assert_eq!(merged["actions"].as_array().map(Vec::len), Some(0));
        assert_eq!(merged["activityHistory"].as_array().map(Vec::len), Some(2));
        assert_eq!(merged["boxes"].as_array().map(Vec::len), Some(1));
    }

    #[test]
    fn supports_explicit_sync_directions_over_loopback() {
        let code = "482731".to_string();
        let initial_date = "2026-09-13T10:00:00.000Z".to_string();
        let latest_date = "2026-09-13T10:01:00.000Z".to_string();
        let catalog = "{\"catalogVersion\":41}".to_string();
        let info = desktop::start(
            code.clone(),
            "{\"points\":1}".into(),
            initial_date,
            catalog.clone(),
            true,
        )
        .expect("the local server should start");
        let address = format!("127.0.0.1:{}", info.port);
        let web_address = format!("127.0.0.1:{}", info.web_port);
        let web_body = serde_json::to_string(&LocalSyncRequest {
            protocol: LOCAL_SYNC_PROTOCOL,
            pairing_code: code.clone(),
            action: LocalSyncAction::Status,
            known_revision: 0,
            updated_at: "1970-01-01T00:00:00.000Z".into(),
            data_json: "{}".into(),
        })
        .expect("the browser request should serialize");
        let mut web_stream = TcpStream::connect(web_address)
            .expect("the loopback web bridge should accept connections");
        web_stream
            .set_read_timeout(Some(Duration::from_secs(4)))
            .expect("web timeout");
        write!(web_stream, "POST /sync HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: https://oscard0823.github.io\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", web_body.len(), web_body).expect("the HTTP request should be written");
        let mut web_response = String::new();
        web_stream
            .read_to_string(&mut web_response)
            .expect("the HTTP response should be readable");
        assert!(web_response.starts_with("HTTP/1.1 200 OK"));
        assert!(web_response.contains("Access-Control-Allow-Private-Network: true"));
        assert!(web_response.contains("\"ok\":true"));
        let socket = local_socket_address(&address).expect("the loopback address should be valid");
        let mut delayed_stream = TcpStream::connect_timeout(&socket, Duration::from_secs(4))
            .expect("the delayed client should connect");
        delayed_stream
            .set_read_timeout(Some(Duration::from_secs(4)))
            .expect("the delayed client should configure its read timeout");
        delayed_stream
            .set_write_timeout(Some(Duration::from_secs(4)))
            .expect("the delayed client should configure its write timeout");
        std::thread::sleep(Duration::from_millis(180));
        write_json_line(
            &mut delayed_stream,
            &LocalSyncRequest {
                protocol: LOCAL_SYNC_PROTOCOL,
                pairing_code: code.clone(),
                action: LocalSyncAction::Status,
                known_revision: 0,
                updated_at: "1970-01-01T00:00:00.000Z".into(),
                data_json: "{}".into(),
            },
        )
        .expect("a client may send shortly after the server accepts the socket");
        let delayed_response: LocalSyncExchange = serde_json::from_str(
            &read_json_line(&mut delayed_stream)
                .expect("the server should wait for a delayed request instead of returning 10035"),
        )
        .expect("the delayed response should be valid JSON");
        assert!(delayed_response.ok, "{}", delayed_response.message);
        let older_exchange = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Auto,
            0,
            "{\"points\":0}".into(),
            "2026-09-13T09:59:00.000Z".into(),
        )
        .expect("the PC should return its newer payload to the phone");
        assert_eq!(older_exchange.data_json, "{\"points\":1}");
        let wrong_code = mobile_sync_exchange_blocking(
            address.clone(),
            "000000".into(),
            LocalSyncAction::Pull,
            0,
            "{\"points\":0}".into(),
            "2026-09-13T09:59:00.000Z".into(),
        )
        .expect_err("an incorrect pairing code must be rejected");
        assert!(wrong_code.contains("no coincide"));
        let pull = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Pull,
            0,
            "{\"points\":2}".into(),
            latest_date.clone(),
        )
        .expect("pull should return PC data without uploading the phone payload");
        assert_eq!(pull.data_json, "{\"points\":1}");
        assert_eq!(pull.catalog_json, catalog);

        let push = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Push,
            0,
            "{\"points\":2}".into(),
            "2026-09-13T09:00:00.000Z".into(),
        )
        .expect("push should explicitly replace PC data even with an older phone clock");
        assert_eq!(push.data_json, "{\"points\":2}");
        let snapshot = desktop::read().expect("the desktop should receive the pushed payload");
        assert_eq!(snapshot.data_json, push.data_json);
        assert!(snapshot.last_mobile_update_at > 0);
        let mobile_update_at = snapshot.last_mobile_update_at;

        let status = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Status,
            0,
            "{\"points\":999}".into(),
            latest_date,
        )
        .expect("status should check connectivity without transferring phone data");
        assert_eq!(status.data_json, "{}");
        let snapshot_after_status =
            desktop::read().expect("status should leave the desktop snapshot intact");
        assert_eq!(snapshot_after_status.data_json, "{\"points\":2}");
        assert_eq!(
            snapshot_after_status.last_mobile_update_at,
            mobile_update_at
        );

        let first_live = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Live,
            0,
            "{\"points\":999}".into(),
            "2026-09-13T10:03:00.000Z".into(),
        )
        .expect("a phone entering live mode must first receive the PC snapshot");
        assert_eq!(first_live.data_json, "{\"points\":2}");

        let phone_live = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Live,
            first_live.revision,
            "{\"points\":3}".into(),
            "2026-09-13T10:04:00.000Z".into(),
        )
        .expect("the phone should publish after acknowledging the PC revision");
        assert_eq!(phone_live.data_json, "{\"points\":3}");
        assert!(phone_live.revision > first_live.revision);

        desktop::update(
            "{\"points\":4}".into(),
            "2026-09-13T08:05:00.000Z".into(),
            catalog,
            true,
            phone_live.revision,
        )
        .expect("the desktop should publish its next local change without trusting its clock");
        let stale_phone = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Live,
            phone_live.revision,
            "{\"points\":5}".into(),
            "2026-09-13T10:06:00.000Z".into(),
        )
        .expect("a stale phone should receive the newer PC revision without overwriting it");
        assert_eq!(stale_phone.data_json, "{\"points\":4}");

        let empty_personal = "{\"actions\":[],\"activityHistory\":[],\"boxes\":[],\"pointRounds\":[],\"pointRoundBoundaries\":{},\"manualBaselinePoints\":[],\"shinyMods\":[]}";
        let phone_history = "{\"actions\":[],\"activityHistory\":[{\"id\":\"recovered-phone-record\"}],\"boxes\":[],\"pointRounds\":[],\"pointRoundBoundaries\":{},\"manualBaselinePoints\":[],\"shinyMods\":[]}";
        let cleared_revision = desktop::update(
            empty_personal.into(),
            "2026-09-13T10:07:00.000Z".into(),
            "{\"catalogVersion\":41}".into(),
            false,
            0,
        )
        .expect("an explicit local reset may clear the test snapshot");
        desktop::update(
            empty_personal.into(),
            "2026-09-13T10:07:01.000Z".into(),
            "{\"catalogVersion\":41}".into(),
            true,
            cleared_revision,
        )
        .expect("an empty PC may enter live mode before the phone connects");
        let recovered_from_phone = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Live,
            0,
            phone_history.into(),
            "2026-09-13T10:08:00.000Z".into(),
        )
        .expect("the first live handshake should recover a rich phone into an empty PC");
        assert_json_eq(&recovered_from_phone.data_json, phone_history);

        let protected_phone = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Live,
            0,
            empty_personal.into(),
            "2026-09-13T10:09:00.000Z".into(),
        )
        .expect("an empty phone must receive the PC history on its first live handshake");
        assert_json_eq(&protected_phone.data_json, phone_history);

        desktop::update(
            empty_personal.into(),
            "2026-09-13T10:10:00.000Z".into(),
            "{\"catalogVersion\":41}".into(),
            true,
            recovered_from_phone.revision,
        )
        .expect("a transient empty render must not erase the server snapshot");
        let snapshot_after_empty_desktop =
            desktop::read().expect("the server should retain its rich snapshot");
        assert_json_eq(&snapshot_after_empty_desktop.data_json, phone_history);
        assert!(snapshot_after_empty_desktop.last_mobile_update_at > 0);

        let protected_pc = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Live,
            snapshot_after_empty_desktop.revision,
            empty_personal.into(),
            "2026-09-13T10:11:00.000Z".into(),
        )
        .expect("an empty live payload must not erase the acknowledged PC history");
        assert_json_eq(&protected_pc.data_json, phone_history);

        let protected_manual_push = mobile_sync_exchange_blocking(
            address.clone(),
            code.clone(),
            LocalSyncAction::Push,
            0,
            empty_personal.into(),
            "2026-09-13T10:12:00.000Z".into(),
        )
        .expect("a manual push must also protect an existing nonempty history");
        assert_json_eq(&protected_manual_push.data_json, phone_history);

        desktop::update(
            "{\"points\":4}".into(),
            "2026-09-13T08:05:00.000Z".into(),
            "{\"catalogVersion\":42}".into(),
            false,
            0,
        )
        .expect("live mode should be configurable while the server remains available");
        let live_disabled = mobile_sync_exchange_blocking(
            address.clone(),
            code,
            LocalSyncAction::Live,
            stale_phone.revision,
            "{\"points\":4}".into(),
            "2026-09-13T08:05:00.000Z".into(),
        )
        .expect_err("both devices must opt in to live synchronization");
        assert!(live_disabled.contains("en vivo"));

        desktop::stop().expect("the test server should stop");
        let disabled = mobile_sync_exchange_blocking(
            address,
            "482731".into(),
            LocalSyncAction::Status,
            0,
            "{}".into(),
            "2026-09-13T10:02:00.000Z".into(),
        )
        .expect_err("a stopped server should respond instead of leaving the client waiting");
        assert!(disabled.contains("desactivada"));
    }

    #[test]
    fn rejects_public_internet_addresses() {
        let error = local_socket_address("8.8.8.8:47183").expect_err("public IPs must be rejected");
        assert!(error.contains("red local"));
        assert_eq!(
            local_socket_address("192.168.1.20")
                .expect("the default local port should be accepted")
                .port(),
            DEFAULT_LOCAL_SYNC_PORT
        );
        assert!(!is_local_ip("8.8.8.8".parse().expect("valid public IP")));
        assert!(is_local_ip("10.0.0.8".parse().expect("valid private IP")));
        assert!(is_local_ip(
            "172.20.10.2".parse().expect("valid private IP")
        ));
        assert!(is_local_ip(
            "192.168.1.20".parse().expect("valid private IP")
        ));
    }
}
