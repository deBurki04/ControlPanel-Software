use base64::{engine::general_purpose, Engine as _};

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
        .header(reqwest::header::USER_AGENT, "GC8 Companion/0.9")
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
        .header(reqwest::header::USER_AGENT, "GC8 Companion Discord/0.9")
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fetch_ha_image_base64,
            fetch_text_url,
            fetch_discord_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
