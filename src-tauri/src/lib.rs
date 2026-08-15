use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
fn fetch_ha_image_base64(url: String, token: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .map_err(|err| format!("image request failed: {err}"))?;

    if !response.status().is_success() {
        return Err(format!("image request returned HTTP {}", response.status()));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response
        .bytes()
        .map_err(|err| format!("image bytes failed: {err}"))?;

    let encoded = general_purpose::STANDARD.encode(bytes);
    Ok(format!("data:{content_type};base64,{encoded}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_ha_image_base64])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
