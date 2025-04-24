// Define the command within the library crate
#[tauri::command]
fn get_os() -> String {
    std::env::consts::OS.to_string()
}

// Import the OS plugin
use tauri_plugin_os;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // Now use the function directly as it's in the same scope
            get_os
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
