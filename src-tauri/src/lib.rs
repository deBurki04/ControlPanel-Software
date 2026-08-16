use base64::{engine::general_purpose, Engine as _};
use std::sync::{Mutex, OnceLock};
use windows_sys::Win32::Foundation::POINT;
use windows_sys::Win32::UI::WindowsAndMessaging::{GetCursorPos, SetCursorPos};

static LAST_CURSOR_POSITION: OnceLock<Mutex<Option<(i32, i32)>>> = OnceLock::new();

fn cursor_position_store() -> &'static Mutex<Option<(i32, i32)>> {
    LAST_CURSOR_POSITION.get_or_init(|| Mutex::new(None))
}

#[tauri::command]
fn remember_cursor_position() -> Result<(), String> {
    let mut point = POINT { x: 0, y: 0 };

    let success = unsafe { GetCursorPos(&mut point) };

    if success == 0 {
        return Err("Mausposition konnte nicht gelesen werden.".to_string());
    }

    let mut stored_position = cursor_position_store()
        .lock()
        .map_err(|_| "Mausposition-Speicher konnte nicht gesperrt werden.".to_string())?;

    *stored_position = Some((point.x, point.y));

    Ok(())
}

#[tauri::command]
fn restore_cursor_position() -> Result<(), String> {
    let stored_position = cursor_position_store()
        .lock()
        .map_err(|_| "Mausposition-Speicher konnte nicht gelesen werden.".to_string())?;

    let Some((x, y)) = *stored_position else {
        return Ok(());
    };

    let success = unsafe { SetCursorPos(x, y) };

    if success == 0 {
        return Err("Mausposition konnte nicht zurückgesetzt werden.".to_string());
    }

    Ok(())
}

#[tauri::command]
fn fetch_ha_image_base64(url: String, token: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .map_err(|error| format!("Home Assistant Bild konnte nicht geladen werden: {error}"))?;

    let status = response.status();

    if !status.is_success() {
        return Err(format!("Home Assistant Bild HTTP-Fehler: {status}"));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response
        .bytes()
        .map_err(|error| format!("Home Assistant Bild konnte nicht gelesen werden: {error}"))?;

    let encoded = general_purpose::STANDARD.encode(bytes);

    Ok(format!("data:{content_type};base64,{encoded}"))
}

#[tauri::command]
fn fetch_text_url(url: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header(reqwest::header::USER_AGENT, "GC8 Companion/0.11")
        .send()
        .map_err(|error| format!("URL konnte nicht geladen werden: {error}"))?;

    let status = response.status();

    if !status.is_success() {
        return Err(format!("HTTP-Fehler: {status}"));
    }

    response
        .text()
        .map_err(|error| format!("Antwort konnte nicht gelesen werden: {error}"))
}

#[tauri::command]
fn fetch_discord_text(url: String, token: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .header(reqwest::header::USER_AGENT, "GC8 Companion Discord/0.11")
        .header(reqwest::header::AUTHORIZATION, format!("Bot {token}"))
        .send()
        .map_err(|error| format!("Discord konnte nicht geladen werden: {error}"))?;

    let status = response.status();

    if !status.is_success() {
        return Err(format!("Discord HTTP-Fehler: {status}"));
    }

    response
        .text()
        .map_err(|error| format!("Discord Antwort konnte nicht gelesen werden: {error}"))
}

#[tauri::command]
fn call_home_assistant_service(
    url: String,
    token: String,
    domain: String,
    service: String,
    service_data_json: String,
) -> Result<(), String> {
    let client = reqwest::blocking::Client::new();
    let base_url = url.trim_end_matches('/');
    let endpoint = format!("{base_url}/api/services/{domain}/{service}");

    let response = client
        .post(endpoint)
        .bearer_auth(token)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(service_data_json)
        .send()
        .map_err(|error| format!("Home Assistant Service konnte nicht aufgerufen werden: {error}"))?;

    let status = response.status();

    if !status.is_success() {
        let body = response.text().unwrap_or_default();
        return Err(format!("Home Assistant Service HTTP-Fehler: {status} {body}"));
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            remember_cursor_position,
            restore_cursor_position,
            fetch_ha_image_base64,
            fetch_text_url,
            fetch_discord_text,
            call_home_assistant_service
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
